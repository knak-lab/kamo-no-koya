export const yen = (n) => `¥${Math.round(n || 0).toLocaleString()}`;
export const pct = (n) => `${((n || 0) * 100).toFixed(1)}%`;
export const uid = () => Math.random().toString(36).slice(2, 9);
export const yearMonthOf = (dateStr) => {
  if (!dateStr) return "";
  const [y, m] = dateStr.split("-");
  return `${y}/${m}`;
};

export const RAW = "原材料";
export const PACK = "梱包・資材";
export const UNITS = ["g", "個"];

export const RAW_MATERIAL_ITEM = "原材料・資材仕入";
// 経費入力の「項目」候補のうち、時間単価(経費マスタ)に連動しない固定カテゴリ。
// 時間単価の項目は経費マスタ(expenseRates)のキーとして動的に管理される。
export const FIXED_EXPENSE_ITEMS = [RAW_MATERIAL_ITEM, "備品・消耗品費", "その他固定費"];
export const COLOR_POSITIVE = "#2563eb"; // 黒字(青)
export const COLOR_NEGATIVE = "#dc2626"; // 赤字(赤)

export const TODO_CATEGORIES = ["たくらみ", "みせづくり", "汗かき", "経営・管理"];
export const TODO_STATUSES = ["未着手", "完了"];
export const STAFF_OPTIONS = ["さっとん", "ひさし", "あっこ", "かける", "りょーすけ", "もえ"];

// 前半(サマリ・カレンダー・todo)は日々の確認・記録、中盤(入力・マスタ)は
// データの登録・編集、設定は管理者向けという性格の違いがあるため、サイドバー上で
// 見た目のグループを分ける。groupの値が変わる箇所の直前に区切り線を入れる(Sidebar.jsx参照)。
export const TABS = [
  { key: "management", label: "サマリ", group: 1 },
  { key: "calendar", label: "カレンダー", group: 1 },
  { key: "todo", label: "todo", group: 1 },
  { key: "input", label: "入力", group: 2 },
  { key: "master", label: "マスタ", group: 2 },
  { key: "settings", label: "設定", group: 3 },
];

export const METRIC_LABEL = { sales: "売上", profit: "営業利益" };
export const METRIC_DAILY_FIELD = { sales: "売上_日次", profit: "営業利益_管理_日次" };
