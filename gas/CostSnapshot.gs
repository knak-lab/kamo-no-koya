// =============================================================
//  原価計算(GAS版) ・ stampCostSnapshot ・ Squareカタログ フェーズ1同期
//  ・ トリガー設定
//
//  原価計算式は src/lib/calc.js の computeProductCosts と同一ロジック
//  (設計書5章)。React側はブラウザで即座に再計算するために独立して
//  同じ式を持ち、GAS側はスプレッドシートのトリガーで動くバッチ処理
//  (stampCostSnapshot)のためにここで同じ式を持つ。
// =============================================================

function computeProductCosts_(products, recipes, setBreakdowns, materialMap) {
  const costs = {};

  products
    .filter(function (p) {
      return p.kind !== "set";
    })
    .forEach(function (p) {
      const recipe = recipes[p.id] || { servings: 1, ingredients: [], packaging: [] };
      const servingsForCalc = Number(recipe.servings) > 0 ? Number(recipe.servings) : 1;

      const 製造原価計 = (recipe.ingredients || []).reduce(function (sum, ing) {
        const mat = materialMap[ing.materialId];
        return sum + (mat ? mat.unitPrice * (Number(ing.amount) || 0) : 0);
      }, 0);
      const 製造原価単価 = 製造原価計 / servingsForCalc;
      const 梱包材費計 = (recipe.packaging || []).reduce(function (sum, pk) {
        const mat = materialMap[pk.materialId];
        return sum + (mat ? mat.unitPrice * (Number(pk.amount) || 0) : 0);
      }, 0);

      const 原価 = 製造原価単価 + 梱包材費計;
      costs[p.id] = { 製造原価計: 製造原価計, 製造原価単価: 製造原価単価, 梱包材費計: 梱包材費計, 材料費: 製造原価単価, 梱包材費: 梱包材費計, 原価: 原価 };
    });

  products
    .filter(function (p) {
      return p.kind === "set";
    })
    .forEach(function (p) {
      const rows = (setBreakdowns && setBreakdowns[p.id]) || [];
      const 材料費 = rows.reduce(function (sum, row) {
        if (row.kind === "component") {
          const compCost = (costs[row.refId] && costs[row.refId].原価) || 0;
          return sum + compCost * (Number(row.qty) || 0);
        }
        const mat = materialMap[row.refId];
        return sum + (mat ? mat.unitPrice : 0);
      }, 0);

      const recipe = (recipes && recipes[p.id]) || { servings: 1, ingredients: [], packaging: [] };
      const 梱包材費 = (recipe.packaging || []).reduce(function (sum, pk) {
        const mat = materialMap[pk.materialId];
        return sum + (mat ? mat.unitPrice * (Number(pk.amount) || 0) : 0);
      }, 0);

      const 原価 = 材料費 + 梱包材費;
      costs[p.id] = { 製造原価計: 材料費, 製造原価単価: 材料費, 梱包材費計: 梱包材費, 材料費: 材料費, 梱包材費: 梱包材費, 原価: 原価 };
    });

  return costs;
}

// 売上_Squareの8列目(unitCostAtSale)が空の行だけを対象に原価をスナップショットする。
// 一度書き込んだ行は以後の原価改定の影響を受けない(設計書1章・6章)。
function stampCostSnapshot() {
  try {
    const sheet = getSalesSheetReadOnly_();
    if (!sheet) {
      Logger.log("売上_Squareシートが見つかりません");
      return;
    }

    // 8,9列目のヘッダーが無ければ追加する(既存syncOrdersは7列固定で書き込むため影響なし)
    const headerRange = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 9));
    const headers = headerRange.getValues()[0];
    if (headers[7] !== SALES_COST_COLS[0]) sheet.getRange(1, 8).setValue(SALES_COST_COLS[0]);
    if (headers[8] !== SALES_COST_COLS[1]) sheet.getRange(1, 9).setValue(SALES_COST_COLS[1]);

    const products = getProducts_();
    const materials = getMaterials_();
    const recipes = getRecipes_();
    const setBreakdowns = getSetBreakdowns_();
    const materialMap = {};
    materials.forEach(function (m) {
      materialMap[m.id] = m;
    });
    const costs = computeProductCosts_(products, recipes, setBreakdowns, materialMap);

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

    let updated = 0;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const id = row[0];
      if (!id) continue;
      const alreadyStamped = row[7] !== "" && row[7] !== null && row[7] !== undefined;
      if (alreadyStamped) continue;

      const name = String(row[2] || "");
      const qty = Number(row[3]) || 0;
      // 商品マスター_原価管理は id = name のため、名前をそのままキーに引ける
      const cost = costs[name] ? costs[name].原価 : 0;
      const costSubtotal = cost * qty;

      sheet.getRange(2 + i, 8, 1, 2).setValues([[cost, costSubtotal]]);
      updated++;
    }

    appendSyncLog_("costSnapshot", "success", updated + "件更新");
  } catch (ex) {
    appendSyncLog_("costSnapshot", "error", String(ex));
    throw ex;
  }
}

// 売上_Squareの原価スナップショット(unitCostAtSale)が0円の行だけを対象に、
// 現在のレシピ・内訳マスタで原価が算出できるようになっていれば再スタンプする。
// stampCostSnapshotは「未確定(空欄)」の行しか埋めないため、レシピ登録前に
// 0円で確定してしまった行はそのままでは永久に直らない。この関数はその
// 取りこぼしだけをピンポイントで再計算する(0円以外の確定済み行には触れない)。
function recalcZeroCostSales() {
  try {
    const sheet = getSalesSheetReadOnly_();
    if (!sheet) {
      Logger.log("売上_Squareシートが見つかりません");
      return { updated: 0 };
    }

    const products = getProducts_();
    const materials = getMaterials_();
    const recipes = getRecipes_();
    const setBreakdowns = getSetBreakdowns_();
    const materialMap = {};
    materials.forEach(function (m) {
      materialMap[m.id] = m;
    });
    const costs = computeProductCosts_(products, recipes, setBreakdowns, materialMap);

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { updated: 0 };
    const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

    let updated = 0;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const id = row[0];
      if (!id) continue;

      const stampedCost = Number(row[7]) || 0;
      if (stampedCost !== 0) continue; // 0円以外(未確定含む)は対象外。未確定行はstampCostSnapshotに任せる
      if (row[7] === "" || row[7] === null) continue; // 未確定(空欄)はここでは対象外

      const name = String(row[2] || "");
      const qty = Number(row[3]) || 0;
      const newCost = costs[name] ? costs[name].原価 : 0;
      if (newCost === 0) continue; // 現在も原価0円ならスキップ(実質変化なし)

      const newCostSubtotal = newCost * qty;
      sheet.getRange(2 + i, 8, 1, 2).setValues([[newCost, newCostSubtotal]]);
      updated++;
    }

    appendSyncLog_("recalcZeroCost", "success", updated + "件更新");
    return { updated: updated, squareSyncLog: getSquareSyncLog_(20) };
  } catch (ex) {
    appendSyncLog_("recalcZeroCost", "error", String(ex));
    throw ex;
  }
}

// 「売上データ取込」ボタンから呼ばれる。既存のSquare注文取り込み(syncFromSquare)を
// その場で実行し、続けて新しく入った売上行に原価もすぐスタンプする(stampCostSnapshot)。
// 夜間トリガーを待たずに、取り込んだ売上をすぐ原価付きで見られるようにするため。
function syncSalesFromSquare() {
  try {
    syncFromSquare();
    stampCostSnapshot();
    appendSyncLog_("syncSalesFromSquare", "success", "手動取込を実行しました");
    return { squareSyncLog: getSquareSyncLog_(20) };
  } catch (ex) {
    appendSyncLog_("syncSalesFromSquare", "error", String(ex));
    throw ex;
  }
}

// フェーズ1: 既存「商品マスター」(Square由来)の商品名・価格を
// 「商品マスター_原価管理」へ一方向で反映する。名前が一致すれば価格のみ更新、
// 一致しなければ新規追加(kind='single' で作成し、レシピは空のまま)。
function syncCatalogFromSquare() {
  try {
    const catalogRows = getCatalogReadOnly_();
    const products = getProducts_();
    const nameToProduct = {};
    products.forEach(function (p) {
      nameToProduct[p.name] = p;
    });

    let updated = 0;
    let inserted = 0;
    catalogRows.forEach(function (row) {
      const existing = nameToProduct[row.name];
      if (existing) {
        existing.price = row.price;
        existing.squareCatalogId = row.squareCatalogId;
        updated++;
      } else {
        const p = {
          id: row.name, // 商品マスター_原価管理は id = name(レシピ・セット内訳・売上と同じキーで揃える)
          name: row.name,
          price: row.price,
          kind: "single",
          squareCatalogId: row.squareCatalogId,
          squareCatalogVersion: "",
        };
        products.push(p);
        nameToProduct[row.name] = p;
        inserted++;
      }
    });

    saveProducts_(products);
    appendSyncLog_("catalogSync", "success", "更新" + updated + "件・新規" + inserted + "件");
    return { products: products, squareSyncLog: getSquareSyncLog_(20) };
  } catch (ex) {
    appendSyncLog_("catalogSync", "error", String(ex));
    throw ex;
  }
}

// ─────────────────────────────────────────
//  初回セットアップ(Apps Scriptエディタから手動で一度だけ実行する)
// ─────────────────────────────────────────

function setup() {
  getAll_(); // 新規シート一式を作成
  installTriggers();
  Logger.log("セットアップ完了: シート作成とトリガー登録が完了しました");
}

// syncFromSquare(Square取り込み)を毎日22:00ごろ、続けてstampCostSnapshot(原価スタンプ)を
// 22:10ごろに実行するインストーラブル・タイムトリガーを登録する。取り込み直後に原価が
// 付くよう、常にsyncFromSquareの少し後にstampCostSnapshotが動く関係を保つ。
// 実行後は既存の同名トリガーを一度削除してから登録し直すため、複数回実行しても重複しない。
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "stampCostSnapshot" || t.getHandlerFunction() === "syncFromSquare") {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger("syncFromSquare").timeBased().atHour(22).nearMinute(0).everyDays(1).create();
  ScriptApp.newTrigger("stampCostSnapshot").timeBased().atHour(22).nearMinute(10).everyDays(1).create();
  Logger.log("syncFromSquareの毎日22:00頃・stampCostSnapshotの毎日22:10頃トリガーを設定しました");
}
