// =============================================================
//  カモの小屋 収益分析アプリ — シートアクセス層
//  既存の syncFromSquare (syncOrders/syncCatalog) が書き込むシート
//  (売上_Square / 商品マスター) は読み取り専用として扱い、
//  ここでは一切書き込まない。
// =============================================================

// 既存GAS(existing-sync.gs)も同名の定数 SPREADSHEET_ID を宣言しているため、
// 同一Apps Scriptプロジェクトに両ファイルを置くと "Identifier has already
// been declared" になってしまう。ここでは別名にして値だけ揃える。
const KAMO_SPREADSHEET_ID = "1qMzUrUaCCI4lTMwQMKVyOeW2F5yDyQEJgqU-B1jAOEY";

// ---- 既存シート(読み取り専用) ----
const SALES_SHEET_NAME = "売上_Square";
const SALES_HDR = ["id", "日付", "商品名", "数量", "金額(円)", "支払方法", "取得日時"];
const SALES_COST_COLS = ["unitCostAtSale", "costSubtotal"]; // 8,9列目に追加(stampCostSnapshotのみが書く)
const CATALOG_SHEET_NAME = "商品マスター";

// ---- 新規シート ----
const SHEET_PRODUCTS = "商品マスター_原価管理";
const PRODUCTS_HDR = ["id", "name", "price", "kind", "squareCatalogId", "squareCatalogVersion"];

const SHEET_RECIPES = "レシピ";
const RECIPES_HDR = ["productId", "servings", "ingredientsJson", "packagingJson"];

const SHEET_SET_BREAKDOWN = "セット内訳";
const SET_BREAKDOWN_HDR = ["id", "productId", "kind", "refId", "qty"];

const SHEET_MATERIALS = "材料・包材マスタ";
const MATERIALS_HDR = ["id", "name", "category", "unit", "unitPrice"];

const SHEET_REBATE_CLIENTS = "販売先マスタ";
const REBATE_CLIENTS_HDR = ["id", "name", "rate", "memo"];

const SHEET_SALES_CHANNELS = "販売形態マスタ";
const SALES_CHANNELS_HDR = ["id", "name", "rebateApplicable"];
const SALES_CHANNELS_SEED = [
  ["f1", "店舗販売", false],
  ["f2", "委託販売", true],
  ["f3", "EC販売", false],
  ["f4", "イベント出店", false],
];

const SHEET_EXPENSE_RATES = "経費マスタ_時間単価";
const EXPENSE_RATES_HDR = ["item", "hourlyRate"];
const EXPENSE_RATES_SEED = [
  ["店舗利用料(製造・販売)", 1500],
  ["店舗利用料(製造)", 1200],
  ["人件費", 1100],
];

const SHEET_EXPENSES = "経費";
const EXPENSES_HDR = ["id", "date", "item", "amount"];

const SHEET_DAILY_META = "日次設定";
const DAILY_META_HDR = ["date", "channelId", "clientId"];

const SHEET_MGMT_BUDGETS = "月次目標";
const MGMT_BUDGETS_HDR = ["yearMonth", "salesBudget", "grossMarginRatio", "profitBudget"];

const SHEET_FIN_BUDGETS = "月次PL予算";
const FIN_BUDGETS_HDR = ["yearMonth", "rawMaterialBudget", "otherExpenseBudget", "profitBudget"];

const SHEET_SETTINGS = "設定";
const SETTINGS_HDR = ["squareSyncFromSquare"];
const SETTINGS_SEED = [[true]];

const SHEET_TODOS = "TODO";
const TODOS_HDR = ["id", "category", "task", "deadline", "status", "snoozed"];

const SHEET_SUBTASKS = "サブタスク";
const SUBTASKS_HDR = ["id", "parentTaskId", "name", "assignee", "deadline", "status", "snoozed"];

const SHEET_SYNC_LOG = "Square同期ログ";
const SYNC_LOG_HDR = ["timestamp", "type", "status", "message"];

// ─────────────────────────────────────────
//  汎用ヘルパー
// ─────────────────────────────────────────

function getSs_() {
  return SpreadsheetApp.openById(KAMO_SPREADSHEET_ID);
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
  return String(val === null || val === undefined ? "" : val);
}

// ─────────────────────────────────────────
//  商品マスター_原価管理
// ─────────────────────────────────────────

function getProducts_() {
  const sheet = getOrCreateSheet_(SHEET_PRODUCTS, PRODUCTS_HDR);
  return rowsToObjects_(PRODUCTS_HDR, getDataRows_(sheet)).map(function (p) {
    return { id: String(p.id), name: p.name || "", price: Number(p.price) || 0, kind: p.kind || "single", squareCatalogId: p.squareCatalogId || "", squareCatalogVersion: p.squareCatalogVersion || "" };
  });
}

function saveProducts_(products) {
  const sheet = getOrCreateSheet_(SHEET_PRODUCTS, PRODUCTS_HDR);
  clearDataRows_(sheet);
  writeRows_(sheet, objectsToRows_(PRODUCTS_HDR, products), PRODUCTS_HDR.length);
}

// ─────────────────────────────────────────
//  レシピ({productId: {servings, ingredients:[], packaging:[]}})
// ─────────────────────────────────────────

function getRecipes_() {
  const sheet = getOrCreateSheet_(SHEET_RECIPES, RECIPES_HDR);
  const recipes = {};
  getDataRows_(sheet).forEach(function (r) {
    const productId = String(r[0] || "");
    if (!productId) return;
    recipes[productId] = {
      servings: r[1] === "" ? "" : Number(r[1]),
      ingredients: safeParseJson_(r[2], []),
      packaging: safeParseJson_(r[3], []),
    };
  });
  return recipes;
}

function saveRecipes_(recipes) {
  const sheet = getOrCreateSheet_(SHEET_RECIPES, RECIPES_HDR);
  clearDataRows_(sheet);
  const rows = Object.keys(recipes || {}).map(function (pid) {
    const r = recipes[pid];
    return [pid, r.servings, JSON.stringify(r.ingredients || []), JSON.stringify(r.packaging || [])];
  });
  writeRows_(sheet, rows, RECIPES_HDR.length);
}

function safeParseJson_(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (e) {
    return fallback;
  }
}

// ─────────────────────────────────────────
//  セット内訳({productId: [{id, kind, refId, qty}]})
// ─────────────────────────────────────────

function getSetBreakdowns_() {
  const sheet = getOrCreateSheet_(SHEET_SET_BREAKDOWN, SET_BREAKDOWN_HDR);
  const map = {};
  getDataRows_(sheet).forEach(function (r) {
    const id = String(r[0] || "");
    const productId = String(r[1] || "");
    if (!id || !productId) return;
    if (!map[productId]) map[productId] = [];
    map[productId].push({ id: id, kind: r[2], refId: String(r[3]), qty: r[4] === "" ? "" : Number(r[4]) });
  });
  return map;
}

function saveSetBreakdowns_(setBreakdowns) {
  const sheet = getOrCreateSheet_(SHEET_SET_BREAKDOWN, SET_BREAKDOWN_HDR);
  clearDataRows_(sheet);
  const rows = [];
  Object.keys(setBreakdowns || {}).forEach(function (productId) {
    (setBreakdowns[productId] || []).forEach(function (row) {
      rows.push([row.id, productId, row.kind, row.refId, row.qty]);
    });
  });
  writeRows_(sheet, rows, SET_BREAKDOWN_HDR.length);
}

// ─────────────────────────────────────────
//  材料・包材マスタ
// ─────────────────────────────────────────

function getMaterials_() {
  const sheet = getOrCreateSheet_(SHEET_MATERIALS, MATERIALS_HDR);
  return rowsToObjects_(MATERIALS_HDR, getDataRows_(sheet)).map(function (m) {
    return { id: String(m.id), name: m.name || "", category: m.category || "", unit: m.unit || "", unitPrice: Number(m.unitPrice) || 0 };
  });
}

function saveMaterials_(materials) {
  const sheet = getOrCreateSheet_(SHEET_MATERIALS, MATERIALS_HDR);
  clearDataRows_(sheet);
  writeRows_(sheet, objectsToRows_(MATERIALS_HDR, materials), MATERIALS_HDR.length);
}

// ─────────────────────────────────────────
//  販売先(委託先)マスタ
// ─────────────────────────────────────────

function getRebateClients_() {
  const sheet = getOrCreateSheet_(SHEET_REBATE_CLIENTS, REBATE_CLIENTS_HDR);
  return rowsToObjects_(REBATE_CLIENTS_HDR, getDataRows_(sheet)).map(function (c) {
    return { id: String(c.id), name: c.name || "", rate: Number(c.rate) || 0, memo: c.memo || "" };
  });
}

function saveRebateClients_(rebateClients) {
  const sheet = getOrCreateSheet_(SHEET_REBATE_CLIENTS, REBATE_CLIENTS_HDR);
  clearDataRows_(sheet);
  writeRows_(sheet, objectsToRows_(REBATE_CLIENTS_HDR, rebateClients), REBATE_CLIENTS_HDR.length);
}

// ─────────────────────────────────────────
//  販売形態マスタ(読み取り専用・シート作成時にseed)
// ─────────────────────────────────────────

function getSalesChannels_() {
  const sheet = getOrCreateSheet_(SHEET_SALES_CHANNELS, SALES_CHANNELS_HDR, SALES_CHANNELS_SEED);
  return rowsToObjects_(SALES_CHANNELS_HDR, getDataRows_(sheet)).map(function (c) {
    return { id: String(c.id), name: c.name || "", rebateApplicable: c.rebateApplicable === true || c.rebateApplicable === "TRUE" };
  });
}

// ─────────────────────────────────────────
//  経費マスタ(時間単価)
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
//  経費
// ─────────────────────────────────────────

function getExpenses_() {
  const sheet = getOrCreateSheet_(SHEET_EXPENSES, EXPENSES_HDR, null, [2]);
  return rowsToObjects_(EXPENSES_HDR, getDataRows_(sheet)).map(function (e) {
    return { id: String(e.id), date: cellToStr_(e.date), item: e.item || "", amount: Number(e.amount) || 0 };
  });
}

function saveExpenses_(expenses) {
  const sheet = getOrCreateSheet_(SHEET_EXPENSES, EXPENSES_HDR, null, [2]);
  clearDataRows_(sheet);
  writeRows_(sheet, objectsToRows_(EXPENSES_HDR, expenses), EXPENSES_HDR.length, [2]);
}

// ─────────────────────────────────────────
//  日次設定({date: {channelId, clientId}})
// ─────────────────────────────────────────

function getDailyMeta_() {
  const sheet = getOrCreateSheet_(SHEET_DAILY_META, DAILY_META_HDR, null, [1]);
  const map = {};
  getDataRows_(sheet).forEach(function (r) {
    const date = cellToStr_(r[0]);
    if (!date) return;
    map[date] = { channelId: String(r[1] || ""), clientId: String(r[2] || "") };
  });
  return map;
}

function saveDailyMeta_(dailyMeta) {
  const sheet = getOrCreateSheet_(SHEET_DAILY_META, DAILY_META_HDR, null, [1]);
  clearDataRows_(sheet);
  const rows = Object.keys(dailyMeta || {}).map(function (date) {
    const m = dailyMeta[date] || {};
    return [date, m.channelId || "", m.clientId || ""];
  });
  writeRows_(sheet, rows, DAILY_META_HDR.length, [1]);
}

// ─────────────────────────────────────────
//  月次目標({yearMonth: {salesBudget, grossMarginRatio, profitBudget}})
// ─────────────────────────────────────────

function getMgmtBudgets_() {
  const sheet = getOrCreateSheet_(SHEET_MGMT_BUDGETS, MGMT_BUDGETS_HDR, null, [1]);
  const map = {};
  getDataRows_(sheet).forEach(function (r) {
    const ym = cellToStr_(r[0]);
    if (!ym) return;
    map[ym] = { salesBudget: Number(r[1]) || 0, grossMarginRatio: Number(r[2]) || 0, profitBudget: Number(r[3]) || 0 };
  });
  return map;
}

function saveMgmtBudgets_(mgmtBudgets) {
  const sheet = getOrCreateSheet_(SHEET_MGMT_BUDGETS, MGMT_BUDGETS_HDR, null, [1]);
  clearDataRows_(sheet);
  const rows = Object.keys(mgmtBudgets || {}).map(function (ym) {
    const b = mgmtBudgets[ym] || {};
    return [ym, Number(b.salesBudget) || 0, Number(b.grossMarginRatio) || 0, Number(b.profitBudget) || 0];
  });
  writeRows_(sheet, rows, MGMT_BUDGETS_HDR.length, [1]);
}

// ─────────────────────────────────────────
//  月次PL予算({yearMonth: {rawMaterialBudget, otherExpenseBudget, profitBudget}})
// ─────────────────────────────────────────

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

// ─────────────────────────────────────────
//  設定(1行のみ)
// ─────────────────────────────────────────

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

// ─────────────────────────────────────────
//  TODO・サブタスク
// ─────────────────────────────────────────

function getTodos_() {
  const sheet = getOrCreateSheet_(SHEET_TODOS, TODOS_HDR, null, [4]);
  return rowsToObjects_(TODOS_HDR, getDataRows_(sheet)).map(function (t) {
    return {
      id: String(t.id),
      category: t.category || "",
      task: t.task || "",
      deadline: cellToStr_(t.deadline),
      status: t.status || "未着手",
      snoozed: t.snoozed === true || t.snoozed === "TRUE",
    };
  });
}

function saveTodos_(todos) {
  const sheet = getOrCreateSheet_(SHEET_TODOS, TODOS_HDR, null, [4]);
  clearDataRows_(sheet);
  writeRows_(sheet, objectsToRows_(TODOS_HDR, todos), TODOS_HDR.length, [4]);
}

function getSubtasks_() {
  const sheet = getOrCreateSheet_(SHEET_SUBTASKS, SUBTASKS_HDR, null, [5]);
  return rowsToObjects_(SUBTASKS_HDR, getDataRows_(sheet)).map(function (s) {
    return {
      id: String(s.id),
      parentTaskId: String(s.parentTaskId),
      name: s.name || "",
      assignee: s.assignee || "",
      deadline: cellToStr_(s.deadline),
      status: s.status || "未着手",
      snoozed: s.snoozed === true || s.snoozed === "TRUE",
    };
  });
}

function saveSubtasks_(subtasks) {
  const sheet = getOrCreateSheet_(SHEET_SUBTASKS, SUBTASKS_HDR, null, [5]);
  clearDataRows_(sheet);
  writeRows_(sheet, objectsToRows_(SUBTASKS_HDR, subtasks), SUBTASKS_HDR.length, [5]);
}

// ─────────────────────────────────────────
//  Square同期ログ(追記のみ)
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
// 商品名から 商品マスター_原価管理.name への一致で productId を解決する。
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

  const products = getProducts_();
  const nameToProduct = {};
  products.forEach(function (p) {
    nameToProduct[p.name] = p;
  });

  return data
    .slice(1)
    .filter(function (r) {
      return r[idIdx];
    })
    .map(function (r) {
      const id = String(r[idIdx]);
      const orderId = id.indexOf("_") >= 0 ? id.slice(0, id.lastIndexOf("_")) : id;
      const name = String(r[nameIdx] || "");
      const product = nameToProduct[name];
      const productId = product ? product.id : name;
      const qty = Number(r[qtyIdx]) || 0;
      const amount = Number(r[amountIdx]) || 0;
      const row = {
        id: id,
        orderId: orderId,
        date: cellToStr_(r[dateIdx]),
        productId: productId,
        qty: qty,
        amount: amount,
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
//  一括読み書き
// ─────────────────────────────────────────

function getAll_() {
  return {
    materials: getMaterials_(),
    products: getProducts_(),
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
    sales: getSales_(),
    squareSyncLog: getSquareSyncLog_(20),
  };
}

function saveAll_(body) {
  saveMaterials_(body.materials || []);
  saveProducts_(body.products || []);
  saveRecipes_(body.recipes || {});
  saveSetBreakdowns_(body.setBreakdowns || {});
  saveRebateClients_(body.rebateClients || []);
  saveExpenseRates_(body.expenseRates || {});
  saveExpenses_(body.expenses || []);
  saveDailyMeta_(body.dailyMeta || {});
  saveMgmtBudgets_(body.mgmtBudgets || {});
  saveFinBudgets_(body.finBudgets || {});
  saveTodos_(body.todos || []);
  saveSubtasks_(body.subtasks || []);
  saveSettings_(body.settings || {});
  return { saved: true };
}
