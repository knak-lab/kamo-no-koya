// ============================================================
// カモの小屋 × BASE(ネットショップ) API連携
//
// 認証: OAuth2.0(認可コード方式)。client_id/client_secretはBASE開発者登録で
// 発行済みのものをスクリプトプロパティ BASE_CLIENT_ID / BASE_CLIENT_SECRET に
// 保存済み(Square同様、絶対にコードへ直書きしない)。
//
// 認可の流れ(初回のみ・手動):
//   1. Apps Scriptエディタで baseGetAuthorizeUrl() を実行し、ログに出るURLを開く
//   2. BASEにログインして認可する → このWebアプリのURL(doGet)にcode付きでリダイレクトされる
//   3. doGet(e) がcodeを検知し、アクセストークンを取得してスクリプトプロパティに保存する
//      (BASE_ACCESS_TOKEN / BASE_REFRESH_TOKEN)
//
// 以降のAPI呼び出しはbaseGet_/basePost_がアクセストークンを使い、401(期限切れ)なら
// 自動的にrefresh_tokenで再取得してから1回だけ再試行する。
//
// 注意: BASE API の実際のレスポンス項目名(特に注文取得の日時フィールド名等)は
// 実データで最終確認が必要。動作確認時にズレがあれば syncOrdersFromBase 側の
// フィールド名を実データに合わせて調整すること。
// ============================================================

const BASE_API_ORIGIN = "https://api.thebase.in";
// BASE Developersでコールバック(redirect_uri)として登録するURL = 本番Web AppのexecURL固定値。
// デプロイIDを変える(新規デプロイを切る)場合はここも合わせて更新し、BASE側の登録も直すこと。
const BASE_REDIRECT_URI = "https://script.google.com/macros/s/AKfycbz5MJbnzaZoO_BJLuiheDHs-HjoOtekXtX0C9IVIvKN1yekEdxjbSMv0nXemedapJy1/exec";
const BASE_PRICE_MIN = 50;
const BASE_PRICE_MAX = 500000;

function getBaseClientId_() {
  const v = PropertiesService.getScriptProperties().getProperty("BASE_CLIENT_ID");
  if (!v) throw new Error("スクリプトプロパティ BASE_CLIENT_ID が未設定です");
  return v;
}

function getBaseClientSecret_() {
  const v = PropertiesService.getScriptProperties().getProperty("BASE_CLIENT_SECRET");
  if (!v) throw new Error("スクリプトプロパティ BASE_CLIENT_SECRET が未設定です");
  return v;
}

function getBaseAccessToken_() {
  const v = PropertiesService.getScriptProperties().getProperty("BASE_ACCESS_TOKEN");
  if (!v) throw new Error("スクリプトプロパティ BASE_ACCESS_TOKEN が未設定です(BASE連携の認可が未実施です。baseGetAuthorizeUrl()を参照)");
  return v;
}

function getBaseRefreshToken_() {
  const v = PropertiesService.getScriptProperties().getProperty("BASE_REFRESH_TOKEN");
  if (!v) throw new Error("スクリプトプロパティ BASE_REFRESH_TOKEN が未設定です(BASE連携の認可が未実施です)");
  return v;
}

// ─────────────────────────────────────────
//  OAuth認可フロー
// ─────────────────────────────────────────

// Apps Scriptエディタから手動で一度だけ実行する。ログに出たURLをブラウザで開いて認可する。
function baseGetAuthorizeUrl() {
  const state = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty("BASE_OAUTH_STATE", state);
  const params = {
    response_type: "code",
    client_id: getBaseClientId_(),
    scope: "read_items write_items read_orders",
    redirect_uri: BASE_REDIRECT_URI,
    state: state,
  };
  const qs = Object.keys(params).map(function (k) { return k + "=" + encodeURIComponent(params[k]); }).join("&");
  const url = BASE_API_ORIGIN + "/1/oauth/authorize?" + qs;
  Logger.log("以下のURLをブラウザで開いて認可してください:\n" + url);
  return url;
}

// doGet(e) から e.parameter.code がある場合に呼ばれる(Code.gs参照)
function handleBaseOAuthCallback_(e) {
  try {
    const expectedState = PropertiesService.getScriptProperties().getProperty("BASE_OAUTH_STATE");
    if (!expectedState || e.parameter.state !== expectedState) {
      return HtmlService.createHtmlOutput("認可エラー: state不一致です。Apps Scriptエディタで baseGetAuthorizeUrl() を再実行してやり直してください。");
    }
    PropertiesService.getScriptProperties().deleteProperty("BASE_OAUTH_STATE");

    const token = baseExchangeCodeForToken_(e.parameter.code);
    const props = PropertiesService.getScriptProperties();
    props.setProperty("BASE_ACCESS_TOKEN", token.access_token);
    props.setProperty("BASE_REFRESH_TOKEN", token.refresh_token);
    appendSyncLog_("baseOAuth", "success", "認可・トークン取得が完了しました");
    return HtmlService.createHtmlOutput("<p>BASE連携の認可が完了しました。このタブは閉じて構いません。</p>");
  } catch (ex) {
    appendSyncLog_("baseOAuth", "error", String(ex));
    return HtmlService.createHtmlOutput("<p>認可エラー: " + String(ex) + "</p>");
  }
}

function baseExchangeCodeForToken_(code) {
  const payload = {
    grant_type: "authorization_code",
    client_id: getBaseClientId_(),
    client_secret: getBaseClientSecret_(),
    code: code,
    redirect_uri: BASE_REDIRECT_URI,
  };
  const res = UrlFetchApp.fetch(BASE_API_ORIGIN + "/1/oauth/token", {
    method: "post",
    payload: payload,
    muteHttpExceptions: true,
  });
  const code_ = res.getResponseCode();
  const json = JSON.parse(res.getContentText());
  if (code_ < 200 || code_ >= 300 || json.error) {
    throw new Error("BASE token取得エラー(" + code_ + "): " + JSON.stringify(json));
  }
  return json; // { access_token, refresh_token, expires_in, ... }
}

function baseRefreshAccessToken_() {
  const payload = {
    grant_type: "refresh_token",
    client_id: getBaseClientId_(),
    client_secret: getBaseClientSecret_(),
    refresh_token: getBaseRefreshToken_(),
  };
  const res = UrlFetchApp.fetch(BASE_API_ORIGIN + "/1/oauth/token", {
    method: "post",
    payload: payload,
    muteHttpExceptions: true,
  });
  const code_ = res.getResponseCode();
  const json = JSON.parse(res.getContentText());
  if (code_ < 200 || code_ >= 300 || json.error) {
    throw new Error("BASE tokenリフレッシュエラー(" + code_ + "): " + JSON.stringify(json));
  }
  const props = PropertiesService.getScriptProperties();
  props.setProperty("BASE_ACCESS_TOKEN", json.access_token);
  if (json.refresh_token) props.setProperty("BASE_REFRESH_TOKEN", json.refresh_token);
  return json;
}

// ─────────────────────────────────────────
//  BASE API 汎用ヘルパー(401なら1回だけrefreshして再試行)
// ─────────────────────────────────────────

function baseRequest_(method, path, params) {
  const attempt = function (token) {
    const options = {
      method: method,
      headers: { "Authorization": "Bearer " + token },
      muteHttpExceptions: true,
    };
    let url = BASE_API_ORIGIN + path;
    if (params) {
      if (method === "get") {
        const qs = Object.keys(params).map(function (k) { return k + "=" + encodeURIComponent(params[k]); }).join("&");
        url += (url.indexOf("?") >= 0 ? "&" : "?") + qs;
      } else {
        options.payload = params;
      }
    }
    return UrlFetchApp.fetch(url, options);
  };

  let res = attempt(getBaseAccessToken_());
  if (res.getResponseCode() === 401) {
    baseRefreshAccessToken_();
    res = attempt(getBaseAccessToken_());
  }
  const code = res.getResponseCode();
  const json = JSON.parse(res.getContentText());
  if (code < 200 || code >= 300 || json.error) {
    throw new Error("BASE APIエラー(" + code + " " + path + "): " + JSON.stringify(json.error || json));
  }
  return json;
}

function baseGet_(path, params) { return baseRequest_("get", path, params); }
function basePost_(path, params) { return baseRequest_("post", path, params); }

// 手動テスト用(認可完了後、一度実行して疎通確認)
function testBaseConnection() {
  const res = baseGet_("/1/users/me");
  Logger.log("✅ BASE接続確認: " + JSON.stringify(res));
  return res;
}

// ─────────────────────────────────────────
//  商品マスタ連携(アプリ → BASE)
// ─────────────────────────────────────────

function syncProductsToBase() {
  try {
    const products = getProducts_();
    let updated = 0, inserted = 0, skipped = 0;
    const errors = [];

    products.forEach(function (p) {
      const price = Number(p.price) || 0;
      if (price < BASE_PRICE_MIN || price > BASE_PRICE_MAX) {
        skipped++;
        errors.push(p.name + ": 価格が範囲外(" + price + "円、" + BASE_PRICE_MIN + "〜" + BASE_PRICE_MAX + "円のみ)のためスキップ");
        return;
      }
      try {
        if (p.baseItemId) {
          basePost_("/1/items/edit", {
            item_id: p.baseItemId,
            title: p.name,
            price: price,
          });
          updated++;
        } else {
          const res = basePost_("/1/items/add", {
            title: p.name,
            price: price,
            visible: 0, // CSV一括登録時と同様、まずは非公開で登録(公開はBASE管理画面でユーザーが行う)
          });
          const newId = res.item_id || (res.item && res.item.item_id) || (res.items && res.items[0] && res.items[0].item_id);
          if (!newId) throw new Error("item_idが取得できませんでした: " + JSON.stringify(res));
          p.baseItemId = String(newId);
          inserted++;
        }
      } catch (ex) {
        errors.push(p.name + ": " + String(ex));
      }
    });

    saveProducts_(products); // baseItemIdの書き戻しを含め全洗い替え保存
    const summary = "更新" + updated + "件・新規" + inserted + "件・skip" + skipped + "件";
    appendSyncLog_("baseProductSync", errors.length ? "error" : "success", summary + (errors.length ? (" / " + errors.join("; ")) : ""));
    return { updated: updated, inserted: inserted, skipped: skipped, errors: errors, products: products, squareSyncLog: getSquareSyncLog_(20) };
  } catch (ex) {
    appendSyncLog_("baseProductSync", "error", String(ex));
    throw ex;
  }
}

// ─────────────────────────────────────────
//  注文データ連携(BASE → アプリ、売上_Squareシートへチャネル"BASE"で統合)
// ─────────────────────────────────────────

function baseOrderDateStr_(raw) {
  if (!raw) return "";
  if (typeof raw === "number" || /^\d+$/.test(String(raw))) {
    return Utilities.formatDate(new Date(Number(raw) * 1000), "Asia/Tokyo", "yyyy-MM-dd");
  }
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[0] : String(raw).slice(0, 10);
}

function syncOrdersFromBase() {
  try {
    let sheet = getSalesSheetReadOnly_();
    if (!sheet) {
      sheet = getSs_().insertSheet(SALES_SHEET_NAME);
      sheet.appendRow(["id", "日付", "商品名", "数量", "金額(円)", "支払方法", "取得日時"]);
      sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#c8956c").setFontColor("#ffffff");
    }
    const channelCol = ensureSalesChannelColumn_(sheet);

    const existing = new Set();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 1).getValues().forEach(function (r) { existing.add(r[0]); });
    }

    const newRows = [];
    const limit = 100;
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const res = baseGet_("/1/orders", { limit: limit, offset: offset, order: "desc" });
      const orders = res.orders || [];
      orders.forEach(function (order) {
        const dateStr = baseOrderDateStr_(order.ordered || order.dispatch_date || order.created);
        const paidStatus = order.paid_status || "";
        (order.deliveries || []).forEach(function (delivery) {
          (delivery.items || []).forEach(function (item) {
            const uid = "base_" + order.order_id + "_" + (item.item_id || item.title);
            if (existing.has(uid)) return;
            const qty = Number(item.amount) || 1;
            const unitPrice = Number(item.price) || 0;
            newRows.push([
              uid,
              dateStr,
              item.title || "不明",
              qty,
              unitPrice * qty,
              paidStatus,
              new Date().toLocaleString("ja-JP"),
            ]);
            existing.add(uid);
          });
        });
      });
      hasMore = orders.length === limit;
      offset += limit;
      if (offset > 5000) break; // 安全弁(想定外の無限ループ防止)
    }

    if (newRows.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, newRows.length, 7).setValues(newRows);
      sheet.getRange(startRow, channelCol, newRows.length, 1).setValues(newRows.map(function () { return ["BASE"]; }));
      stampCostSnapshot(); // 取り込んだ直後に原価もスタンプ(Square側のsyncSalesFromSquareと同じ挙動)
    }

    appendSyncLog_("baseSalesSync", "success", newRows.length + "件取込");
    return { inserted: newRows.length, squareSyncLog: getSquareSyncLog_(20) };
  } catch (ex) {
    appendSyncLog_("baseSalesSync", "error", String(ex));
    throw ex;
  }
}
