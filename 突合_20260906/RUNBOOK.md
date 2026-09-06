# カタログ突合・一括修正 手順書 (2026-09-06)

Square側の商品名一括変更に、`商品マスター_原価管理`（アプリ側）が追従できていない問題の修正。
`squareCatalogId`（＝SquareのバリエーションID）で商品を確実に特定し、名前をSquare名で上書きし、
レシピ／セット内訳／エイリアス／包材免除／売上個別修正 の参照も連動して直す。

決定事項（ユーザー確認済み）:
- アプリ名を **Square名で上書き**
- `麹カルピス`（バラ）→ `麹カルピス / 定価` に統合
- `レモンボールクッキー 3個` に名前統一
- 新商品2件（ブルーベリークランブル／ほうじ茶キューブ）を今登録

---

## 変更ファイル

| ファイル | 変更 |
|---|---|
| `gas/CatalogReconcile_20260906.gs` | **新規**。一括修正スクリプト＋`syncCatalogFromSquareById()` |
| `gas/Code.gs` | 1行。`case "syncCatalogFromSquare"` の呼び先を `syncCatalogFromSquareById()` に変更 |
| `gas/existing-sync.gs` | （任意・後回し可）`syncOrders` に `catalog_object_id` 取り込みを追加 → 末尾の「フェーズ1c」参照 |

`CostSnapshot.gs` の旧 `syncCatalogFromSquare()` はもう呼ばれない（消さなくてよい）。

---

## 手順

### 0. 事前

- Apps Scriptエディタを開く（スプレッドシート → 拡張機能 → Apps Script）
- **スプレッドシートを1部コピーしておく**（ファイル → コピーを作成）。スクリプトも自動でバックアップを取るが念のため。

### 1. コードを貼る

1. エディタで「＋」→ スクリプト → 名前 `CatalogReconcile_20260906` → `gas/CatalogReconcile_20260906.gs` の中身を全部貼る
2. `Code.gs` の該当1行を差し替え（`syncCatalogFromSquare()` → `syncCatalogFromSquareById()`）
3. 保存（Ctrl+S）

### 2. ドライラン（書き込みなし）

1. 関数プルダウンで **`migrationDryRun`** を選択 → 実行（初回は権限承認）
2. 実行ログ（表示 → ログ / Ctrl+Enter）を確認する。見るポイント:
   - `改名` が28件ぶん出ているか（`SKIP` が多い場合は既に一部直っている or 名前が想定と違う）
   - `統合: 麹カルピス` `統合: レモンボールクッキー 3個` `ゴミ削除` `新商品登録` が想定どおりか
   - `レシピキー修正(旧々名)` の3件（かき氷系）… **これは推測を含む**。違うと思ったら `CatalogReconcile_20260906.gs` の `RECON_RECIPE_KEY_RENAME_2026` から該当行を消す
   - `孤立レシピの検出` … `ZZテスト...` `クロワッサン` `カモの小屋` など。**このスクリプトは消さない**。気になれば後で手動削除

### 3. 適用

1. ログに問題がなければ、関数プルダウンで **`migrationApply`** を選択 → 実行
2. `商品マスター_原価管理_bkMMDD_HHMM` 等のバックアップシートが6枚できる
3. 実行ログで最終結果を確認

### 4. アプリ側の反映確認

1. アプリを **ハードリロード**（Service Workerのキャッシュ対策。スーパーリロード or 一度PWAを閉じて再起動）
2. マスタタブで商品名がSquare名になっているか、レシピ・セット内訳が壊れていないか確認
3. サマリ／ヌケモレチェックで「不明」「原価0」が増えていないか確認
   - 過去の売上行（旧名）は `商品名エイリアス` で吸収済み。改名でエイリアスの参照先も張り替えたので、基本ズレないはず
   - 残るズレはヌケモレチェックの該当行で個別対応（`突合_02` `突合_04` 参照）

### 5. 後片付け

- 問題なければ数日後に `*_bkMMDD_HHMM` シートを削除
- `セット内訳マスタ` に空行が数行残る（削除した内訳IDの跡）。読み取り時に無視されるので害はないが、気になれば手動削除

---

## ⚠️ 注意

- **旧「Square連携」ボタンは名前マッチだった**。今回 `Code.gs` を差し替えたので、以後は `squareCatalogId` 突合の upsert（`syncCatalogFromSquareById`）が動く。Squareで改名しても、既存商品の名前が更新されるだけでフォーク複製は起きない（名前変更時はレシピ等の参照も連動して直る）。
- 差し替えを **デプロイに反映**するには、デプロイ → デプロイを管理 → 鉛筆 → バージョン「新バージョン」→ デプロイ（`clasp push` だけでは本番URLに反映されない）。
- migration系関数（`migrationDryRun` / `migrationApply`）はWebアプリのAPIには公開していない。エディタから手動実行のみ。

---

## フェーズ1c（任意・後回し可）: 売上に `catalog_object_id` を取り込む

将来の売上を名前ではなくIDで商品に結合できるようにする（`商品名エイリアス` が将来分は不要になる）。
`gas/existing-sync.gs` の `syncOrders()` を次のように変更:

```js
function syncOrders() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet   = ss.getSheetByName("売上_Square");
  if (!sheet) { /* ...既存のまま... */ }
  const channelCol = ensureSalesChannelColumn_(sheet);
  const variationCol = ensureSalesVariationColumn_(sheet); // ★追加

  // ...既存の existing / begin / cursor ...

    orders.forEach(order => {
      const orderDate = order.created_at ? order.created_at.slice(0,10) : "";
      const payment   = order.tenders?.[0]?.type || "不明";
      (order.line_items || []).forEach(item => {
        const uid = order.id + "_" + (item.uid || item.name);
        if (existing.has(uid)) return;
        const qty    = Number(item.quantity) || 1;
        const amount = item.total_money ? Math.round(item.total_money.amount / 1) : 0;
        newRows.push([
          uid, orderDate, item.name || "不明", qty, amount, payment,
          new Date().toLocaleString("ja-JP"),
          item.catalog_object_id || ""   // ★追加(7列目の後ろ。実際の書き込み位置はvariationColで指定)
        ]);
        existing.add(uid);
      });
    });
  } while (cursor);

  if (newRows.length > 0) {
    const startRow = sheet.getLastRow()+1;
    sheet.getRange(startRow, 1, newRows.length, 7).setValues(newRows.map(r => r.slice(0,7)));
    sheet.getRange(startRow, channelCol,   newRows.length, 1).setValues(newRows.map(() => ["Square"]));
    sheet.getRange(startRow, variationCol, newRows.length, 1).setValues(newRows.map(r => [r[7]])); // ★追加
    Logger.log(`売上 ${newRows.length}件 追加`);
  }
}

// ★追加: ensureSalesChannelColumn_ の隣に
function ensureSalesVariationColumn_(sheet) {
  const lastCol = sheet.getLastColumn();
  const headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  const idx = headers.indexOf("squareVariationId");
  if (idx >= 0) return idx + 1;
  const col = lastCol + 1;
  sheet.getRange(1, col).setValue("squareVariationId");
  return col;
}
```

その後、`getSales_()`（Sheets.gs）で `squareVariationId` 列を読み、`stampCostSnapshot` / 売上→商品の突合を
「まずID、無ければ名前＋エイリアス」に変更する。これはフェーズ2（productId化）の一部として実施するのが自然。
