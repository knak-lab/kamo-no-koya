// =============================================================
//  カモの小屋 収益分析アプリ — GAS Web App エントリポイント
//
//  API: doGet/doPost の2エンドポイントのみ。
//    GET ?code=... (state付き)  → BASE OAuth認可コールバック(base-sync.gs参照。
//        BASE側からのリダイレクトのためtoken認証は通さない)
//    GET ?action=debugHeaders → 実データ9シートの生ヘッダー行を返す(読み取り専用。
//        シートの作成・変更は一切行わない)
//    GET ?action=komechalleExport&since=YYYY-MM-DD → 米チャレ！向けの商品と売上(読み取り専用。
//        Komechalle.gs参照)
//    GET (それ以外)            → getAll_() の内容を返す
//    POST → body.action で分岐 ("saveAll" / "saveTodos" / "syncCatalogFromSquare" /
//        "recalcZeroCostSales" / "syncSalesFromSquare" / "syncProductsToBase" / "syncOrdersFromBase" /
//        "addManualSales" / "saveTodoVisual" / "saveAppIcon" /
//        "addBizPlanFile" / "removeBizPlanFile" / "removeBizPlanItem" /
//        "addSummaryImage" / "removeSummaryImage")
//
//  CORSはブラウザのプリフライト(OPTIONS)を回避するため、フロント側の
//  fetchはContent-Type: text/plain;charset=utf-8 でJSON文字列を送る。
//  (Content-Typeをapplication/jsonにするとプリフライトが走りGASでは失敗する)
//
//  認証(Auth.gs):
//    ・ブラウザから: GoogleログインのIDトークン(id_token)。許可メールのみ通す
//    ・他のGASから(米チャレの収支取り込み等): スクリプトプロパティ SERVICE_TOKEN と
//      一致する token。32文字以上のときだけ有効。フロントのJSには絶対に入れないこと
//    どちらも無ければ拒否する(以前の「API_TOKEN未設定なら誰でも可」は廃止)
// =============================================================

function isServiceToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty("SERVICE_TOKEN");
  if (!expected || expected.length < 32) return false;
  return typeof token === "string" && token === expected;
}

function isAuthorized_(params) {
  if (!params) return false;
  return Boolean(verifyIdToken_(params.id_token)) || isServiceToken_(params.token);
}

function doGet(e) {
  // BASEのOAuth認可リダイレクトはこのURLへcode付きで返ってくる(ログイン認証は通さない。
  // 認可コードそのものと、後続のclient_secretでのトークン交換・stateチェックが
  // このリクエストの正当性の担保になる。詳細はbase-sync.gs参照)
  if (e.parameter.code) return handleBaseOAuthCallback_(e);
  if (!isAuthorized_(e.parameter)) return err_("Unauthorized: " + authFailReason_());
  try {
    if (e.parameter.action === "debugHeaders") {
      return ok_({ headers: debugGetRawHeaders_() });
    }
    if (e.parameter.action === "komechalleExport") {
      return ok_(komechalleExport_(e.parameter.since));
    }
    return ok_(getAll_());
  } catch (ex) {
    return err_(String(ex));
  }
}

// 書き込み系アクションはスプレッドシート全体で1件ずつ直列化する(同時書き込みによる
// 競合・GAS側の詰まりを防ぐため)。ロックが取れない場合は待たずにエラーを返す
// (待たせ続けて同時実行数を圧迫し続けるより、クライアント側の再試行に委ねる)。
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(20000)) {
      return err_("サーバーが混み合っています。しばらくしてからもう一度お試しください。");
    }
  } catch (ex) {
    return err_(String(ex));
  }
  try {
    const body = JSON.parse(e.postData.contents);
    if (!isAuthorized_(body)) return err_("Unauthorized: " + authFailReason_());
    switch (body.action) {
      case "saveAll":
        return ok_(saveAll_(body));
      case "saveTodos":
        return ok_(saveTodosAndSubtasks_(body));
      case "syncCatalogFromSquare":
        return ok_(syncCatalogFromSquareById()); // 旧: syncCatalogFromSquare() 名前マッチ版。CatalogReconcile_20260906.gs の squareCatalogId 突合版に置換
      case "recalcZeroCostSales":
        return ok_(recalcZeroCostSales());
      case "syncSalesFromSquare":
        return ok_(syncSalesFromSquare());
      case "addManualSales":
        return ok_(addManualSales_(body.date, body.items));
      case "syncProductsToBase":
        return ok_(syncProductsToBase());
      case "syncOrdersFromBase":
        return ok_(syncOrdersFromBase());
      case "saveTodoVisual":
        return ok_(saveTodoVisual_(body.dataUrl));
      case "saveAppIcon":
        return ok_(saveAppIcon_(body.dataUrl));
      case "addBizPlanFile":
        return ok_(addBizPlanFile_(body.itemId, body.kind, body.fileName, body.mimeType, body.dataUrl));
      case "removeBizPlanFile":
        return ok_(removeBizPlanFile_(body.fileId));
      case "removeBizPlanItem":
        return ok_(removeBizPlanItem_(body.itemId));
      case "addSummaryImage":
        return ok_(addSummaryImage_(body.fileName, body.dataUrl));
      case "removeSummaryImage":
        return ok_(removeSummaryImage_(body.imageId));
      default:
        return err_("Unknown action: " + body.action);
    }
  } catch (ex) {
    return err_(String(ex));
  } finally {
    lock.releaseLock();
  }
}

function ok_(data) {
  return ContentService.createTextOutput(JSON.stringify(Object.assign({ ok: true }, data))).setMimeType(ContentService.MimeType.JSON);
}

function err_(message) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: message })).setMimeType(ContentService.MimeType.JSON);
}