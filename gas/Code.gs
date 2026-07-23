// =============================================================
//  カモの小屋 収益分析アプリ — GAS Web App エントリポイント
//
//  API: doGet/doPost の2エンドポイントのみ。
//    GET  → 常に getAll_() の内容を返す
//    POST → body.action で分岐 ("saveAll" / "syncCatalogFromSquare")
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
    return ok_(getAll_());
  } catch (ex) {
    return err_(String(ex));
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!isAuthorized_(body.token)) return err_("Unauthorized");
    switch (body.action) {
      case "saveAll":
        return ok_(saveAll_(body));
      case "syncCatalogFromSquare":
        return ok_(syncCatalogFromSquare());
      default:
        return err_("Unknown action: " + body.action);
    }
  } catch (ex) {
    return err_(String(ex));
  }
}

function ok_(data) {
  return ContentService.createTextOutput(JSON.stringify(Object.assign({ ok: true }, data))).setMimeType(ContentService.MimeType.JSON);
}

function err_(message) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: message })).setMimeType(ContentService.MimeType.JSON);
}
