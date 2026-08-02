// =============================================================
//  カモの小屋 収益分析アプリ — GAS Web App エントリポイント
//
//  API: doGet/doPost の2エンドポイントのみ。
//    GET ?action=debugHeaders → 実データ9シートの生ヘッダー行を返す(読み取り専用。
//        シートの作成・変更は一切行わない)
//    GET (それ以外)            → getAll_() の内容を返す
//    POST → body.action で分岐 ("saveAll" / "saveTodos" / "syncCatalogFromSquare" / "recalcZeroCostSales" / "syncSalesFromSquare")
//
//  CORSはブラウザのプリフライト(OPTIONS)を回避するため、フロント側の
//  fetchはContent-Type: text/plain;charset=utf-8 でJSON文字列を送る。
//  (Content-Typeをapplication/jsonにするとプリフライトが走りGASでは失敗する)
//
//  認証: スクリプトプロパティ API_TOKEN を設定した場合のみ、
//  リクエストのtokenパラメータと一致するか検証する(未設定なら誰でもアクセス可)。
// =============================================================

function isAuthorized_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty("API_TOKEN");
  if (!expected) return true;
  return token === expected;
}

function doGet(e) {
  if (!isAuthorized_(e.parameter.token)) return err_("Unauthorized");
  try {
    if (e.parameter.action === "debugHeaders") {
      return ok_({ headers: debugGetRawHeaders_() });
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
    if (!isAuthorized_(body.token)) return err_("Unauthorized");
    switch (body.action) {
      case "saveAll":
        return ok_(saveAll_(body));
      case "saveTodos":
        return ok_(saveTodosAndSubtasks_(body));
      case "syncCatalogFromSquare":
        return ok_(syncCatalogFromSquare());
      case "recalcZeroCostSales":
        return ok_(recalcZeroCostSales());
      case "syncSalesFromSquare":
        return ok_(syncSalesFromSquare());
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