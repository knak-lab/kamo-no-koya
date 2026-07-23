# カモの小屋 収益分析アプリ

`設計書.md`(実装用最終版)に基づく、GAS(バックエンド)+ React(フロントエンド)の収益分析アプリ。ロジック・UIの元ネタは `アーティファクト.jsx`(kamo-integrated-v21.jsx)、既存のSquare連携スクリプトは `既存GAS.txt`(= `gas/existing-sync.gs`)。

## 構成

- `gas/existing-sync.gs` — 既存のSquare同期スクリプト。**内容は無変更**。`syncFromSquare`(`syncOrders`+`syncCatalog`)が毎日18時に`売上_Square`・`商品マスター`シートを更新し続ける。
- `gas/Sheets.gs` / `gas/CostSnapshot.gs` / `gas/Code.gs` — 今回追加するバックエンド。新規シートの作成・CRUD・原価スナップショット・Webアプリのエントリポイント。
- `src/` — Reactフロントエンド(Vite + Tailwind)。

新規シートは既存シート(`売上_Square`・`商品マスター`)に対して読み取り専用でアクセスし、書き込みは一切行わない(`売上_Square`の8,9列目`unitCostAtSale`/`costSubtotal`のみ、`stampCostSnapshot`が追記する)。既存の`syncFromSquare`は今まで通り動き続ける。

## GASデプロイ手順(初回のみ)

1. スプレッドシート(既存の収益管理シート、ID: `1qMzUrUaCCI4lTMwQMKVyOeW2F5yDyQEJgqU-B1jAOEY`)を開き、拡張機能 > Apps Script を開く。
2. 既存の `syncFromSquare` 等が入ったスクリプトファイルはそのまま残す(`gas/existing-sync.gs`と同一内容のはず。差分があれば`既存GAS.txt`を正として確認してください)。
3. エディタ上部の「+」から新しいスクリプトファイルを3つ追加し、このリポジトリの `gas/Sheets.gs` / `gas/CostSnapshot.gs` / `gas/Code.gs` の中身をそれぞれ貼り付ける(ファイル名は揃える必要はないが、揃えておくと分かりやすい)。
   - 注意: `gas/Sheets.gs`は既存スクリプトと同じ定数名`SPREADSHEET_ID`を避けて`KAMO_SPREADSHEET_ID`という別名を使っています(同じプロジェクト内で同名の`const`を2箇所で宣言するとスクリプト全体が壊れるため)。値は既存スクリプトと同じスプレッドシートIDです。
4. 関数選択のドロップダウンで `setup` を選び、実行する(初回はアクセス許可を求められるので許可)。
   - 新規シート(商品マスター_原価管理・レシピ・セット内訳・材料・包材マスタ・販売先マスタ・販売形態マスタ・経費マスタ_時間単価・経費・日次設定・月次目標・月次PL予算・設定・TODO・サブタスク・Square同期ログ)が自動生成されます。
   - `stampCostSnapshot`を毎日18:10頃に自動実行するトリガーが登録されます(既存の`syncFromSquare`18:00実行の後に走る想定。触っていません)。
5. (任意)スクリプトプロパティに `API_TOKEN` を設定すると、Web App呼び出し時にトークン一致を要求するようになります(未設定なら誰でもURLを知っていればアクセス可)。
6. デプロイ > 新しいデプロイ > 種類「ウェブアプリ」
   - 実行するユーザー: 自分
   - アクセスできるユーザー: 全員
7. 発行されたウェブアプリのURLを控える → フロント側の `.env.local` に設定する。

## フロントエンド

```bash
npm install
cp .env.example .env.local   # VITE_GAS_URL に手順7のURLを設定、VITE_API_TOKENは設定した場合のみ
npm run dev
```

- `npm run build` — 本番ビルド(`dist/`)
- `npm run deploy` — `gh-pages -d dist`(GitHub Pagesへデプロイ。リポジトリを作成しリモートを設定してから)

### 保存の仕組み

taskmania/okane-chanと同様、編集可能な全データ(材料・商品・レシピ・経費・TODOなど)を1つのstate木として扱い、変更のたびに800msデバウンスして`saveAll`(全洗い替え)でGASに保存します。`売上_Square`由来の`sales`と`販売形態マスタ`は読み取り専用のため保存対象に含まれません。

## 既知の制約・設計判断

- **客数(伝票数)の算出**: 既存の`売上_Square`シートには伝票ID(Square側の`order.id`)を独立した列で保持していません。1列目`id`は`order.id + "_" + (item.uid || item.name)`という結合文字列(`syncOrders()`の実装より)。日次集計の「客数」はこの`id`から最後の`_`区切りを除いた前半を伝票IDとみなして算出しています(Square側のIDにアンダースコアが含まれない前提の推定ロジック)。もしSquare側の仕様変更等でずれた場合は`gas/Sheets.gs`の`getSales_`を見直してください。
- **商品の突き合わせ**: `売上_Square`の「商品名」列と「商品マスター_原価管理」の`name`が完全一致するかで紐付けています。一致しない場合は原価0・商品名そのものを仮IDとして扱います(未登録の商品として原価計算対象外になります)。
- **Square連携フェーズ2(アプリ→Square Catalog upsert)は未実装**です。マスタタブのトグルはUIとしては存在しますが、「アプリ→Square」に切り替えても実際の書き込みは行われません(設計書のフェーズ9・将来対応)。
- `既存GAS.txt`にはSquare Access Tokenが平文で含まれています。取り扱いに注意してください(公開リポジトリにpushしない、必要なら再発行を検討)。
