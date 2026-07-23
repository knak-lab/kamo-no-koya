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

// 商品名から 商品マスター_原価管理 の商品を探す(stampCostSnapshot・getSales_共通の突き合わせルール)
function resolveProductByName_(products, name) {
  for (let i = 0; i < products.length; i++) {
    if (products[i].name === name) return products[i];
  }
  return null;
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
      const product = resolveProductByName_(products, name);
      const cost = product && costs[product.id] ? costs[product.id].原価 : 0;
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
          id: Utilities.getUuid(),
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

// stampCostSnapshotを毎日18:10ごろに実行するインストーラブル・タイムトリガーを登録する。
// 既存の syncFromSquare (18:00実行) には一切触れない、独立したトリガー。
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "stampCostSnapshot") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("stampCostSnapshot").timeBased().atHour(18).nearMinute(10).everyDays(1).create();
  Logger.log("stampCostSnapshotの毎日18:10頃トリガーを設定しました");
}
