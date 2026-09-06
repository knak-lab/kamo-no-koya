/**
 * ============================================================
 *  カタログ突合・一括修正  (2026-09-06)
 * ============================================================
 *  背景: Square側で商品名が一括変更されたが、商品マスター_原価管理 は旧名のまま。
 *        識別子(id === name)方式なので、名前がズレるとレシピ/セット内訳/エイリアス等の
 *        参照も一緒にズレる。ここでは squareCatalogId(= SquareのバリエーションID)で
 *        商品を確実に特定し、名前を Square名で上書きし、従属データの参照も連動して直す。
 *
 *  使い方 (Apps Scriptエディタで関数を選んで実行):
 *    1) migrationDryRun()   … 変更内容をログに出すだけ。シートは一切変更しない。
 *    2) migrationApply()    … 6シートをバックアップしてから実際に書き込む。
 *
 *  対象シート: 商品マスター_原価管理 / レシピ / セット内訳マスタ /
 *              商品名エイリアス / 包材費0円チェック除外 / 売上個別修正
 *  ※ 売上_Square と 商品マスター(Square写し) は読み取りのみ。触らない。
 *
 *  実行後は アプリを再読込(Service Workerのハードリロード)すること。
 * ============================================================
 */

// [squareCatalogId(バリエーションID), 現在のアプリ名, 新しい名前(=Square名), 価格上書き(なければ null)]
var RECON_RENAME_2026 = [
  ["XWGCVWNWBK2W3HJEKDUEEZY5", "米粉と塩麹のガレット",                 "ガレット（単品）",                       null],
  ["4SMLJF7LRDXXSSVMBYR3IATD", "米粉のレモンケーキ",                   "レモンケーキ",                           null],
  ["FAPWWBMKP467OB4OMVQL2GRU", "米粉とはちみつのフロランタン",         "フロランタン（単品）",                   null],
  ["SYZPL5E4B3B4CXX5VW26MTCW", "米粉のオートミールクッキー",           "オートミールクッキー",                   null],
  ["Y7373TSY43VEXEP44TJCDHRP", "ラズベリークランブルケーキ / 定価",     "クランブルケーキ（ラズベリー） / 定価",   null],
  ["Y7373TSY43VEXEP44TJCDHRP", "ラズベリークランブルケーキ / 定価 / 定価", "クランブルケーキ（ラズベリー） / 定価", null], // 重複行→統合
  ["KTDKQ3DAWLJ7ENFIP5HVV5FH", "豆乳杏仁豆腐ラズベリーソース / 通常",   "豆乳杏仁豆腐（ラズベリーソース） / 通常", null],
  ["VH5WMZV4UDWYR2K5RQV4BNQA", "レモンボールクッキー 5個 / 通常",       "レモンボールクッキー （5個） / 通常",     null],
  ["7Z3XQ3HM7TYU733TCBBM2FJG", "米粉のスコーン / 通常",                 "スコーン / 通常",                         null],
  ["O3ONWET7TUYYUTH6ZDLCVV54", "クラフトジンジャエール / 通常",         "ジンジャーエール / 通常",                 null],
  ["UUIB2EEYWAZ5PXVPJITHQHS6", "米粉クッキー缶(小) / 通常",             "カモ小屋セット缶詰（1100） / 通常",       null],
  ["2F4AIN7ECLRYJRX7XPM7T3FV", "米粉クッキー缶(大) / 通常",             "カモ小屋セット箱詰（1500） / 通常",       null],
  ["NRFMF7XKH7ZBFFD77EOBI7DM", "カモ小屋クッキー缶1100 / 定価",         "カモ小屋セット（缶1100） / 定価",         null],
  ["FBFYEGAKM4S36WNMZCO2EHQN", "米粉のディアマンクッキー　3コ / 定価",   "ディアマンクッキー（3個） / 定価",         null],
  ["UACUWCYRM6OQLK6FXEZMZRJO", "米粉のディアマンクッキー和紅茶3コ / 定価", "ディアマンクッキー（和紅茶・3個） / 定価", null],
  ["ITMQGX7RLYREHXUABJ2MMAQQ", "マフィン　ブルーベリー＆ラズベリー / 定価", "マフィン（ブルーベリー＆ラズベリー） / 定価", null],
  ["AT4ARWPTNHXOXKTMEO43FUM7", "マフィン　抹茶あずき / 通常",           "マフィン（抹茶あずき） / 通常",           null],
  ["GYBMEWHSRR6Q2BVACQRR76TH", "マフィン　塩レモン&ハチミツ / 通常",     "マフィン（塩レモン&ハチミツ） / 通常",     null],
  ["6YX7JN6XVZUUWNH2G3LN7GUQ", "米粉のキューブクッキー 4個入り / 通常", "キューブクッキー （4個・抹茶） / 通常",   null],
  ["FJEXYMFQHCOJKMMV5JNW375B", "コエド伽羅 / 通常",                     "コエドビール（伽羅） / 通常",             null],
  ["E7XMZ6ALCGURFUERSD4VI53Z", "コエド鞠花 / 通常",                     "コエドビール（鞠花） / 通常",             null],
  ["FO7Y5LCP2X24HIPQ65AVKMZ7", "かき氷 / 通常",                         "【かき氷】市販シロップがけ / 通常",       null],
  ["LO4ZDQ4DNMVYOBYSUZR7OLAU", "かき氷自家製シロップ / 通常",           "【かき氷】自家製シロップがけ / 通常",     null],
  ["EDNM6MONYIYD72KGOFDGHUP5", "かき氷+アルコール / 通常",              "【かき氷】アルコールがけ / 通常",         null],
  ["QKGUJPUOJGAURBTQTVRPTDJH", "かき氷+練乳 / 通常",                    "【かき氷トッピング】練乳 / 通常",         null],
  ["JBCA2IXF6MWAZCEQ2EPIGFFK", "かき氷+あんこ / 通常",                  "【かき氷トッピング】あんこ / 通常",       null],
  ["DOV3S3W3GCRR45LIY5EBKOH6", "かき氷+クッキー / 通常",                "【かき氷トッピング】クッキー / 通常",     null],
  ["BY7N5DVOABFM5YXLDB6MLNY3", "米粉のオートミールクッキー　ゴマ&味噌 / 定価", "オートミールクッキー（ゴマ&味噌） / 定価", null],
  ["OAS3S6MYQNLYTHOCTGYKGTB5", "マフィン　いちぢくクリームチーズ / 通常", "マフィン（いちぢくクリームチーズ） / 通常", 300] // 価格 0→300
];

// レシピシートに残っている旧々名(「/ 通常」サフィックスが付く前の名前)を新名へ寄せる。
// [現在のレシピキー, 新しい商品名]
var RECON_RECIPE_KEY_RENAME_2026 = [
  ["かき氷",                   "【かき氷】市販シロップがけ / 通常"],
  ["かき氷自家製シロップ",     "【かき氷】自家製シロップがけ / 通常"],
  ["かき氷アルコールオプション", "【かき氷】アルコールがけ / 通常"]
];

// 現Squareにあるが 商品マスター_原価管理 に無い新商品。
// [squareCatalogId, 名前, 価格, kind]  ※レシピ・セット内訳は空。あとでアプリ側で作成すること。
var RECON_NEW_PRODUCTS_2026 = [
  ["EDCPHFLCPX7AKYCL4CNXRURM", "クランブルケーキ（ブルーベリー） / 定価", 300, "single"],
  ["J4SZB7DJG7IC6LBRNFJZL2U5", "キューブクッキー （4個・ほうじ茶） / 定価", 300, "set"]
];

// ── 個別統合オペレーション ──────────────────────────
// 麹カルピス(ID無しのバラ行・レシピ有) を 麹カルピス / 定価 に統合する
var RECON_MERGE_KOJICALPIS = { from: "麹カルピス", to: "麹カルピス / 定価" };
// セット内訳の「レモンボールクッキー 3個 / 通常」定義を「レモンボールクッキー 3個」に寄せる
var RECON_MERGE_LEMONBALL3 = { from: "レモンボールクッキー 3個 / 通常", to: "レモンボールクッキー 3個" };
// 完全なゴミ: セット内訳の「カモの小屋」(構成品「クロワッサン」)を削除する
var RECON_DELETE_SET_KEYS = ["カモの小屋"];

// ============================================================
//  エントリポイント
// ============================================================

function migrationDryRun() {
  var report = migrationRun_(false);
  Logger.log(report);
  return report;
}

function migrationApply() {
  reconcileBackupSheets_();
  var report = migrationRun_(true);
  Logger.log(report);
  appendSyncLog_("catalogReconcile", "success", "一括修正を適用しました");
  return report;
}

// ============================================================
//  本体
// ============================================================

function migrationRun_(apply) {
  var log = [];
  var say = function (s) { log.push(s); };
  say("=== カタログ一括修正 " + (apply ? "【適用】" : "【ドライラン: 書き込みなし】") + " ===");

  var b = reconcileLoadBundle_();
  say("読込: 商品" + b.products.length + " / レシピ" + Object.keys(b.recipes).length +
      " / セット内訳" + Object.keys(b.setBreakdowns).length + "セット / エイリアス" +
      Object.keys(b.aliases).length + " / 包材免除" + b.packagingExemptions.length +
      " / 売上個別修正" + Object.keys(b.saleOverrides).length);

  // 1) 28件の改名(squareCatalogIdで特定)
  say("\n-- 改名 --");
  RECON_RENAME_2026.forEach(function (row) {
    var sqid = row[0], oldName = row[1], newName = row[2], priceOv = row[3];
    var target = null;
    for (var i = 0; i < b.products.length; i++) {
      if (b.products[i].squareCatalogId === sqid && b.products[i].name === oldName) { target = b.products[i]; break; }
    }
    if (!target) {
      // 名前一致だけでも拾う(squareCatalogIdが未設定の行など)
      for (var j = 0; j < b.products.length; j++) {
        if (b.products[j].name === oldName) { target = b.products[j]; break; }
      }
    }
    if (!target) { say("  SKIP  " + oldName + "  (該当商品が見つからない。既に修正済みか?)"); return; }

    reconcileRenameEverywhere_(b, target.name, newName, say);
    target.squareCatalogId = sqid;
    if (priceOv !== null && priceOv !== undefined) {
      say("  価格  " + newName + "  " + target.price + " → " + priceOv);
      target.price = priceOv;
    }
    say("  改名  " + oldName + "  →  " + newName);
  });

  // 2) 麹カルピス を 麹カルピス / 定価 に統合
  say("\n-- 統合: 麹カルピス --");
  if (b.recipes[RECON_MERGE_KOJICALPIS.from] || productByName_(b, RECON_MERGE_KOJICALPIS.from)) {
    reconcileRenameEverywhere_(b, RECON_MERGE_KOJICALPIS.from, RECON_MERGE_KOJICALPIS.to, say);
    b.aliases[RECON_MERGE_KOJICALPIS.from] = RECON_MERGE_KOJICALPIS.to; // 旧名の売上行(raw="麹カルピス")用
    say("  エイリアス追加  麹カルピス → 麹カルピス / 定価");
  } else {
    say("  SKIP (対象なし)");
  }

  // 3) セット内訳: レモンボールクッキー 3個 / 通常 → レモンボールクッキー 3個
  say("\n-- 統合: レモンボールクッキー 3個 --");
  if (b.setBreakdowns[RECON_MERGE_LEMONBALL3.from]) {
    reconcileRenameSetKey_(b, RECON_MERGE_LEMONBALL3.from, RECON_MERGE_LEMONBALL3.to, say);
  } else {
    say("  SKIP (対象なし)");
  }

  // 4) ゴミのセット内訳を削除
  say("\n-- ゴミ削除 --");
  RECON_DELETE_SET_KEYS.forEach(function (k) {
    if (b.setBreakdowns[k]) { delete b.setBreakdowns[k]; say("  セット内訳を削除: " + k); }
    else { say("  SKIP (なし): " + k); }
  });

  // 5) レシピキーの旧々名を寄せる
  say("\n-- レシピキー修正(旧々名) --");
  RECON_RECIPE_KEY_RENAME_2026.forEach(function (pair) {
    var from = pair[0], to = pair[1];
    if (b.recipes[from] === undefined) { say("  SKIP (なし): " + from); return; }
    b.recipes[to] = reconcileMergeRecipe_(b.recipes[to], b.recipes[from]);
    delete b.recipes[from];
    say("  レシピキー  " + from + "  →  " + to);
  });

  // 6) 新商品を登録
  say("\n-- 新商品登録 --");
  RECON_NEW_PRODUCTS_2026.forEach(function (row) {
    var sqid = row[0], name = row[1], price = row[2], kind = row[3];
    if (productBySquareId_(b, sqid) || productByName_(b, name)) { say("  SKIP (既存): " + name); return; }
    b.products.push({
      id: name, name: name, price: price, kind: kind,
      squareCatalogId: sqid, squareCatalogVersion: "",
      procedure: "", baseItemId: "", active: true, category: ""
    });
    say("  追加  " + name + "  (¥" + price + " / " + kind + " / レシピ未設定)");
  });

  // 7) 商品名の重複を統合
  say("\n-- 商品行の重複統合 --");
  reconcileDedupeProductsByName_(b, say);

  // 8) 参照先が存在しないレシピキーを報告(削除はしない)
  say("\n-- 参照孤立レシピの検出(手動確認用・変更なし) --");
  var pset = {}; b.products.forEach(function (p) { pset[p.name] = true; });
  var sbset = {}; Object.keys(b.setBreakdowns).forEach(function (k) { sbset[k] = true; });
  Object.keys(b.recipes).forEach(function (k) {
    if (!pset[k] && !sbset[k]) {
      var r = b.recipes[k];
      var n = (r.ingredients || []).length + (r.packaging || []).length;
      say("  孤立レシピ: " + k + "  (材料" + n + "件)" + (n === 0 ? "  ← 空。削除候補" : ""));
    }
  });

  if (apply) {
    reconcileSaveBundle_(b);
    say("\n=== 保存しました。アプリをハードリロードしてください。 ===");
  } else {
    say("\n=== ドライラン終了。内容に問題なければ migrationApply() を実行。 ===");
  }
  return log.join("\n");
}

// ============================================================
//  共有ヘルパ (syncCatalogFromSquareById も使う)
// ============================================================

function reconcileLoadBundle_() {
  return {
    products: getProducts_(),
    recipes: getRecipes_(),
    setBreakdowns: getSetBreakdowns_(),
    aliases: getProductAliases_(),
    packagingExemptions: getPackagingExemptions_(),
    saleOverrides: getSaleOverrides_()
  };
}

function reconcileSaveBundle_(b) {
  saveProducts_(b.products);
  saveRecipes_(b.recipes);
  saveSetBreakdowns_(b.setBreakdowns);
  saveProductAliases_(b.aliases);
  savePackagingExemptions_(b.packagingExemptions);
  saveSaleOverrides_(b.saleOverrides);
}

function productByName_(b, name) {
  for (var i = 0; i < b.products.length; i++) if (b.products[i].name === name) return b.products[i];
  return null;
}
function productBySquareId_(b, sqid) {
  if (!sqid) return null;
  for (var i = 0; i < b.products.length; i++) if (b.products[i].squareCatalogId === sqid) return b.products[i];
  return null;
}

// oldName を使っている箇所を全部 newName に書き換える(商品行・レシピ・セット内訳・エイリアス・
// 包材免除・売上個別修正)。商品マスターは id === name なので id も一緒に更新する。
function reconcileRenameEverywhere_(b, oldName, newName, say) {
  if (!oldName || !newName || oldName === newName) return;

  b.products.forEach(function (p) {
    if (p.name === oldName) { p.name = newName; p.id = newName; }
  });

  if (b.recipes[oldName] !== undefined) {
    b.recipes[newName] = reconcileMergeRecipe_(b.recipes[newName], b.recipes[oldName]);
    delete b.recipes[oldName];
    if (say) say("    レシピ移管: " + oldName + " → " + newName);
  }

  if (b.setBreakdowns[oldName] !== undefined) {
    b.setBreakdowns[newName] = reconcileMergeSbRows_(b.setBreakdowns[newName], b.setBreakdowns[oldName]);
    delete b.setBreakdowns[oldName];
    if (say) say("    セット内訳キー移管: " + oldName + " → " + newName);
  }
  Object.keys(b.setBreakdowns).forEach(function (k) {
    b.setBreakdowns[k].forEach(function (rw) {
      if (rw.kind === "component" && rw.refId === oldName) rw.refId = newName;
    });
  });

  Object.keys(b.aliases).forEach(function (k) {
    if (b.aliases[k] === oldName) b.aliases[k] = newName;
  });

  b.packagingExemptions = b.packagingExemptions.map(function (x) { return x === oldName ? newName : x; });

  Object.keys(b.saleOverrides).forEach(function (k) {
    if (b.saleOverrides[k].productId === oldName) b.saleOverrides[k].productId = newName;
  });
}

// セット内訳のキー(セット商品名)だけを付け替え、同一内容の行(区分+構成商品名)は1つに寄せる
function reconcileRenameSetKey_(b, fromKey, toKey, say) {
  if (!b.setBreakdowns[fromKey]) return;
  b.setBreakdowns[toKey] = reconcileMergeSbRows_(b.setBreakdowns[toKey], b.setBreakdowns[fromKey]);
  delete b.setBreakdowns[fromKey];
  if (say) say("  セット内訳  " + fromKey + "  →  " + toKey + "  (重複行は統合)");
}

function reconcileMergeRecipe_(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  var ec = (existing.ingredients || []).length + (existing.packaging || []).length;
  var ic = (incoming.ingredients || []).length + (incoming.packaging || []).length;
  return ic > ec ? incoming : existing; // 中身が多い方を採用
}

function reconcileMergeSbRows_(a, b) {
  var out = [];
  var seen = {};
  (a || []).concat(b || []).forEach(function (rw) {
    var key = rw.kind + "|" + rw.refId;
    if (seen[key]) return;
    seen[key] = true;
    out.push(rw);
  });
  return out;
}

function reconcileDedupeProductsByName_(b, say) {
  var seen = {};
  var kept = [];
  b.products.forEach(function (p) {
    var w = seen[p.name];
    if (!w) { seen[p.name] = p; kept.push(p); return; }
    // 勝者選定: squareCatalogId があるものを優先、無ければ既存を残す
    var winner = w;
    if (!w.squareCatalogId && p.squareCatalogId) winner = p;
    if (winner !== w) {
      kept[kept.indexOf(w)] = p;
      seen[p.name] = p;
    }
    if (say) say("  重複統合: " + p.name + "  (1行に集約)");
  });
  b.products = kept;
}

function reconcileBackupSheets_() {
  var ss = SpreadsheetApp.openById(KAMO_SPREADSHEET_ID);
  var stamp = Utilities.formatDate(new Date(), "Asia/Tokyo", "MMdd_HHmm");
  ["商品マスター_原価管理", "レシピ", "セット内訳マスタ", "商品名エイリアス", "包材費0円チェック除外", "売上個別修正"].forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    var copy = sh.copyTo(ss);
    copy.setName((name + "_bk" + stamp).slice(0, 100));
  });
  Logger.log("バックアップ完了: *_bk" + stamp);
}

// ============================================================
//  新: syncCatalogFromSquare を squareCatalogId 突合の upsert に置き換える版
//  Code.gs の case "syncCatalogFromSquare" からこれを呼ぶこと。
//  名前が変わっていれば従属データも連動して直す(reconcileRenameEverywhere_)。
// ============================================================
function syncCatalogFromSquareById() {
  try {
    var catalogRows = getCatalogReadOnly_(); // [{squareCatalogId, name, price}]
    var b = reconcileLoadBundle_();

    var renamed = 0, priced = 0, inserted = 0;
    catalogRows.forEach(function (row) {
      if (!row.squareCatalogId) return;
      var p = productBySquareId_(b, row.squareCatalogId);
      if (!p) p = productByName_(b, row.name); // 初回など squareCatalogId 未設定の行を拾う

      if (p) {
        if (p.name !== row.name) {
          reconcileRenameEverywhere_(b, p.name, row.name, null);
          renamed++;
        }
        if (Number(p.price) !== Number(row.price)) { p.price = row.price; priced++; }
        p.squareCatalogId = row.squareCatalogId;
      } else {
        b.products.push({
          id: row.name, name: row.name, price: row.price, kind: "single",
          squareCatalogId: row.squareCatalogId, squareCatalogVersion: "",
          procedure: "", baseItemId: "", active: true, category: ""
        });
        inserted++;
      }
    });

    reconcileDedupeProductsByName_(b, null);
    reconcileSaveBundle_(b);
    appendSyncLog_("catalogSync", "success", "改名" + renamed + "・価格更新" + priced + "・新規" + inserted);
    return { products: b.products, squareSyncLog: getSquareSyncLog_(20) };
  } catch (ex) {
    appendSyncLog_("catalogSync", "error", String(ex));
    throw ex;
  }
}
