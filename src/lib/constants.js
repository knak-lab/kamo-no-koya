export const yen = (n) => `¥${Math.round(n || 0).toLocaleString()}`;
export const pct = (n) => `${((n || 0) * 100).toFixed(1)}%`;
export const uid = () => Math.random().toString(36).slice(2, 9);
export const yearMonthOf = (dateStr) => {
  if (!dateStr) return "";
  const [y, m] = dateStr.split("-");
  return `${y}/${m}`;
};

export const RAW = "原材料";
export const PACK = "包材";
export const UNITS = ["g", "個"];

export const EXPENSE_ITEMS = [
  "原材料・資材仕入",
  "店舗利用料(製造・販売)",
  "店舗利用料(製造)",
  "人件費",
  "備品・消耗品費",
  "その他固定費",
];
export const RAW_MATERIAL_ITEM = "原材料・資材仕入";
export const HOURLY_ITEMS = ["店舗利用料(製造・販売)", "店舗利用料(製造)", "人件費"];
export const COLOR_POSITIVE = "#2563eb"; // 黒字(青)
export const COLOR_NEGATIVE = "#dc2626"; // 赤字(赤)

export const TODO_CATEGORIES = ["たくらみ", "みせづくり", "汗かき", "経営・管理"];
export const TODO_STATUSES = ["未着手", "進行中", "完了"];
export const STAFF_OPTIONS = ["さっとん", "ひさし", "あっこ", "かける", "りょーすけ", "もえ"];

export const TABS = [
  { key: "input", label: "入力" },
  { key: "management", label: "サマリ" },
  { key: "financial", label: "PL" },
  { key: "todo", label: "TODO" },
  { key: "master", label: "マスタ" },
];

export const METRIC_LABEL = { sales: "売上", profit: "営業利益" };
export const METRIC_DAILY_FIELD = { sales: "売上_日次", profit: "営業利益_管理_日次" };
