// =============================================================
//  カモの小屋 収益分析アプリ — シートアクセス層
//
//  このスプレッドシートには、既存のSquare同期(売上_Square/商品マスター)に加えて、
//  旧AppSheet運用時代からの実データシート(原材料・資材マスタ/レシピ/セット内訳マスタ/
//  リベート/販売形態/経費/日次集計/TODO/サブタスク)が既に存在する。
//  これらは「列名」で対応づけて読み書きし(位置依存にしない)、想定外の列は
//  クリアせず素通し保存することでデータを壊さない。
//
//  識別子の方針: 商品・材料は元データに固有IDが無く名前で参照されているため、
//  id === name として扱う(商品マスター_原価管理・原材料・資材マスタ)。
//  経費・TODO・サブタスク・リベートは元データに固有ID列があるためそれを使う。
// =============================================================

const KAMO_SPREADSHEET_ID = "1qMzUrUaCCI4lTMwQMKVyOeW2F5yDyQEJgqU-B1jAOEY";

// ---- 既存シート(Square同期・読み取り専用) ----
const SALES_SHEET_NAME = "売上_Square";
const SALES_COST_COLS = ["unitCostAtSale", "costSubtotal"]; // 8,9列目に追加(stampCostSnapshotのみが書く)
const CATALOG_SHEET_NAME = "商品マスター";

// ---- 旧AppSheet運用時代からの実データシート(列名ベースで対応づけ) ----
const SHEET_MATERIALS = "原材料・資材マスタ";
const MATERIALS_FIELD_BY_HEADER = { "区分": "category", "材料名": "name", "仕入単価(g単位)": "unitPrice", "更新日": "updatedAt", "単位": "unit" };

const SHEET_SET_BREAKDOWN = "セット内訳マスタ";
const SET_BREAKDOWN_FIELD_BY_HEADER = { "内訳ID": "id", "セット商品名": "productId", "区分": "kindLabel", "構成商品名": "refId", "数量": "qty", "備考": "memo" };

const SHEET_REBATE_CLIENTS = "リベート";
const REBATE_FIELD_BY_HEADER = { "ID": "id", "販売先": "name", "リベート率": "rateRaw", "メモ": "memo" };

const SHEET_SALES_CHANNELS = "販売形態";

const SHEET_EXPENSES = "経費";
const EXPENSES_FIELD_BY_HEADER = { "ID": "id", "日付": "date", "項目": "item", "利用時間": "hours", "金額": "amount", "メモ": "memo", "対象日付": "targetDate" };

const SHEET_DAILY_META = "日次集計";
const DAILY_META_FIELD_BY_HEADER = { "日付": "date", "年月": "yearMonth", "販売先": "clientName", "販売形態": "channelName" };

const SHEET_TODOS = "TODO";
const TODOS_FIELD_BY_HEADER = { "タスクID": "id", "カテゴリ": "category", "タスク": "task", "期限": "deadline", "ステータス": "status", "snoozed": "snoozed" };

const SHEET_SUBTASKS = "サブタスク";
const SUBTASKS_FIELD_BY_HEADER = { "サブタスクID": "id", "親タスクID": "parentTaskId", "分類": "legacyCategory", "サブタスク名": "name", "担当": "assignee", "期限": "deadline", "ステータス": "status", "snoozed": "snoozed", "statusUpdatedAt": "statusUpdatedAt" };

// ---- このアプリ専用の新規シート(実データとの衝突なし) ----
const SHEET_PRODUCTS = "商品マスター_原価管理";
const PRODUCTS_HDR = ["id", "name", "price", "kind", "squareCatalogId", "squareCatalogVersion", "procedure", "baseItemId"];

const SHEET_RECIPES = "レシピ"; // 実データ採用(20材料+5梱包材の横持ち形式)
const RECIPE_MAX_INGREDIENTS = 20;
const RECIPE_MAX_PACKAGING = 5;

const SHEET_EXPENSE_RATES = "経費マスタ_時間単価";
const EXPENSE_RATES_HDR = ["item", "hourlyRate"];
const EXPENSE_RATES_SEED = [
  ["店舗利用料(製造・販売)", 1500],
  ["店舗利用料(製造)", 1200],
  ["人件費", 1100],
];

const SHEET_MGMT_BUDGETS = "月次目標";
const MGMT_BUDGETS_HDR = ["yearMonth", "salesBudget", "costRatio", "profitBudget"];

const SHEET_FIN_BUDGETS = "月次PL予算";
const FIN_BUDGETS_HDR = ["yearMonth", "rawMaterialBudget", "otherExpenseBudget", "profitBudget"];

const SHEET_SETTINGS = "設定";
const SETTINGS_HDR = ["squareSyncFromSquare"];
const SETTINGS_SEED = [[true]];

// todoタブの「タスク追加」ボタン下に表示するビジュアル画像(PNG/JPEG)。
// Googleスプレッドシートは1セル50,000文字までのため、base64文字列を
// CHUNK_SIZE単位で複数行に分割して保存し、読み出し時に連結する
// (1行目はMIMEタイプ、2行目以降がbase64チャンク。詳細はgetTodoVisual_/saveTodoVisual_参照)。
const SHEET_TODO_VISUAL = "TODOビジュアル";
const TODO_VISUAL_HDR = ["chunk"];
const TODO_VISUAL_CHUNK_SIZE = 40000;
const TODO_VISUAL_MAX_BASE64_CHARS = 200000; // 約150KBのPNGまで(getAll応答が重くなりすぎないための上限)

// アプリアイコン(トップ左上・読み込み画面用)。同じチャンク分割方式だが、
// この用途はfaviconやPWAアイコンとの見た目の一貫性を保つためPNG限定とする。
const SHEET_APP_ICON = "アプリアイコン";
const APP_ICON_HDR = ["chunk"];
const APP_ICON_CHUNK_SIZE = 40000;
const APP_ICON_MAX_BASE64_CHARS = 200000;

// カレンダータブの出店計画・イベント予定(日次設定の販売形態・TODOの期限とは別に、
// タイトル/メモを日付ごとに複数登録できる)
const SHEET_CALENDAR_EVENTS = "予定";
const CALENDAR_EVENTS_HDR = ["id", "date", "title", "memo"];

const SHEET_SYNC_LOG = "Square同期ログ";
const SYNC_LOG_HDR = ["timestamp", "type", "status", "message"];

// 売上_Squareの商品名(rawName)が商品マスター_原価管理のどの商品名(productId)の
// 売上として扱われるべきかのマッピング(ヌケモレチェックの「マージ」機能用)
const SHEET_PRODUCT_ALIASES = "商品名エイリアス";
const PRODUCT_ALIASES_HDR = ["rawName", "productId"];

// ヌケモレチェック「商品マスタで包材費が0円」で、意図的に包材無しの商品を
// 個別に除外(不要)扱いにするためのID一覧
const SHEET_PACKAGING_EXEMPTIONS = "包材費0円チェック除外";
const PACKAGING_EXEMPTIONS_HDR = ["productId"];

// 売上_Squareの個別の明細行(saleId単位)を、商品名エイリアス(rawName一括)より
// 細かく「この1行だけ」商品・数量を上書きするためのマッピング
// (同じ不明な商品名でも日によって実際の商品が違うケースに対応)
const SHEET_SALE_OVERRIDES = "売上個別修正";
const SALE_OVERRIDES_HDR = ["saleId", "productId", "qty"];

// ─────────────────────────────────────────
//  汎用ヘルパー
// ─────────────────────────────────────────

// SpreadsheetApp.openById()は呼び出しコストが大きく、getAll_は17シート分を
// 個別のget*_関数で読むため素朴に実装すると実行ごとに10回以上呼ばれてしまう。
// 1回の実行(doGet/doPost)内で使い回すようキャッシュする。
var ssCache_ = null;
function getSs_() {
  if (!ssCache_) ssCache_ = SpreadsheetApp.openById(KAMO_SPREADSHEET_ID);
  return ssCache_;
}

function getOrCreateSheet_(name, headers, seedRows, textCols) {
  const ss = getSs_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setFontWeight("bold").setBackground("#fef3c7").setFontColor("#78350f");
    if (seedRows && seedRows.length) {
      sheet.getRange(2, 1, seedRows.length, headers.length).setValues(seedRows);
    }
  }
  if (textCols && textCols.length) {
    const rows = Math.max(sheet.getMaxRows() - 1, 1);
    textCols.forEach(function (col) {
      sheet.getRange(2, col, rows, 1).setNumberFormat("@");
    });
  }
  return sheet;
}

// PRODUCTS_HDR等、位置ベースで列を扱うこのアプリ専用シートに新しい列を追加した際、
// 既存シートのヘッダー行(1行目)に列名が無ければ末尾に埋める(データは一切触らない)。
// getOrCreateSheet_はシート新規作成時にしかヘッダーを書かないため、既存シートに
// 後から列を増やす場合はこちらを呼ぶ。
function backfillHeaderRow_(sheet, headers) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < headers.length) {
    sheet.getRange(1, lastCol + 1, 1, headers.length - lastCol).setValues([headers.slice(lastCol)]);
  }
}

// 名前だけでシートを取得する(存在しなければnull。新規作成はしない = 実データシート専用)
function getExistingSheet_(name) {
  return getSs_().getSheetByName(name) || null;
}

function getDataRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
}

function clearDataRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
}

function writeRows_(sheet, rows, numCols, textCols) {
  if (!rows || rows.length === 0) return;
  if (textCols && textCols.length) {
    textCols.forEach(function (col) {
      sheet.getRange(2, col, rows.length, 1).setNumberFormat("@");
    });
  }
  sheet.getRange(2, 1, rows.length, numCols).setValues(rows);
}

function rowsToObjects_(headers, rows) {
  return rows
    .filter(function (r) {
      return r[0] !== "" && r[0] !== null;
    })
    .map(function (r) {
      const obj = {};
      headers.forEach(function (h, i) {
        obj[h] = r[i];
      });
      return obj;
    });
}

function objectsToRows_(headers, objects) {
  return (objects || []).map(function (o) {
    return headers.map(function (h) {
      return o[h] !== undefined && o[h] !== null ? o[h] : "";
    });
  });
}

function cellToStr_(val) {
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }
  const s = String(val === null || val === undefined ? "" : val);
  // 旧AppSheet時代のデータ等、スラッシュ区切り("YYYY/M/D")のテキスト日付が
  // Date型に変換されずそのまま残っている場合があるため、ハイフン区切りに正規化する
  const slashDate = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashDate) return slashDate[1] + "-" + slashDate[2].padStart(2, "0") + "-" + slashDate[3].padStart(2, "0");
  return s;
}

function yearMonthOfGas_(dateStr) {
  const parts = String(dateStr || "").split("-");
  if (parts.length < 2) return "";
  return parts[0] + "/" + parts[1];
}

// 実データシート用: 列名ベースの汎用読み取り(位置に依存しない)
function readByHeaderName_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return rows
    .filter(function (r) {
      return r.some(function (v) {
        return v !== "" && v !== null && v !== undefined;
      });
    })
    .map(function (r) {
      const obj = {};
      headers.forEach(function (h, i) {
        if (h) obj[h] = r[i];
      });
      return obj;
    });
}

// 実データシートに無い列を末尾に追加する(既存列・既存データは一切変更しない)
function ensureColumn_(sheet, headerName) {
  const lastCol = sheet.getLastColumn();
  const headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  const idx = headers.indexOf(headerName);
  if (idx >= 0) return idx + 1;
  const col = lastCol + 1;
  sheet.getRange(1, col).setValue(headerName);
  return col;
}

// 実データシート用: 列名ベースの部分書き込み。
// fieldByHeaderに含まれる列(=アプリが認識している列)だけを対象に、keyHeaderの値で
// 既存行とマッチングして更新する。fieldByHeaderに無い列(AppSheetの数式列や未対応列)は
// 読み取りも書き込みもせず、セル範囲そのものに一切触れない(clearContentもしない)。
//   - 既存行(keyHeaderの値が一致): 対応する列のセルだけを上書き
//   - 新規のキー: 末尾に行を追記し、対応する列だけを埋める(それ以外の列は空欄のまま)
//   - 既存のキーが今回のobjectsに含まれない(削除): その行の対応列だけを空欄化する。
//     行自体の削除・詰め直しはしない(他列の既存データを残すため)。削除が積み重なると
//     対応列だけが空欄の行がシート上に残ることになる点に注意。
function writeByHeaderOrder_(sheet, objects, fieldByHeader, keyHeader) {
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  const headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

  const managedCols = [];
  Object.keys(fieldByHeader).forEach(function (h) {
    const idx = headers.indexOf(h);
    if (idx >= 0) managedCols.push({ field: fieldByHeader[h], col: idx + 1 });
  });

  const keyIdx = headers.indexOf(keyHeader);
  if (keyIdx < 0) throw new Error("writeByHeaderOrder_: キー列が見つからない(" + keyHeader + " in " + sheet.getName() + ")");
  const keyField = fieldByHeader[keyHeader];
  const keyCol = keyIdx + 1;

  const objByKey = {};
  (objects || []).forEach(function (o) {
    const k = o[keyField] === undefined || o[keyField] === null ? "" : String(o[keyField]);
    if (k) objByKey[k] = o;
  });

  // 既存行: 値・数式をそれぞれ1回のAPI呼び出しでまとめて読み込み、管理対象列だけメモリ上で
  // 書き換えてから1回で書き戻す(以前は管理列ごとに個別setValuesしており、列数が多いシート
  // ほど呼び出し回数が増えて保存が遅くなっていたため)。数式セルは数式文字列のまま書き戻すので
  // 未管理列(旧AppSheetの数式列等)はこれまで通り無傷。
  let existingKeys = [];
  if (lastRow >= 2) {
    const range = sheet.getRange(2, 1, lastRow - 1, lastCol);
    const values = range.getValues();
    const formulas = range.getFormulas();
    existingKeys = values.map(function (row) { return String(row[keyCol - 1]); });

    for (let r = 0; r < values.length; r++) {
      const obj = objByKey[existingKeys[r]];
      managedCols.forEach(function (c) {
        const v = obj ? obj[c.field] : "";
        values[r][c.col - 1] = v === undefined || v === null ? "" : v;
        formulas[r][c.col - 1] = "";
      });
    }
    const merged = values.map(function (row, r) {
      return row.map(function (v, c) { return formulas[r][c] || v; });
    });
    range.setValues(merged);
  }

  // 新規行: 末尾に追記(対応列だけを埋める。それ以外の列は空欄のまま)
  const newKeys = Object.keys(objByKey).filter(function (k) { return existingKeys.indexOf(k) < 0; });
  if (newKeys.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    const newRows = newKeys.map(function (k) {
      const obj = objByKey[k];
      const row = new Array(lastCol).fill("");
      managedCols.forEach(function (c) {
        const v = obj[c.field];
        row[c.col - 1] = v === undefined || v === null ? "" : v;
      });
      return row;
    });
    sheet.getRange(startRow, 1, newRows.length, lastCol).setValues(newRows);
  }
}

// ─────────────────────────────────────────
//  商品マスター_原価管理(新規シート。id = name)
// ─────────────────────────────────────────

function getProducts_() {
  const sheet = getOrCreateSheet_(SHEET_PRODUCTS, PRODUCTS_HDR);
  backfillHeaderRow_(sheet, PRODUCTS_HDR);
  return rowsToObjects_(PRODUCTS_HDR, getDataRows_(sheet)).map(function (p) {
    return {
      id: String(p.id),
      name: p.name || "",
      price: Number(p.price) || 0,
      kind: p.kind || "single",
      squareCatalogId: p.squareCatalogId || "",
      squareCatalogVersion: p.squareCatalogVersion || "",
      procedure: p.procedure || "",
      baseItemId: p.baseItemId || "",
    };
  });
}

function saveProducts_(products) {
  const sheet = getOrCreateSheet_(SHEET_PRODUCTS, PRODUCTS_HDR);
  backfillHeaderRow_(sheet, PRODUCTS_HDR);
  clearDataRows_(sheet);
  writeRows_(sheet, objectsToRows_(PRODUCTS_HDR, products), PRODUCTS_HDR.length);
}

// ─────────────────────────────────────────
//  予定(新規シート。カレンダータブの出店計画・イベント)
// ─────────────────────────────────────────

function getCalendarEvents_() {
  const sheet = getOrCreateSheet_(SHEET_CALENDAR_EVENTS, CALENDAR_EVENTS_HDR, null, [2]);
  return rowsToObjects_(CALENDAR_EVENTS_HDR, getDataRows_(sheet)).map(function (e) {
    return { id: String(e.id), date: cellToStr_(e.date), title: e.title || "", memo: e.memo || "" };
  });
}

function saveCalendarEvents_(events) {
  const headers = CALENDAR_EVENTS_HDR;
  const sheet = getOrCreateSheet_(SHEET_CALENDAR_EVENTS, headers, null, [2]);
  clearDataRows_(sheet);
  writeRows_(sheet, objectsToRows_(headers, events || []), headers.length, [2]);
}

// ─────────────────────────────────────────
//  商品名エイリアス(新規シート。rawName = name)
// ─────────────────────────────────────────

function getProductAliases_() {
  const sheet = getOrCreateSheet_(SHEET_PRODUCT_ALIASES, PRODUCT_ALIASES_HDR);
  const map = {};
  getDataRows_(sheet).forEach(function (r) {
    if (r[0]) map[String(r[0])] = String(r[1] || "");
  });
  return map;
}

function saveProductAliases_(aliases) {
  const headers = PRODUCT_ALIASES_HDR;
  const sheet = getOrCreateSheet_(SHEET_PRODUCT_ALIASES, headers);
  clearDataRows_(sheet);
  const rows = Object.keys(aliases || {}).map(function (rawName) {
    return [rawName, aliases[rawName]];
  });
  writeRows_(sheet, rows, headers.length);
}

// ─────────────────────────────────────────
//  包材費0円チェック除外(新規シート。productIdの単一列)
// ─────────────────────────────────────────

function getPackagingExemptions_() {
  const sheet = getOrCreateSheet_(SHEET_PACKAGING_EXEMPTIONS, PACKAGING_EXEMPTIONS_HDR);
  return getDataRows_(sheet)
    .map(function (r) {
      return String(r[0] || "");
    })
    .filter(Boolean);
}

function savePackagingExemptions_(ids) {
  const headers = PACKAGING_EXEMPTIONS_HDR;
  const sheet = getOrCreateSheet_(SHEET_PACKAGING_EXEMPTIONS, headers);
  clearDataRows_(sheet);
  const rows = (ids || []).map(function (id) {
    return [id];
  });
  writeRows_(sheet, rows, headers.length);
}

// ─────────────────────────────────────────
//  売上個別修正(新規シート。saleId単位で商品・数量を上書き)
// ─────────────────────────────────────────

function getSaleOverrides_() {
  const sheet = getOrCreateSheet_(SHEET_SALE_OVERRIDES, SALE_OVERRIDES_HDR);
  const map = {};
  getDataRows_(sheet).forEach(function (r) {
    if (r[0]) map[String(r[0])] = { productId: String(r[1] || ""), qty: Number(r[2]) || 0 };
  });
  return map;
}

function saveSaleOverrides_(overrides) {
  const headers = SALE_OVERRIDES_HDR;
  const sheet = getOrCreateSheet_(SHEET_SALE_OVERRIDES, headers);
  clearDataRows_(sheet);
  const rows = Object.keys(overrides || {}).map(function (saleId) {
    const o = overrides[saleId] || {};
    return [saleId, o.productId || "", Number(o.qty) || 0];
  });
  writeRows_(sheet, rows, headers.length);
}

// ─────────────────────────────────────────
//  レシピ(実データ採用。商品名をキーに、材料・資材1〜20 / 梱包材1〜5 の横持ち)
// ─────────────────────────────────────────

function recipeHeaders_() {
  const headers = ["商品名", "カテゴリ", "分割数"];
  for (let i = 1; i <= RECIPE_MAX_INGREDIENTS; i++) {
    headers.push("材料・資材" + i + "_材料名", "材料・資材" + i + "_分量");
  }
  for (let i = 1; i <= RECIPE_MAX_PACKAGING; i++) {
    headers.push("梱包材" + i + "_材料名", "梱包材" + i + "_分量");
  }
  return headers;
}

function getRecipes_() {
  const sheet = getOrCreateSheet_(SHEET_RECIPES, recipeHeaders_());
  const objs = readByHeaderName_(sheet);
  const recipes = {};
  objs.forEach(function (o) {
    const productId = o["商品名"];
    if (!productId) return;
    const ingredients = [];
    for (let i = 1; i <= RECIPE_MAX_INGREDIENTS; i++) {
      const name = o["材料・資材" + i + "_材料名"];
      if (!name) continue;
      const amount = o["材料・資材" + i + "_分量"];
      ingredients.push({ id: "ing" + i, materialId: String(name), amount: amount === "" || amount === undefined ? 0 : Number(amount) });
    }
    const packaging = [];
    for (let i = 1; i <= RECIPE_MAX_PACKAGING; i++) {
      const name = o["梱包材" + i + "_材料名"];
      if (!name) continue;
      const amount = o["梱包材" + i + "_分量"];
      packaging.push({ id: "pack" + i, materialId: String(name), amount: amount === "" || amount === undefined ? 0 : Number(amount) });
    }
    recipes[String(productId)] = {
      servings: o["分割数"] === "" || o["分割数"] === undefined ? "" : Number(o["分割数"]),
      ingredients: ingredients,
      packaging: packaging,
      legacyCategory: o["カテゴリ"] || "",
    };
  });
  return recipes;
}

function saveRecipes_(recipes) {
  const headers = recipeHeaders_();
  const sheet = getOrCreateSheet_(SHEET_RECIPES, headers);
  clearDataRows_(sheet);
  const rows = Object.keys(recipes || {}).map(function (productId) {
    const r = recipes[productId] || {};
    const row = [productId, r.legacyCategory || "", r.servings === "" || r.servings === undefined || r.servings === null ? "" : r.servings];
    const ingredients = (r.ingredients || []).slice(0, RECIPE_MAX_INGREDIENTS);
    for (let i = 0; i < RECIPE_MAX_INGREDIENTS; i++) {
      const ing = ingredients[i];
      row.push(ing ? ing.materialId : "", ing ? ing.amount : "");
    }
    const packaging = (r.packaging || []).slice(0, RECIPE_MAX_PACKAGING);
    for (let i = 0; i < RECIPE_MAX_PACKAGING; i++) {
      const pk = packaging[i];
      row.push(pk ? pk.materialId : "", pk ? pk.amount : "");
    }
    return row;
  });
  writeRows_(sheet, rows, headers.length);
}

// ─────────────────────────────────────────
//  原材料・資材マスタ(実データ採用。id = 材料名。単位列は新設)
// ─────────────────────────────────────────

function getMaterials_() {
  const sheet = getExistingSheet_(SHEET_MATERIALS);
  if (!sheet) return [];
  ensureColumn_(sheet, "単位");
  const objs = readByHeaderName_(sheet);
  return objs
    .filter(function (o) {
      return o["材料名"];
    })
    .map(function (o) {
      const category = o["区分"] || "";
      const unit = o["単位"] || (category === "梱包・資材" ? "個" : "g");
      return { id: String(o["材料名"]), name: String(o["材料名"]), category: category, unitPrice: Number(o["仕入単価(g単位)"]) || 0, unit: unit };
    });
}

function saveMaterials_(materials) {
  const sheet = getExistingSheet_(SHEET_MATERIALS);
  if (!sheet) return; // 実データシートが無ければ何もしない(誤って新規作成しない)
  ensureColumn_(sheet, "単位");
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const objects = (materials || []).map(function (m) {
    return { category: m.category, name: m.name, unitPrice: m.unitPrice, updatedAt: today, unit: m.unit };
  });
  writeByHeaderOrder_(sheet, objects, MATERIALS_FIELD_BY_HEADER, "材料名");
}

// ─────────────────────────────────────────
//  セット内訳マスタ(実データ採用。区分「構成商品」/「梱包・資材」)
// ─────────────────────────────────────────

function getSetBreakdowns_() {
  const sheet = getExistingSheet_(SHEET_SET_BREAKDOWN);
  if (!sheet) return {};
  const objs = readByHeaderName_(sheet);
  const map = {};
  objs.forEach(function (o) {
    const id = o["内訳ID"];
    const productId = o["セット商品名"];
    if (!id || !productId) return;
    if (!map[productId]) map[productId] = [];
    map[productId].push({
      id: String(id),
      kind: o["区分"] === "構成商品" ? "component" : "material",
      refId: String(o["構成商品名"] || ""),
      qty: o["数量"] === "" || o["数量"] === undefined ? "" : Number(o["数量"]),
      memo: o["備考"] || "",
    });
  });
  return map;
}

function saveSetBreakdowns_(setBreakdowns) {
  const sheet = getExistingSheet_(SHEET_SET_BREAKDOWN);
  if (!sheet) return;
  const objects = [];
  Object.keys(setBreakdowns || {}).forEach(function (productId) {
    (setBreakdowns[productId] || []).forEach(function (row) {
      objects.push({
        id: row.id,
        productId: productId,
        kindLabel: row.kind === "component" ? "構成商品" : "梱包・資材",
        refId: row.refId,
        qty: row.qty,
        memo: row.memo || "",
      });
    });
  });
  writeByHeaderOrder_(sheet, objects, SET_BREAKDOWN_FIELD_BY_HEADER, "内訳ID");
}

// ─────────────────────────────────────────
//  リベート(販売先・委託先マスタ。実データ採用)
//  リベート率は「15」のような百分率の数値として保存されている前提(15 => 0.15)。
//  1以下の値はすでに小数(0.15)とみなしてそのまま扱う簡易ヒューリスティック。
// ─────────────────────────────────────────

function getRebateClients_() {
  const sheet = getExistingSheet_(SHEET_REBATE_CLIENTS);
  if (!sheet) return [];
  const objs = readByHeaderName_(sheet);
  return objs
    .filter(function (o) {
      return o["ID"];
    })
    .map(function (o) {
      const raw = Number(o["リベート率"]) || 0;
      return { id: String(o["ID"]), name: o["販売先"] || "", rate: raw > 1 ? raw / 100 : raw, memo: o["メモ"] || "" };
    });
}

function saveRebateClients_(rebateClients) {
  const sheet = getExistingSheet_(SHEET_REBATE_CLIENTS);
  if (!sheet) return;
  const objects = (rebateClients || []).map(function (c) {
    return { id: c.id, name: c.name, rateRaw: Math.round((Number(c.rate) || 0) * 1000) / 10, memo: c.memo || "" };
  });
  writeByHeaderOrder_(sheet, objects, REBATE_FIELD_BY_HEADER, "ID");
}

// ─────────────────────────────────────────
//  販売形態(実データ採用・読み取り専用。id = name。リベート適用可否のフラグは無く、
//  「委託先が選択されているか」で判定するため、ここでは名前の一覧のみ返す)
// ─────────────────────────────────────────

function getSalesChannels_() {
  const sheet = getExistingSheet_(SHEET_SALES_CHANNELS);
  if (!sheet) return [];
  const objs = readByHeaderName_(sheet);
  const seen = {};
  const channels = [];
  objs.forEach(function (o) {
    const name = o["販売形態"];
    if (!name || seen[name]) return;
    seen[name] = true;
    channels.push({ id: String(name), name: String(name) });
  });
  return channels;
}

// ─────────────────────────────────────────
//  経費マスタ(時間単価)— このアプリ専用シート(全員共通の単一時給)
// ─────────────────────────────────────────

function getExpenseRates_() {
  const sheet = getOrCreateSheet_(SHEET_EXPENSE_RATES, EXPENSE_RATES_HDR, EXPENSE_RATES_SEED);
  const rates = {};
  getDataRows_(sheet).forEach(function (r) {
    if (!r[0]) return;
    rates[String(r[0])] = Number(r[1]) || 0;
  });
  return rates;
}

function saveExpenseRates_(expenseRates) {
  const sheet = getOrCreateSheet_(SHEET_EXPENSE_RATES, EXPENSE_RATES_HDR, EXPENSE_RATES_SEED);
  clearDataRows_(sheet);
  const rows = Object.keys(expenseRates || {}).map(function (item) {
    return [item, Number(expenseRates[item]) || 0];
  });
  writeRows_(sheet, rows, EXPENSE_RATES_HDR.length);
}

// ─────────────────────────────────────────
//  経費(実データ採用。集計には「日付」列を使用。「対象日付」「利用時間」「メモ」は
//  UIには出さないがそのまま素通しで保存する)
// ─────────────────────────────────────────

function getExpenses_() {
  const sheet = getExistingSheet_(SHEET_EXPENSES);
  if (!sheet) return [];
  const objs = readByHeaderName_(sheet);
  return objs
    .filter(function (o) {
      return o["ID"];
    })
    .map(function (o) {
      return {
        id: String(o["ID"]),
        date: cellToStr_(o["日付"]),
        item: o["項目"] || "",
        amount: Number(o["金額"]) || 0,
        hours: o["利用時間"] === "" || o["利用時間"] === undefined ? undefined : Number(o["利用時間"]),
        memo: o["メモ"] || "",
        targetDate: o["対象日付"] ? cellToStr_(o["対象日付"]) : "",
      };
    });
}

function saveExpenses_(expenses) {
  const sheet = getExistingSheet_(SHEET_EXPENSES);
  if (!sheet) return;
  const objects = (expenses || []).map(function (e) {
    return {
      id: e.id,
      date: e.date,
      item: e.item,
      hours: e.hours !== undefined ? e.hours : "",
      amount: e.amount,
      memo: e.memo || "",
      targetDate: e.targetDate || e.date,
    };
  });
  writeByHeaderOrder_(sheet, objects, EXPENSES_FIELD_BY_HEADER, "ID");
  // 日付列がテキストのまま保持されるように(日付型への自動変換を防ぐ)
  const dateCol = ensureColumn_(sheet, "日付");
  const rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, dateCol, rows, 1).setNumberFormat("@");
}

// ─────────────────────────────────────────
//  日次集計(実データ採用。{date: {channelId, clientId}} ※値は名前そのもの)
// ─────────────────────────────────────────

function getDailyMeta_() {
  const sheet = getExistingSheet_(SHEET_DAILY_META);
  if (!sheet) return {};
  const objs = readByHeaderName_(sheet);
  const map = {};
  objs.forEach(function (o) {
    const date = cellToStr_(o["日付"]);
    if (!date) return;
    map[date] = { channelId: o["販売形態"] || "", clientId: o["販売先"] || "" };
  });
  return map;
}

function saveDailyMeta_(dailyMeta) {
  const sheet = getExistingSheet_(SHEET_DAILY_META);
  if (!sheet) return;
  const objects = Object.keys(dailyMeta || {}).map(function (date) {
    const m = dailyMeta[date] || {};
    return { date: date, yearMonth: yearMonthOfGas_(date), clientName: m.clientId || "", channelName: m.channelId || "" };
  });
  writeByHeaderOrder_(sheet, objects, DAILY_META_FIELD_BY_HEADER, "日付");
  const dateCol = ensureColumn_(sheet, "日付");
  const rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, dateCol, rows, 1).setNumberFormat("@");
}

// ─────────────────────────────────────────
//  月次目標 / 月次PL予算 / 設定 — このアプリ専用シート(実データとの衝突なし)
// ─────────────────────────────────────────

function getMgmtBudgets_() {
  const sheet = getOrCreateSheet_(SHEET_MGMT_BUDGETS, MGMT_BUDGETS_HDR, null, [1]);
  migrateMgmtBudgetsCostRatio_(sheet);
  const map = {};
  getDataRows_(sheet).forEach(function (r) {
    const ym = cellToStr_(r[0]);
    if (!ym) return;
    map[ym] = { salesBudget: Number(r[1]) || 0, costRatio: Number(r[2]) || 0, profitBudget: Number(r[3]) || 0 };
  });
  return map;
}

// 「粗利率目標」列から「原価率目標」列への一度きりの移行。
// C1セルが"costRatio"でなければ未移行とみなし、既存の値を原価率(100−粗利率)に
// 変換してからヘッダーを更新する。以降はC1が"costRatio"のため再変換されない。
function migrateMgmtBudgetsCostRatio_(sheet) {
  const headerCell = sheet.getRange(1, 3);
  if (headerCell.getValue() === "costRatio") return;
  const rows = getDataRows_(sheet);
  if (rows.length > 0) {
    const converted = rows.map(function (r) {
      return [100 - (Number(r[2]) || 0)];
    });
    sheet.getRange(2, 3, converted.length, 1).setValues(converted);
  }
  headerCell.setValue("costRatio");
}

function saveMgmtBudgets_(mgmtBudgets) {
  const sheet = getOrCreateSheet_(SHEET_MGMT_BUDGETS, MGMT_BUDGETS_HDR, null, [1]);
  clearDataRows_(sheet);
  const rows = Object.keys(mgmtBudgets || {}).map(function (ym) {
    const b = mgmtBudgets[ym] || {};
    return [ym, Number(b.salesBudget) || 0, Number(b.costRatio) || 0, Number(b.profitBudget) || 0];
  });
  writeRows_(sheet, rows, MGMT_BUDGETS_HDR.length, [1]);
}

function getFinBudgets_() {
  const sheet = getOrCreateSheet_(SHEET_FIN_BUDGETS, FIN_BUDGETS_HDR, null, [1]);
  const map = {};
  getDataRows_(sheet).forEach(function (r) {
    const ym = cellToStr_(r[0]);
    if (!ym) return;
    map[ym] = { rawMaterialBudget: Number(r[1]) || 0, otherExpenseBudget: Number(r[2]) || 0, profitBudget: Number(r[3]) || 0 };
  });
  return map;
}

function saveFinBudgets_(finBudgets) {
  const sheet = getOrCreateSheet_(SHEET_FIN_BUDGETS, FIN_BUDGETS_HDR, null, [1]);
  clearDataRows_(sheet);
  const rows = Object.keys(finBudgets || {}).map(function (ym) {
    const b = finBudgets[ym] || {};
    return [ym, Number(b.rawMaterialBudget) || 0, Number(b.otherExpenseBudget) || 0, Number(b.profitBudget) || 0];
  });
  writeRows_(sheet, rows, FIN_BUDGETS_HDR.length, [1]);
}

function getSettings_() {
  const sheet = getOrCreateSheet_(SHEET_SETTINGS, SETTINGS_HDR, SETTINGS_SEED);
  const rows = getDataRows_(sheet);
  const row = rows[0] || SETTINGS_SEED[0];
  return { squareSyncFromSquare: row[0] === true || row[0] === "TRUE" };
}

function saveSettings_(settings) {
  const sheet = getOrCreateSheet_(SHEET_SETTINGS, SETTINGS_HDR, SETTINGS_SEED);
  clearDataRows_(sheet);
  writeRows_(sheet, [[!!(settings && settings.squareSyncFromSquare)]], SETTINGS_HDR.length);
}

// 1行目にMIMEタイプ(image/png or image/jpeg)、2行目以降にbase64チャンクを保存する
function getTodoVisual_() {
  const sheet = getOrCreateSheet_(SHEET_TODO_VISUAL, TODO_VISUAL_HDR, null, [1]);
  const rows = getDataRows_(sheet);
  if (rows.length < 2) return "";
  const mimeType = String(rows[0][0] || "");
  const base64 = rows
    .slice(1)
    .map(function (r) { return r[0] === null || r[0] === undefined ? "" : String(r[0]); })
    .join("");
  return mimeType && base64 ? "data:" + mimeType + ";base64," + base64 : "";
}

function saveTodoVisual_(dataUrl) {
  const sheet = getOrCreateSheet_(SHEET_TODO_VISUAL, TODO_VISUAL_HDR, null, [1]);
  clearDataRows_(sheet);
  const match = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg));base64,(.*)$/);
  if (!match) return { todoVisual: "" };
  const mimeType = match[1];
  const base64 = match[2];
  if (base64.length > TODO_VISUAL_MAX_BASE64_CHARS) {
    throw new Error("画像が大きすぎます。もう少し小さい画像を選んでください。");
  }
  const rows = [[mimeType]];
  for (let i = 0; i < base64.length; i += TODO_VISUAL_CHUNK_SIZE) {
    rows.push([base64.slice(i, i + TODO_VISUAL_CHUNK_SIZE)]);
  }
  writeRows_(sheet, rows, TODO_VISUAL_HDR.length, [1]);
  return { todoVisual: "data:" + mimeType + ";base64," + base64 };
}

// アプリアイコンはPNG限定のため、MIMEタイプ行は持たずbase64チャンクのみを保存する
function getAppIcon_() {
  const sheet = getOrCreateSheet_(SHEET_APP_ICON, APP_ICON_HDR, null, [1]);
  const rows = getDataRows_(sheet);
  if (rows.length === 0) return "";
  const base64 = rows.map(function (r) { return r[0] === null || r[0] === undefined ? "" : String(r[0]); }).join("");
  return base64 ? "data:image/png;base64," + base64 : "";
}

function saveAppIcon_(dataUrl) {
  const sheet = getOrCreateSheet_(SHEET_APP_ICON, APP_ICON_HDR, null, [1]);
  clearDataRows_(sheet);
  const raw = String(dataUrl || "");
  if (!raw) return { appIcon: "" };
  const match = raw.match(/^data:image\/png;base64,(.*)$/);
  if (!match) {
    throw new Error("アプリアイコンはPNG画像のみ保存できます。");
  }
  const base64 = match[1];
  if (base64.length > APP_ICON_MAX_BASE64_CHARS) {
    throw new Error("画像が大きすぎます。もう少し小さい画像を選んでください。");
  }
  const rows = [];
  for (let i = 0; i < base64.length; i += APP_ICON_CHUNK_SIZE) {
    rows.push([base64.slice(i, i + APP_ICON_CHUNK_SIZE)]);
  }
  writeRows_(sheet, rows, APP_ICON_HDR.length, [1]);
  return { appIcon: "data:image/png;base64," + base64 };
}

// ─────────────────────────────────────────
//  TODO・サブタスク(実データ採用。snoozed列は新設)
// ─────────────────────────────────────────

function getTodos_() {
  const sheet = getExistingSheet_(SHEET_TODOS);
  if (!sheet) return [];
  ensureColumn_(sheet, "snoozed");
  const objs = readByHeaderName_(sheet);
  return objs
    .filter(function (o) {
      return o["タスクID"];
    })
    .map(function (o) {
      return {
        id: String(o["タスクID"]),
        category: o["カテゴリ"] || "",
        task: o["タスク"] || "",
        deadline: cellToStr_(o["期限"]),
        status: o["ステータス"] || "未着手",
        snoozed: o["snoozed"] === true || o["snoozed"] === "TRUE",
      };
    });
}

function saveTodos_(todos) {
  const sheet = getExistingSheet_(SHEET_TODOS);
  if (!sheet) return;
  ensureColumn_(sheet, "snoozed");
  writeByHeaderOrder_(sheet, todos || [], TODOS_FIELD_BY_HEADER, "タスクID");
  const deadlineCol = ensureColumn_(sheet, "期限");
  const rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, deadlineCol, rows, 1).setNumberFormat("@");
}

function getSubtasks_() {
  const sheet = getExistingSheet_(SHEET_SUBTASKS);
  if (!sheet) return [];
  ensureColumn_(sheet, "snoozed");
  ensureColumn_(sheet, "statusUpdatedAt");
  const objs = readByHeaderName_(sheet);
  return objs
    .filter(function (o) {
      return o["サブタスクID"];
    })
    .map(function (o) {
      return {
        id: String(o["サブタスクID"]),
        parentTaskId: String(o["親タスクID"] || ""),
        name: o["サブタスク名"] || "",
        assignee: o["担当"] || "",
        deadline: cellToStr_(o["期限"]),
        status: o["ステータス"] || "未着手",
        snoozed: o["snoozed"] === true || o["snoozed"] === "TRUE",
        legacyCategory: o["分類"] || "", // 使途不明の既存列。UIには出さずそのまま保持する
        statusUpdatedAt: Number(o["statusUpdatedAt"]) || 0,
      };
    });
}

function saveSubtasks_(subtasks) {
  const sheet = getExistingSheet_(SHEET_SUBTASKS);
  if (!sheet) return;
  ensureColumn_(sheet, "snoozed");
  ensureColumn_(sheet, "statusUpdatedAt");
  writeByHeaderOrder_(sheet, subtasks || [], SUBTASKS_FIELD_BY_HEADER, "サブタスクID");
  const deadlineCol = ensureColumn_(sheet, "期限");
  const rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, deadlineCol, rows, 1).setNumberFormat("@");
}

// ─────────────────────────────────────────
//  Square同期ログ(追記のみ)— このアプリ専用シート
// ─────────────────────────────────────────

function appendSyncLog_(type, status, message) {
  const sheet = getOrCreateSheet_(SHEET_SYNC_LOG, SYNC_LOG_HDR, null, [1]);
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  sheet.appendRow([timestamp, type, status, message || ""]);
}

function getSquareSyncLog_(limit) {
  const sheet = getOrCreateSheet_(SHEET_SYNC_LOG, SYNC_LOG_HDR, null, [1]);
  const objs = rowsToObjects_(SYNC_LOG_HDR, getDataRows_(sheet));
  return objs.slice(Math.max(objs.length - (limit || 20), 0)).reverse();
}

// ─────────────────────────────────────────
//  既存シート(読み取り専用): 売上_Square / 商品マスター
// ─────────────────────────────────────────

function getSalesSheetReadOnly_() {
  return getSs_().getSheetByName(SALES_SHEET_NAME) || null;
}

// 売上_Squareシートに「チャネル」列(実店舗Square/ネットBASEの区別)を確保し、その列番号(1始まり)を返す。
// 既に存在すればその位置を返すのみ。存在しなければコスト列(8,9)の後ろ(10列目以降)に新設する。
// 既存の未チャネル行(過去のSquare取込分)は空欄のまま残る = getSales_側で空欄を"Square"として扱う。
function ensureSalesChannelColumn_(sheet) {
  const lastCol = sheet.getLastColumn();
  const headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  const idx = headers.indexOf("チャネル");
  if (idx >= 0) return idx + 1;
  const col = Math.max(lastCol, 9) + 1;
  sheet.getRange(1, col).setValue("チャネル");
  return col;
}

function getCatalogReadOnly_() {
  const sheet = getSs_().getSheetByName(CATALOG_SHEET_NAME);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const nameIdx = headers.indexOf("商品名");
  const priceIdx = headers.indexOf("価格(円)");
  const idIdx = headers.indexOf("id");
  return data
    .slice(1)
    .filter(function (r) {
      return r[nameIdx];
    })
    .map(function (r) {
      return { squareCatalogId: String(r[idIdx] || ""), name: String(r[nameIdx] || ""), price: Number(r[priceIdx]) || 0 };
    });
}

// 売上_Squareを読み取り専用で整形。orderId は id 列(order.id + "_" + item.uid/name)から
// 最後の "_" 区切りを取り除いて復元(既存シートに独立した伝票ID列が無いための推定ロジック)。
// productId は 商品名 そのもの(商品マスター_原価管理も id=name のため突き合わせ不要)。
function getSales_() {
  const sheet = getSalesSheetReadOnly_();
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const idIdx = headers.indexOf("id");
  const dateIdx = headers.indexOf("日付");
  const nameIdx = headers.indexOf("商品名");
  const qtyIdx = headers.indexOf("数量");
  const amountIdx = headers.indexOf("金額(円)");
  const costIdx = headers.indexOf("unitCostAtSale");
  const costSubIdx = headers.indexOf("costSubtotal");
  const channelIdx = headers.indexOf("チャネル");

  return data
    .slice(1)
    .filter(function (r) {
      return r[idIdx];
    })
    .map(function (r) {
      const id = String(r[idIdx]);
      const orderId = id.indexOf("_") >= 0 ? id.slice(0, id.lastIndexOf("_")) : id;
      const row = {
        id: id,
        orderId: orderId,
        date: cellToStr_(r[dateIdx]),
        productId: String(r[nameIdx] || ""),
        qty: Number(r[qtyIdx]) || 0,
        amount: Number(r[amountIdx]) || 0,
        // 過去にチャネル列が無かった頃の行(実質すべてSquare取込)は空欄のままなので"Square"扱いにする
        channel: channelIdx >= 0 && r[channelIdx] ? String(r[channelIdx]) : "Square",
      };
      if (costIdx >= 0 && r[costIdx] !== "" && r[costIdx] !== undefined && r[costIdx] !== null) {
        row.unitCostAtSale = Number(r[costIdx]);
      }
      if (costSubIdx >= 0 && r[costSubIdx] !== "" && r[costSubIdx] !== undefined && r[costSubIdx] !== null) {
        row.costSubtotal = Number(r[costSubIdx]);
      }
      return row;
    });
}

// ─────────────────────────────────────────
//  デバッグ: 実データシートの生ヘッダー行確認(読み取り専用)
//
//  シートの作成・データの変更は一切行わない(getSheetByNameのみ使用。
//  getOrCreateSheet_は使わない=見つからなければ何もせずexists:falseを返す)。
// ─────────────────────────────────────────

function debugGetRawHeaders_() {
  const targets = [
    { name: SHEET_RECIPES, fieldByHeader: null }, // レシピは列名対応づけ未実装のため対応表なし(要実データ確認)
    { name: SHEET_EXPENSES, fieldByHeader: EXPENSES_FIELD_BY_HEADER },
    { name: SHEET_TODOS, fieldByHeader: TODOS_FIELD_BY_HEADER },
    { name: SHEET_SUBTASKS, fieldByHeader: SUBTASKS_FIELD_BY_HEADER },
    { name: SHEET_MATERIALS, fieldByHeader: MATERIALS_FIELD_BY_HEADER },
    { name: SHEET_SET_BREAKDOWN, fieldByHeader: SET_BREAKDOWN_FIELD_BY_HEADER },
    { name: SHEET_REBATE_CLIENTS, fieldByHeader: REBATE_FIELD_BY_HEADER },
    { name: SHEET_SALES_CHANNELS, fieldByHeader: null }, // 読み取り専用(名前一覧のみ)
    { name: SHEET_DAILY_META, fieldByHeader: DAILY_META_FIELD_BY_HEADER },
  ];
  const ss = getSs_();
  const result = {};
  targets.forEach(function (t) {
    const sheet = ss.getSheetByName(t.name);
    if (!sheet) {
      result[t.name] = { exists: false };
      return;
    }
    const lastCol = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();
    const headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    const mappedHeaders = t.fieldByHeader ? Object.keys(t.fieldByHeader) : [];
    const unmappedHeaders = headers.filter(function (h) {
      return h !== "" && h !== null && mappedHeaders.indexOf(h) < 0;
    });
    result[t.name] = {
      exists: true,
      columnCount: lastCol,
      rowCount: Math.max(lastRow - 1, 0),
      headers: headers,
      mappedHeaders: mappedHeaders,
      unmappedHeaders: unmappedHeaders,
    };
  });
  return result;
}

// ─────────────────────────────────────────
//  一括読み書き
// ─────────────────────────────────────────

function getAll_() {
  return {
    materials: getMaterials_(),
    calendarEvents: getCalendarEvents_(),
    products: getProducts_(),
    productAliases: getProductAliases_(),
    packagingExemptions: getPackagingExemptions_(),
    saleOverrides: getSaleOverrides_(),
    recipes: getRecipes_(),
    setBreakdowns: getSetBreakdowns_(),
    rebateClients: getRebateClients_(),
    salesChannels: getSalesChannels_(),
    expenseRates: getExpenseRates_(),
    expenses: getExpenses_(),
    dailyMeta: getDailyMeta_(),
    mgmtBudgets: getMgmtBudgets_(),
    finBudgets: getFinBudgets_(),
    todos: getTodos_(),
    subtasks: getSubtasks_(),
    settings: getSettings_(),
    todoVisual: getTodoVisual_(),
    appIcon: getAppIcon_(),
    sales: getSales_(),
    squareSyncLog: getSquareSyncLog_(20),
  };
}

function saveAll_(body) {
  saveMaterials_(body.materials || []);
  saveCalendarEvents_(body.calendarEvents || []);
  saveProducts_(body.products || []);
  saveProductAliases_(body.productAliases || {});
  savePackagingExemptions_(body.packagingExemptions || []);
  saveSaleOverrides_(body.saleOverrides || {});
  saveRecipes_(body.recipes || {});
  saveSetBreakdowns_(body.setBreakdowns || {});
  saveRebateClients_(body.rebateClients || []);
  saveExpenseRates_(body.expenseRates || {});
  saveExpenses_(body.expenses || []);
  saveDailyMeta_(body.dailyMeta || {});
  saveMgmtBudgets_(body.mgmtBudgets || {});
  saveFinBudgets_(body.finBudgets || {});
  saveSettings_(body.settings || {});
  return { saved: true };
}

// TODO/サブタスクはsaveAll_から分離した専用の軽量保存(頻繁に単独で保存されるため)。
// 参照: doPost の action "saveTodos"
function saveTodosAndSubtasks_(body) {
  saveTodos_(body.todos || []);
  saveSubtasks_(body.subtasks || []);
  return { saved: true };
}