// =============================================================
//  このアプリ用の設定（金庫・ログイン画面）
//  vault.js / googleAuth.js / AuthGate.jsx はお金ちゃんと共通の部品。アプリごとの違いはここだけに書く
// =============================================================

export const APP_ID = 'kamo-no-koya'           // 金庫の名前（IndexedDB）と暗号鍵の区別に使う。変えると保存データが読めなくなる
export const DATA_LABEL = 'カモの小屋のデータ'   // 指紋・顔認証の登録画面の説明に使う
export const ACCENT_COLOR = '#b45309'

// 登録されたアカウントかをサーバー（GAS）で確かめる。通らなければ googleAuth がログイン画面に戻す
// （api/gas.js は googleAuth.js を読み込むので、循環しないよう呼ぶときに読み込む）
export const verifyAccess = () => import('../api/gas').then((m) => m.gasApi.getAll())

// 以前のバージョンが平文で localStorage に置いていたデータを、金庫（暗号化）へ移して消す
export const DATA_CACHE_KEY = 'cache:data'
const LEGACY_DATA_CACHE_KEY = 'kamo-app-data-cache-v1'

export async function migrateLegacyStorage() {
  const { vaultSet } = await import('./vault')
  try {
    const raw = localStorage.getItem(LEGACY_DATA_CACHE_KEY)
    if (raw) {
      try { vaultSet(DATA_CACHE_KEY, JSON.parse(raw)) } catch { /* 壊れていたら移さずに消す */ }
      localStorage.removeItem(LEGACY_DATA_CACHE_KEY)
    }
  } catch { /* localStorage が使えない環境 */ }
}
