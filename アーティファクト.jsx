import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, ChevronUp, Pencil, PlusCircle, TrendingUp, TrendingDown, Info, Clock } from "lucide-react";
import { BarChart, Bar, Cell, LineChart, Line, ComposedChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

const yen = (n) => `¥${Math.round(n || 0).toLocaleString()}`;
const pct = (n) => `${((n || 0) * 100).toFixed(1)}%`;
const uid = () => Math.random().toString(36).slice(2, 9);
const yearMonthOf = (dateStr) => {
  if (!dateStr) return "";
  const [y, m] = dateStr.split("-");
  return `${y}/${m}`;
};

const RAW = "原材料";
const PACK = "包材";
const UNITS = ["g", "個"];

const EXPENSE_ITEMS = [
  "原材料・資材仕入",
  "店舗利用料(製造・販売)",
  "店舗利用料(製造)",
  "人件費",
  "備品・消耗品費",
  "その他固定費",
];
const RAW_MATERIAL_ITEM = "原材料・資材仕入";
const HOURLY_ITEMS = ["店舗利用料(製造・販売)", "店舗利用料(製造)", "人件費"];
const COLOR_POSITIVE = "#2563eb"; // 黒字(青)
const COLOR_NEGATIVE = "#dc2626"; // 赤字(赤)

const TODO_CATEGORIES = ["たくらみ", "みせづくり", "汗かき", "経営・管理"];
const TODO_STATUSES = ["未着手", "進行中", "完了"];
const STAFF_OPTIONS = ["さっとん", "ひさし", "あっこ", "かける", "りょーすけ", "もえ"];

const TABS = [
  { key: "input", label: "入力" },
  { key: "management", label: "サマリ" },
  { key: "financial", label: "PL" },
  { key: "todo", label: "TODO" },
  { key: "master", label: "マスタ" },
];

export default function KamoIntegratedCheck() {
  const [tab, setTab] = useState("input");

  // ========== 材料・包材マスタ ==========
  const [materials, setMaterials] = useState([
    { id: "m1", name: "強力粉", category: RAW, unit: "g", unitPrice: 0.35 },
    { id: "m2", name: "バター", category: RAW, unit: "g", unitPrice: 1.8 },
    { id: "m3", name: "砂糖", category: RAW, unit: "g", unitPrice: 0.25 },
    { id: "m4", name: "塩", category: RAW, unit: "g", unitPrice: 0.15 },
    { id: "m5", name: "イースト", category: RAW, unit: "g", unitPrice: 4.2 },
    { id: "m6", name: "紙袋(大)", category: PACK, unit: "個", unitPrice: 12 },
    { id: "m7", name: "OPP袋", category: PACK, unit: "個", unitPrice: 8 },
  ]);
  const [materialForm, setMaterialForm] = useState({ name: "", category: RAW, unit: "g", unitPrice: "" });
  const [materialListOpen, setMaterialListOpen] = useState(false);

  // ========== 商品マスター(単品・セット)+ レシピ ==========
  const [products, setProducts] = useState([
    { id: "p1", name: "バゲット", price: 380, kind: "single" },
    { id: "p2", name: "クロワッサン", price: 280, kind: "single" },
  ]);
  const [recipes, setRecipes] = useState({
    p1: {
      servings: 6,
      ingredients: [
        { id: uid(), materialId: "m1", amount: 1000 },
        { id: uid(), materialId: "m4", amount: 18 },
        { id: uid(), materialId: "m5", amount: 8 },
      ],
      packaging: [{ id: uid(), materialId: "m7", amount: 1 }],
    },
    p2: {
      servings: 12,
      ingredients: [
        { id: uid(), materialId: "m1", amount: 500 },
        { id: uid(), materialId: "m2", amount: 300 },
        { id: uid(), materialId: "m3", amount: 60 },
      ],
      packaging: [{ id: uid(), materialId: "m7", amount: 1 }],
    },
  });
  const [selectedProductId, setSelectedProductId] = useState("p1");
  const [productListOpen, setProductListOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [comboOpen, setComboOpen] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [editingRatio, setEditingRatio] = useState(false);
  const [costRatioDraft, setCostRatioDraft] = useState("");
  const [kindMode, setKindMode] = useState("single"); // 検索・新規登録の対象("single"|"set")

  // セット商品の内訳(構成商品 or 梱包・資材の行の可変長リスト)
  const [setBreakdowns, setSetBreakdowns] = useState({}); // { [productId]: [{id, kind:'component'|'material', refId, qty}] }

  // ========== 販売形態・委託先マスタ ==========
  const [rebateClients, setRebateClients] = useState([
    { id: "c1", name: "〇〇カフェ", rate: 0.15, memo: "" },
    { id: "c2", name: "△△物産", rate: 0.2, memo: "" },
  ]);
  const [rebateForm, setRebateForm] = useState({ name: "", rate: "", memo: "" });
  const [rebateListOpen, setRebateListOpen] = useState(false);
  const [salesChannels] = useState([
    { id: "f1", name: "店舗販売", rebateApplicable: false },
    { id: "f2", name: "委託販売", rebateApplicable: true },
    { id: "f3", name: "EC販売", rebateApplicable: false },
    { id: "f4", name: "イベント出店", rebateApplicable: false },
  ]);

  // ========== 売上・経費 ==========
  const [sales, setSales] = useState([
    { id: uid(), orderId: "R0001", date: "2026-07-01", productId: "p1", qty: 2, amount: 760, unitCostAtSale: 72.38, costSubtotal: 144.77 },
    { id: uid(), orderId: "R0001", date: "2026-07-01", productId: "p2", qty: 1, amount: 280, unitCostAtSale: 68.83, costSubtotal: 68.83 },
    { id: uid(), orderId: "R0002", date: "2026-07-01", productId: "p1", qty: 1, amount: 380, unitCostAtSale: 72.38, costSubtotal: 72.38 },
    { id: uid(), orderId: "R0003", date: "2026-07-02", productId: "p1", qty: 3, amount: 1140, unitCostAtSale: 72.38, costSubtotal: 217.15 },
  ]);
  const [expenses, setExpenses] = useState([
    { id: uid(), date: "2026-07-01", item: RAW_MATERIAL_ITEM, amount: 3000 },
    { id: uid(), date: "2026-07-02", item: "備品・消耗品費", amount: 1200 },
    { id: uid(), date: "2026-07-05", item: "人件費", amount: 18000 },
  ]);
  const [dailyMeta, setDailyMeta] = useState({}); // { [date]: { channelId, clientId } }
  const [mgmtBudgets, setMgmtBudgets] = useState({});

  // サマリタブのフィルタ
  const [monthMetric, setMonthMetric] = useState("sales"); // 'sales'|'gross'|'profit'
  const [monthChannel, setMonthChannel] = useState("all");
  const [dayMetric, setDayMetric] = useState("sales");
  const [dayChannel, setDayChannel] = useState("all");
  const [summaryDetailOpen, setSummaryDetailOpen] = useState(false);
  const [targetForm, setTargetForm] = useState({ month: "", salesBudget: "", grossMarginRatio: "", profitBudget: "" });
  const [targetListOpen, setTargetListOpen] = useState(false);
  const [editingTargetMonth, setEditingTargetMonth] = useState(null);
  const [finBudgets, setFinBudgets] = useState({});

  // 売上入力フォームは廃止(Squareが正のデータのため、ここでは追加しない)
  const [expenseForm, setExpenseForm] = useState({ date: "2026-07-03", item: EXPENSE_ITEMS[0], amount: "", hours: "" });

  // 経費マスタ(店舗利用料2パターン・人件費の時間単価)
  const [expenseRates, setExpenseRates] = useState({
    "店舗利用料(製造・販売)": 1500,
    "店舗利用料(製造)": 1200,
    人件費: 1100,
  });
  const [expenseRateListOpen, setExpenseRateListOpen] = useState(false);

  // Square連携: 商品マスタの正がどちらか(true=Square→アプリ, false=アプリ→Square)
  const [squareSyncFromSquare, setSquareSyncFromSquare] = useState(true);
  const [squareSyncConfirmOpen, setSquareSyncConfirmOpen] = useState(false);

  // ========== TODO・サブタスク ==========
  const [todos, setTodos] = useState([
    { id: "t1", category: "みせづくり", task: "夏メニュー試作", deadline: "2026-07-15", status: "進行中", snoozed: false },
    { id: "t2", category: "経営・管理", task: "Square移行の下準備", deadline: "2026-08-01", status: "未着手", snoozed: false },
  ]);
  const [todoForm, setTodoForm] = useState({ category: TODO_CATEGORIES[0], task: "", deadline: "", status: "未着手" });
  const [subtasks, setSubtasks] = useState([
    { id: uid(), parentTaskId: "t1", name: "ぶどうデニッシュ試作", assignee: "あっこ", deadline: "2026-07-10", status: "進行中", snoozed: false },
  ]);
  const [subtaskForms, setSubtaskForms] = useState({});
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [showSnoozed, setShowSnoozed] = useState(false); // ちょっとあと表示切り替え(デフォルト非表示)

  // ========== 参照マップ ==========
  const materialMap = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials]);
  const rawMaterials = materials.filter((m) => m.category === RAW);
  const packMaterials = materials.filter((m) => m.category === PACK);
  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const singleProducts = products.filter((p) => p.kind !== "set");
  const rebateMap = useMemo(() => Object.fromEntries(rebateClients.map((c) => [c.id, c])), [rebateClients]);
  const channelMap = useMemo(() => Object.fromEntries(salesChannels.map((c) => [c.id, c])), [salesChannels]);

  const getRecipe = (productId) => recipes[productId] || { servings: 1, ingredients: [], packaging: [] };

  const getBreakdown = (productId) => setBreakdowns[productId] || [];

  // ========== 原価計算(単品はレシピから、セットは内訳の積み上げから。単品を先に計算してからセットで参照する) ==========
  const productCosts = useMemo(() => {
    const costs = {};

    // パス1: 単品商品(レシピから計算)
    products
      .filter((p) => p.kind !== "set")
      .forEach((p) => {
        const recipe = getRecipe(p.id);
        const servingsForCalc = Number(recipe.servings) > 0 ? Number(recipe.servings) : 1;

        const 製造原価計 = recipe.ingredients.reduce((sum, ing) => {
          const mat = materialMap[ing.materialId];
          return sum + (mat ? mat.unitPrice * (Number(ing.amount) || 0) : 0);
        }, 0);
        const 製造原価単価 = 製造原価計 / servingsForCalc;
        const 梱包材費計 = recipe.packaging.reduce((sum, pk) => {
          const mat = materialMap[pk.materialId];
          return sum + (mat ? mat.unitPrice * (Number(pk.amount) || 0) : 0);
        }, 0);

        const 材料費 = 製造原価単価;
        const 梱包材費 = 梱包材費計;
        const 原価 = 材料費 + 梱包材費;
        const 限界利益 = p.price - 原価;
        const 限界利益率 = p.price > 0 ? 限界利益 / p.price : 0;
        const 原価率 = p.price > 0 ? 原価 / p.price : 0;

        costs[p.id] = { 製造原価計, 製造原価単価, 梱包材費計, 材料費, 梱包材費, 原価, 限界利益, 限界利益率, 原価率 };
      });

    // パス2: セット商品(内訳の構成商品=単品の原価×数量 + 梱包・資材=単価そのまま を積み上げ)
    products
      .filter((p) => p.kind === "set")
      .forEach((p) => {
        const rows = getBreakdown(p.id);
        const 材料費 = rows.reduce((sum, row) => {
          if (row.kind === "component") {
            const compCost = costs[row.refId]?.原価 || 0;
            return sum + compCost * (Number(row.qty) || 0);
          }
          const mat = materialMap[row.refId];
          return sum + (mat ? mat.unitPrice : 0); // 梱包・資材は数量を掛けない(数量欄は記録用)
        }, 0);

        // セット自身のレシピ(あれば)の包材リストを「セットを包む外箱」の費用として加算
        const recipe = getRecipe(p.id);
        const 梱包材費 = recipe.packaging.reduce((sum, pk) => {
          const mat = materialMap[pk.materialId];
          return sum + (mat ? mat.unitPrice * (Number(pk.amount) || 0) : 0);
        }, 0);

        const 原価 = 材料費 + 梱包材費;
        const 限界利益 = p.price - 原価;
        const 限界利益率 = p.price > 0 ? 限界利益 / p.price : 0;
        const 原価率 = p.price > 0 ? 原価 / p.price : 0;

        costs[p.id] = { 製造原価計: 材料費, 製造原価単価: 材料費, 梱包材費計: 梱包材費, 材料費, 梱包材費, 原価, 限界利益, 限界利益率, 原価率 };
      });

    return costs;
  }, [products, recipes, setBreakdowns, materialMap]);

  // ========== 日次集計(売上_Square + 経費 → 自動生成) ==========
  const allDates = useMemo(() => {
    const s = new Set([...sales.map((s) => s.date), ...expenses.map((e) => e.date), ...Object.keys(dailyMeta)]);
    return [...s].sort();
  }, [sales, expenses, dailyMeta]);

  const dailyRows = useMemo(() => {
    return allDates.map((date) => {
      const daySales = sales.filter((s) => s.date === date);
      const dayExpenses = expenses.filter((e) => e.date === date);
      const meta = dailyMeta[date] || {};
      const channel = channelMap[meta.channelId];

      // 原価小計は「売上登録時にスナップショットした原価」を使う(その後マスタが変わっても遡って変化しない)
      const salesWithCost = daySales.map((s) => ({
        ...s,
        costSubtotal: s.costSubtotal ?? (productCosts[s.productId]?.原価 || 0) * s.qty,
      }));

      const 客数 = new Set(daySales.map((s) => s.orderId)).size;
      const 値引前 = salesWithCost.reduce((a, s) => a + s.amount, 0);

      const rebateApplies = !!(channel && channel.rebateApplicable && meta.clientId);
      const rebateRate = rebateApplies ? rebateMap[meta.clientId]?.rate || 0 : 0;
      const リベート = rebateApplies ? 値引前 * rebateRate : 0;

      const 売上_日次 = 値引前 - リベート;
      const 客単価 = 客数 > 0 ? 売上_日次 / 客数 : 0;
      const 原価標準_日次 = salesWithCost.reduce((a, s) => a + s.costSubtotal, 0);
      const 粗利_日次 = 売上_日次 - 原価標準_日次;

      const 原材料仕入_日次 = dayExpenses
        .filter((e) => e.item === RAW_MATERIAL_ITEM)
        .reduce((a, e) => a + Number(e.amount || 0), 0);
      const その他経費_日次 = dayExpenses
        .filter((e) => e.item !== RAW_MATERIAL_ITEM)
        .reduce((a, e) => a + Number(e.amount || 0), 0);

      const 営業利益_管理_日次 = 粗利_日次 - その他経費_日次;
      const 原価差異_日次 = 原材料仕入_日次 - 原価標準_日次;
      const 営業利益_財務_日次 = 営業利益_管理_日次 - 原価差異_日次;

      return {
        date,
        yearMonth: yearMonthOf(date),
        clientId: meta.clientId || "",
        channelId: meta.channelId || "",
        客数,
        値引前,
        リベート,
        売上_日次,
        客単価,
        原価標準_日次,
        粗利_日次,
        原材料仕入_日次,
        その他経費_日次,
        営業利益_管理_日次,
        原価差異_日次,
        営業利益_財務_日次,
      };
    });
  }, [allDates, sales, expenses, dailyMeta, channelMap, rebateMap, productCosts]);

  const allYearMonths = useMemo(() => {
    const s = new Set([...dailyRows.map((d) => d.yearMonth), ...Object.keys(mgmtBudgets), ...Object.keys(finBudgets)]);
    return [...s].filter(Boolean).sort();
  }, [dailyRows, mgmtBudgets, finBudgets]);

  // ========== 月次集計 ==========
  const monthlyRows = useMemo(() => {
    return allYearMonths.map((ym) => {
      const days = dailyRows.filter((d) => d.yearMonth === ym);
      const 売上_実績 = days.reduce((a, d) => a + d.売上_日次, 0);
      const 原価標準_実績 = days.reduce((a, d) => a + d.原価標準_日次, 0);
      const 粗利_実績 = 売上_実績 - 原価標準_実績;
      const 原材料仕入_実績 = days.reduce((a, d) => a + d.原材料仕入_日次, 0);
      const その他経費_実績 = days.reduce((a, d) => a + d.その他経費_日次, 0);

      const 営業利益_管理 = 粗利_実績 - その他経費_実績;
      const 原価差異 = 原材料仕入_実績 - 原価標準_実績;
      const 営業利益_財務 = 営業利益_管理 - 原価差異;

      const mBudget = mgmtBudgets[ym] || { salesBudget: 0, grossMarginRatio: 0, profitBudget: 0 };
      const fBudget = finBudgets[ym] || { rawMaterialBudget: 0, otherExpenseBudget: 0, profitBudget: 0 };

      return {
        yearMonth: ym,
        売上_実績,
        原価標準_実績,
        粗利_実績,
        原材料仕入_実績,
        その他経費_実績,
        営業利益_管理,
        原価差異,
        営業利益_財務,
        mBudget,
        fBudget,
      };
    });
  }, [allYearMonths, dailyRows, mgmtBudgets, finBudgets]);

  // ========== サマリタブ用データ ==========
  const METRIC_LABEL = { sales: "売上", profit: "営業利益" };
  const METRIC_DAILY_FIELD = { sales: "売上_日次", profit: "営業利益_管理_日次" };

  // 月次予実(販売形態フィルタは日次集計を絞り込んでから月次に積み上げ直す。予算は形態別に持たないため全体の予算を使用)
  const monthlyByChannel = useMemo(() => {
    const filtered = monthChannel === "all" ? dailyRows : dailyRows.filter((d) => d.channelId === monthChannel);
    const map = {};
    filtered.forEach((d) => {
      if (!map[d.yearMonth]) map[d.yearMonth] = { yearMonth: d.yearMonth, 売上: 0, 粗利: 0, 営業利益: 0 };
      map[d.yearMonth].売上 += d.売上_日次;
      map[d.yearMonth].粗利 += d.粗利_日次;
      map[d.yearMonth].営業利益 += d.営業利益_管理_日次;
    });
    return allYearMonths.map((ym) => map[ym] || { yearMonth: ym, 売上: 0, 粗利: 0, 営業利益: 0 });
  }, [dailyRows, monthChannel, allYearMonths]);

  const getTargetAmount = (ym, metric) => {
    const b = mgmtBudgets[ym];
    if (!b) return 0;
    if (metric === "sales") return b.salesBudget || 0;
    return b.profitBudget || 0;
  };

  const monthlyChartData = useMemo(() => {
    const key = METRIC_LABEL[monthMetric];
    const showTarget = monthChannel === "all";
    return monthlyByChannel.map((row) => ({
      name: row.yearMonth,
      実績: row[key],
      実績粗利率: row.売上 > 0 ? Math.round((row.粗利 / row.売上) * 1000) / 10 : 0,
      ...(showTarget
        ? { 目標: getTargetAmount(row.yearMonth, monthMetric), 目標粗利率: mgmtBudgets[row.yearMonth]?.grossMarginRatio || 0 }
        : {}),
    }));
  }, [monthlyByChannel, monthMetric, monthChannel, mgmtBudgets]);

  // 日次予実(実績のみ)
  const dailyChartData = useMemo(() => {
    const filtered = dayChannel === "all" ? dailyRows : dailyRows.filter((d) => d.channelId === dayChannel);
    const field = METRIC_DAILY_FIELD[dayMetric];
    return filtered.map((d) => ({
      name: d.date,
      実績: d[field],
      実績粗利率: d.売上_日次 > 0 ? Math.round((d.粗利_日次 / d.売上_日次) * 1000) / 10 : 0,
    }));
  }, [dailyRows, dayChannel, dayMetric]);

  // 客数と客単価(2軸)
  const customerChartData = useMemo(
    () => dailyRows.map((d) => ({ name: d.date, 客数: d.客数, 客単価: Math.round(d.客単価) })),
    [dailyRows]
  );

  // 商品別売上(上位10)
  const productSalesRanking = useMemo(() => {
    const totals = {};
    sales.forEach((s) => {
      totals[s.productId] = (totals[s.productId] || 0) + s.amount;
    });
    return Object.entries(totals)
      .map(([pid, amt]) => ({ name: productMap[pid]?.name || pid, 売上: amt }))
      .sort((a, b) => b.売上 - a.売上)
      .slice(0, 10);
  }, [sales, productMap]);

  // ========== ハンドラ: 材料マスタ ==========
  const addMaterial = () => {
    if (!materialForm.name || materialForm.unitPrice === "") return;
    setMaterials((prev) => [...prev, { id: uid(), ...materialForm, unitPrice: Number(materialForm.unitPrice) }]);
    setMaterialForm({ name: "", category: RAW, unit: "g", unitPrice: "" });
  };
  const updateMaterial = (id, field, value) => {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: field === "unitPrice" ? Number(value) : value } : m)));
  };
  const removeMaterial = (id) => setMaterials((prev) => prev.filter((m) => m.id !== id));

  // --- ハンドラ: 販売先(委託先)マスタ ---
  const addRebateClient = () => {
    if (!rebateForm.name || rebateForm.rate === "") return;
    setRebateClients((prev) => [...prev, { id: uid(), name: rebateForm.name, rate: Number(rebateForm.rate) / 100, memo: rebateForm.memo }]);
    setRebateForm({ name: "", rate: "", memo: "" });
  };
  const updateRebateClient = (id, field, value) => {
    setRebateClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: field === "rate" ? Number(value) / 100 : value } : c))
    );
  };
  const removeRebateClient = (id) => setRebateClients((prev) => prev.filter((c) => c.id !== id));

  // ========== ハンドラ: 商品・レシピ ==========
  const updateProduct = (id, field, value) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: field === "price" ? Number(value) : value } : p)));
  };
  const createProductFromQuery = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = uid();
    setProducts((prev) => [...prev, { id, name: trimmed, price: 0, kind: kindMode }]);
    setRecipes((prev) => ({ ...prev, [id]: { servings: 1, ingredients: [], packaging: [] } }));
    setSetBreakdowns((prev) => ({ ...prev, [id]: [] }));
    setSelectedProductId(id);
    setComboOpen(false);
  };

  // --- セット内訳(構成商品・梱包資材)の可変長リスト ---
  const addBreakdownRow = (productId, kind) => {
    const defaultRef = kind === "component" ? singleProducts.find((p) => p.id !== productId)?.id : materials[0]?.id;
    setSetBreakdowns((prev) => ({
      ...prev,
      [productId]: [...(prev[productId] || []), { id: uid(), kind, refId: defaultRef, qty: 1 }],
    }));
  };
  const updateBreakdownRow = (productId, rowId, field, value) => {
    setSetBreakdowns((prev) => ({
      ...prev,
      [productId]: (prev[productId] || []).map((row) =>
        row.id === rowId ? { ...row, [field]: field === "qty" ? (value === "" ? "" : Number(value)) : value } : row
      ),
    }));
  };
  const removeBreakdownRow = (productId, rowId) => {
    setSetBreakdowns((prev) => ({ ...prev, [productId]: (prev[productId] || []).filter((row) => row.id !== rowId) }));
  };
  const updateServings = (productId, rawValue) => {
    const value = rawValue === "" ? "" : Number(rawValue);
    setRecipes((prev) => ({ ...prev, [productId]: { ...getRecipe(productId), servings: value } }));
  };
  const addIngredientRow = (productId, kind) => {
    const defaultMaterial = kind === "ingredients" ? rawMaterials[0]?.id : packMaterials[0]?.id;
    const defaultAmount = kind === "packaging" ? 1 : 0;
    setRecipes((prev) => {
      const r = getRecipe(productId);
      return { ...prev, [productId]: { ...r, [kind]: [...r[kind], { id: uid(), materialId: defaultMaterial, amount: defaultAmount }] } };
    });
  };
  const updateIngredientRow = (productId, kind, rowId, field, value) => {
    setRecipes((prev) => {
      const r = getRecipe(productId);
      return {
        ...prev,
        [productId]: {
          ...r,
          [kind]: r[kind].map((row) =>
            row.id === rowId ? { ...row, [field]: field === "amount" ? (value === "" ? "" : Number(value)) : value } : row
          ),
        },
      };
    });
  };
  const removeIngredientRow = (productId, kind, rowId) => {
    setRecipes((prev) => {
      const r = getRecipe(productId);
      return { ...prev, [productId]: { ...r, [kind]: r[kind].filter((row) => row.id !== rowId) } };
    });
  };

  const selectedRecipe = getRecipe(selectedProductId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedCost = productCosts[selectedProductId];

  useEffect(() => {
    setProductQuery("");
  }, [selectedProductId]);

  // 検索・登録モードのトグルを、選択中商品の区分と同期させる
  useEffect(() => {
    if (selectedProduct) setKindMode(selectedProduct.kind || "single");
  }, [selectedProductId]);

  useEffect(() => {
    if (editingRatio) return;
    if (!selectedProduct || !selectedCost) return;
    const ratio = selectedProduct.price > 0 ? (selectedCost.原価 / selectedProduct.price) * 100 : 0;
    setCostRatioDraft(ratio ? ratio.toFixed(1) : "");
  }, [selectedProductId, selectedProduct?.price, selectedCost?.原価, editingRatio]);

  const handleCostRatioChange = (value) => {
    setCostRatioDraft(value);
    const rate = Number(value);
    if (!selectedCost || !rate || rate <= 0) return;
    const rawPrice = selectedCost.原価 / (rate / 100);
    const newPrice = Math.ceil(rawPrice / 50) * 50;
    updateProduct(selectedProductId, "price", newPrice);
  };

  const comboMatches = productQuery.trim()
    ? products.filter((p) => p.kind === kindMode && p.name.toLowerCase().includes(productQuery.toLowerCase()))
    : products.filter((p) => p.kind === kindMode);
  const exactMatchExists = products.some((p) => p.kind === kindMode && p.name === productQuery.trim());

  // ========== ハンドラ: 経費・日次設定(売上はSquareから同期される想定のため、追加ハンドラはなし) ==========
  const isHourlyExpenseItem = (item) => HOURLY_ITEMS.includes(item);
  const addExpense = () => {
    const isHourly = isHourlyExpenseItem(expenseForm.item);
    let amount;
    if (isHourly) {
      if (!expenseForm.hours) return;
      amount = Number(expenseForm.hours) * (expenseRates[expenseForm.item] || 0);
    } else {
      if (!expenseForm.amount) return;
      amount = Number(expenseForm.amount);
    }
    setExpenses((prev) => [...prev, { id: uid(), date: expenseForm.date, item: expenseForm.item, amount }]);
    setExpenseForm((f) => ({ ...f, amount: "", hours: "" }));
  };
  const updateExpenseRate = (item, value) => setExpenseRates((prev) => ({ ...prev, [item]: Number(value) || 0 }));

  // --- ハンドラ: TODO・サブタスク ---
  const addTodo = () => {
    if (!todoForm.task.trim()) return;
    const id = uid();
    setTodos((prev) => [...prev, { id, ...todoForm, snoozed: false }]);
    setTodoForm((f) => ({ ...f, task: "", deadline: "" }));
    setExpandedTaskId(id);
  };
  const updateTodo = (id, field, value) => setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  const toggleTodoSnooze = (id) => setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, snoozed: !t.snoozed } : t)));
  const removeTodo = (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setSubtasks((prev) => prev.filter((s) => s.parentTaskId !== id));
  };
  const getSubtaskForm = (taskId) =>
    subtaskForms[taskId] || { name: "", assignee: STAFF_OPTIONS[0], deadline: "", status: "未着手" };
  const setSubtaskFormField = (taskId, field, value) =>
    setSubtaskForms((prev) => ({ ...prev, [taskId]: { ...getSubtaskForm(taskId), [field]: value } }));
  const addSubtask = (taskId) => {
    const f = getSubtaskForm(taskId);
    if (!f.name.trim()) return;
    setSubtasks((prev) => [...prev, { id: uid(), parentTaskId: taskId, ...f, snoozed: false }]);
    setSubtaskForms((prev) => ({ ...prev, [taskId]: { name: "", assignee: STAFF_OPTIONS[0], deadline: "", status: "未着手" } }));
  };
  const updateSubtask = (id, field, value) => setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  const toggleSubtaskSnooze = (id) => setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, snoozed: !s.snoozed } : s)));
  const removeSubtask = (id) => setSubtasks((prev) => prev.filter((s) => s.id !== id));
  // サブタスクの並び替え(同じタスク内で1つ上/下と入れ替える)
  const moveSubtask = (taskId, subtaskId, direction) => {
    setSubtasks((prev) => {
      const taskItems = prev.filter((s) => s.parentTaskId === taskId);
      const idx = taskItems.findIndex((s) => s.id === subtaskId);
      const swapIdx = idx + direction;
      if (swapIdx < 0 || swapIdx >= taskItems.length) return prev;
      const a = taskItems[idx];
      const b = taskItems[swapIdx];
      const next = [...prev];
      const aFullIdx = next.findIndex((s) => s.id === a.id);
      const bFullIdx = next.findIndex((s) => s.id === b.id);
      [next[aFullIdx], next[bFullIdx]] = [next[bFullIdx], next[aFullIdx]];
      return next;
    });
  };
  const setDayField = (date, field, value) => setDailyMeta((prev) => ({ ...prev, [date]: { ...prev[date], [field]: value } }));
  const setMgmtBudgetField = (ym, field, value) =>
    setMgmtBudgets((prev) => ({
      ...prev,
      [ym]: { ...(prev[ym] || { salesBudget: 0, grossMarginRatio: 0, profitBudget: 0 }), [field]: Number(value) || 0 },
    }));
  const addTarget = () => {
    if (!targetForm.month) return;
    const [y, m] = targetForm.month.split("-");
    const ym = `${y}/${m}`;
    setMgmtBudgets((prev) => ({
      ...prev,
      [ym]: {
        salesBudget: Number(targetForm.salesBudget) || 0,
        grossMarginRatio: Number(targetForm.grossMarginRatio) || 0,
        profitBudget: Number(targetForm.profitBudget) || 0,
      },
    }));
    setTargetForm({ month: "", salesBudget: "", grossMarginRatio: "", profitBudget: "" });
  };
  const removeTargetMonth = (ym) => {
    setMgmtBudgets((prev) => {
      const next = { ...prev };
      delete next[ym];
      return next;
    });
    if (editingTargetMonth === ym) setEditingTargetMonth(null);
  };
  const setFinBudgetField = (ym, field, value) =>
    setFinBudgets((prev) => ({
      ...prev,
      [ym]: { ...(prev[ym] || { rawMaterialBudget: 0, otherExpenseBudget: 0, profitBudget: 0 }), [field]: Number(value) || 0 },
    }));

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <header className="border-b border-stone-300 pb-4">
          <p className="text-xs tracking-widest text-amber-700 font-semibold uppercase">カモの小屋 収益分析</p>
          <h1 className="text-2xl font-bold mt-1">統合検証版(商品マスタ+売上+集計+会計)</h1>
          <p className="text-sm text-stone-500 mt-1">商品マスタで計算した原価が、売上の日次・月次集計にそのまま連動します。</p>
        </header>

        <div className="flex gap-1 bg-stone-200 rounded-lg p-1 w-fit flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                tab === t.key ? "bg-white shadow text-amber-800" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ============ 入力タブ ============ */}
        {tab === "input" && (
          <>
            {/* 目標(月単位・売上/粗利率/利益) */}
            <section className="bg-white rounded-lg border border-stone-200 p-4">
              <h2 className="font-semibold mb-1">目標</h2>
              <p className="text-xs text-stone-500 mb-3">
                月単位で売上・利益の目標額と、粗利率の目標を入力します。粗利目標(金額)は「売上目標 × 粗利率」で自動計算されます。
              </p>
              <div className="flex flex-wrap gap-2 items-end mb-3 text-sm">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">対象月</label>
                  <input
                    type="month"
                    className="border rounded px-2 py-1"
                    value={targetForm.month}
                    onChange={(e) => setTargetForm((f) => ({ ...f, month: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">売上目標(円)</label>
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-28"
                    value={targetForm.salesBudget}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setTargetForm((f) => ({ ...f, salesBudget: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">粗利率目標(%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="border rounded px-2 py-1 w-24"
                    value={targetForm.grossMarginRatio}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setTargetForm((f) => ({ ...f, grossMarginRatio: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">利益目標(円)</label>
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-28"
                    value={targetForm.profitBudget}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setTargetForm((f) => ({ ...f, profitBudget: e.target.value }))}
                  />
                </div>
                <button onClick={addTarget} className="flex items-center gap-1 bg-amber-700 text-white rounded px-3 py-1.5 hover:bg-amber-800">
                  <Plus size={14} /> 登録
                </button>
              </div>

              <button
                onClick={() => setTargetListOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-medium"
              >
                {targetListOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                登録済み一覧({Object.keys(mgmtBudgets).length}件)
              </button>

              {targetListOpen && (
                <div className="mt-3 space-y-2">
                  {Object.keys(mgmtBudgets).length === 0 && <p className="text-xs text-stone-400">まだ登録がありません。</p>}
                  {Object.keys(mgmtBudgets)
                    .sort()
                    .map((ym) => {
                      const b = mgmtBudgets[ym];
                      const grossAmount = (b.salesBudget || 0) * ((b.grossMarginRatio || 0) / 100);
                      const isEditing = editingTargetMonth === ym;
                      return (
                        <div key={ym} className="border border-stone-200 rounded-md p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">{ym}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingTargetMonth(isEditing ? null : ym)}
                                className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"
                              >
                                <Pencil size={12} /> {isEditing ? "閉じる" : "編集"}
                              </button>
                              <button onClick={() => removeTargetMonth(ym)}>
                                <Trash2 size={13} className="text-stone-400 hover:text-red-500" />
                              </button>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="flex flex-wrap gap-3 items-end text-xs">
                              <div>
                                <label className="block text-stone-500 mb-1">売上目標(円)</label>
                                <input
                                  type="number"
                                  className="border rounded px-2 py-1 w-28"
                                  value={b.salesBudget || 0}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => setMgmtBudgetField(ym, "salesBudget", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-stone-500 mb-1">粗利率目標(%)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  className="border rounded px-2 py-1 w-24"
                                  value={b.grossMarginRatio || 0}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => setMgmtBudgetField(ym, "grossMarginRatio", e.target.value)}
                                />
                              </div>
                              <div>
                                <div className="text-stone-500 mb-1">粗利目標(自動計算)</div>
                                <div className="tabular-nums font-medium py-1">{yen(grossAmount)}</div>
                              </div>
                              <div>
                                <label className="block text-stone-500 mb-1">利益目標(円)</label>
                                <input
                                  type="number"
                                  className="border rounded px-2 py-1 w-28"
                                  value={b.profitBudget || 0}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => setMgmtBudgetField(ym, "profitBudget", e.target.value)}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div>
                                <div className="text-stone-500">売上目標</div>
                                <div className="tabular-nums font-medium">{yen(b.salesBudget)}</div>
                              </div>
                              <div>
                                <div className="text-stone-500">粗利率目標</div>
                                <div className="tabular-nums font-medium">{(b.grossMarginRatio || 0).toFixed(1)}%</div>
                              </div>
                              <div>
                                <div className="text-stone-500">粗利目標</div>
                                <div className="tabular-nums font-medium">{yen(grossAmount)}</div>
                              </div>
                              <div>
                                <div className="text-stone-500">利益目標</div>
                                <div className="tabular-nums font-medium">{yen(b.profitBudget)}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </section>

            {/* 日次設定(販売形態・委託先) */}
            <section className="bg-white rounded-lg border border-stone-200 p-4">
              <h2 className="font-semibold mb-1">日次設定(販売形態・委託先)</h2>
              <p className="text-xs text-stone-500 mb-3">
                「委託販売」などリベート対象の形態を選んだ日だけ、隣で委託先を選べます。
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-stone-500 border-b">
                      <th className="py-1 pr-2">日付</th>
                      <th className="py-1 pr-2">販売形態</th>
                      <th className="py-1 pr-2">委託先(販売先)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allDates.map((date) => {
                      const meta = dailyMeta[date] || {};
                      const channel = channelMap[meta.channelId];
                      const rebateEligible = !!(channel && channel.rebateApplicable);
                      return (
                        <tr key={date} className="border-b border-stone-100">
                          <td className="py-1 pr-2 font-medium">{date}</td>
                          <td className="py-1 pr-2">
                            <select
                              className="border rounded px-1 py-0.5 text-xs"
                              value={meta.channelId || ""}
                              onChange={(e) => setDayField(date, "channelId", e.target.value)}
                            >
                              <option value="">(未選択)</option>
                              {salesChannels.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1 pr-2">
                            <select
                              className="border rounded px-1 py-0.5 text-xs disabled:opacity-40"
                              value={meta.clientId || ""}
                              disabled={!rebateEligible}
                              onChange={(e) => setDayField(date, "clientId", e.target.value)}
                            >
                              <option value="">{rebateEligible ? "(選択)" : "対象外"}</option>
                              {rebateClients.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 経費入力 */}
            <section className="bg-white rounded-lg border border-stone-200 p-4">
              <h2 className="font-semibold mb-1">経費入力</h2>
              <p className="text-xs text-stone-500 mb-3">
                入力先は1つ。「{RAW_MATERIAL_ITEM}」を選んだ分だけ、裏側で標準原価と突き合わせて原価差異を計算します。
              </p>
              <div className="flex flex-wrap gap-2 items-end mb-3 text-sm">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">日付</label>
                  <input
                    type="date"
                    className="border rounded px-2 py-1"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">項目</label>
                  <select
                    className="border rounded px-2 py-1"
                    value={expenseForm.item}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, item: e.target.value, amount: "", hours: "" }))}
                  >
                    {EXPENSE_ITEMS.map((it) => (
                      <option key={it} value={it}>
                        {it}
                      </option>
                    ))}
                  </select>
                </div>
                {isHourlyExpenseItem(expenseForm.item) ? (
                  <>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">時間(h)</label>
                      <input
                        type="number"
                        step="0.5"
                        className="border rounded px-2 py-1 w-20"
                        value={expenseForm.hours}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setExpenseForm((f) => ({ ...f, hours: e.target.value }))}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-stone-500 mb-1">
                        金額(自動計算・時間単価¥{expenseRates[expenseForm.item] || 0})
                      </div>
                      <div className="tabular-nums font-medium py-1.5">
                        {yen((Number(expenseForm.hours) || 0) * (expenseRates[expenseForm.item] || 0))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">金額</label>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-24"
                      value={expenseForm.amount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                    />
                  </div>
                )}
                <button onClick={addExpense} className="flex items-center gap-1 bg-amber-700 text-white rounded px-3 py-1.5 hover:bg-amber-800">
                  <Plus size={14} /> 追加
                </button>
              </div>
              <div className="text-sm space-y-1">
                {expenses.map((e) => (
                  <div key={e.id} className="flex justify-between border-b border-stone-100 py-1">
                    <span>
                      {e.date} — <span className={e.item === RAW_MATERIAL_ITEM ? "text-amber-700 font-medium" : ""}>{e.item}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {yen(e.amount)}
                      <button onClick={() => setExpenses((prev) => prev.filter((x) => x.id !== e.id))}>
                        <Trash2 size={13} className="text-stone-400 hover:text-red-500" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ============ 管理会計タブ ============ */}
        {tab === "management" && (
          <>
            {/* 月次予実 */}
            <section className="bg-white rounded-lg border border-stone-200 p-4">
              <h2 className="font-semibold mb-3">月次予実</h2>
              <div className="flex flex-wrap gap-4 mb-3">
                <div className="flex gap-1 bg-stone-100 rounded-md p-1 w-fit text-xs">
                  {["sales", "profit"].map((k) => (
                    <button
                      key={k}
                      onClick={() => setMonthMetric(k)}
                      className={`px-3 py-1 rounded ${monthMetric === k ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
                    >
                      {METRIC_LABEL[k]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 bg-stone-100 rounded-md p-1 w-fit text-xs flex-wrap">
                  <button
                    onClick={() => setMonthChannel("all")}
                    className={`px-3 py-1 rounded ${monthChannel === "all" ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
                  >
                    全形態
                  </button>
                  {salesChannels.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setMonthChannel(c.id)}
                      className={`px-3 py-1 rounded ${monthChannel === c.id ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              {monthlyChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      {monthMetric === "sales" && (
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
                      )}
                      <Tooltip formatter={(v, name) => (name.includes("粗利率") ? `${v}%` : yen(v))} />
                      <Legend />
                      {monthChannel === "all" && <Bar yAxisId="left" dataKey="目標" fill="#d6d3d1" radius={[3, 3, 0, 0]} />}
                      <Bar yAxisId="left" dataKey="実績" radius={[3, 3, 0, 0]}>
                        {monthlyChartData.map((row, i) => (
                          <Cell key={i} fill={row.実績 >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE} />
                        ))}
                      </Bar>
                      {monthMetric === "sales" && (
                        <Line yAxisId="right" type="monotone" dataKey="実績粗利率" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                      )}
                      {monthMetric === "sales" && monthChannel === "all" && (
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="目標粗利率"
                          stroke="#9ca3af"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={{ r: 3 }}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-stone-400">データがありません</p>
              )}
            </section>

            {/* 日次予実 */}
            <section className="bg-white rounded-lg border border-stone-200 p-4">
              <h2 className="font-semibold mb-3">日次予実</h2>
              <div className="flex flex-wrap gap-4 mb-3">
                <div className="flex gap-1 bg-stone-100 rounded-md p-1 w-fit text-xs">
                  {["sales", "profit"].map((k) => (
                    <button
                      key={k}
                      onClick={() => setDayMetric(k)}
                      className={`px-3 py-1 rounded ${dayMetric === k ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
                    >
                      {METRIC_LABEL[k]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 bg-stone-100 rounded-md p-1 w-fit text-xs flex-wrap">
                  <button
                    onClick={() => setDayChannel("all")}
                    className={`px-3 py-1 rounded ${dayChannel === "all" ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
                  >
                    全形態
                  </button>
                  {salesChannels.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setDayChannel(c.id)}
                      className={`px-3 py-1 rounded ${dayChannel === c.id ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              {dailyChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      {dayMetric === "sales" && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />}
                      <Tooltip formatter={(v, name) => (name.includes("粗利率") ? `${v}%` : yen(v))} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="実績" radius={[3, 3, 0, 0]}>
                        {dailyChartData.map((row, i) => (
                          <Cell key={i} fill={row.実績 >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE} />
                        ))}
                      </Bar>
                      {dayMetric === "sales" && (
                        <Line yAxisId="right" type="monotone" dataKey="実績粗利率" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-stone-400">データがありません</p>
              )}
            </section>

            {/* 客数と客単価 */}
            <section className="bg-white rounded-lg border border-stone-200 p-4">
              <h2 className="font-semibold mb-3">客数と客単価</h2>
              {customerChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={customerChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: "客数", angle: -90, position: "insideLeft", fontSize: 11 }} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11 }}
                        label={{ value: "客単価", angle: 90, position: "insideRight", fontSize: 11 }}
                      />
                      <Tooltip formatter={(v, name) => (name === "客単価" ? yen(v) : v)} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="客数" fill="#d6d3d1" radius={[3, 3, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="客単価" stroke="#b45309" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-stone-400">データがありません</p>
              )}
            </section>

            {/* 商品別売上(上位10) */}
            <section className="bg-white rounded-lg border border-stone-200 p-4">
              <h2 className="font-semibold mb-3">商品別売上(上位10)</h2>
              {productSalesRanking.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productSalesRanking}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => yen(v)} />
                      <Bar dataKey="売上" fill="#b45309" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-stone-400">データがありません</p>
              )}
            </section>

            {/* 詳細データ(日次集計・月次予算入力) */}
            <section className="bg-white rounded-lg border border-stone-200 p-4">
              <button
                onClick={() => setSummaryDetailOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-medium"
              >
                {summaryDetailOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                詳細データ(日次集計・月次予算の入力)
              </button>

              {summaryDetailOpen && (
                <div className="mt-3 space-y-4">
                  <div className="mt-2 bg-stone-100 rounded px-3 py-2 text-xs font-mono">
                    営業利益(管理) = 売上_実績 − 原価_実績(標準) − その他経費_実績
                  </div>

                  <div>
                    <h3 className="font-medium text-sm mb-1">日次集計(自動生成)</h3>
                    <p className="text-xs text-stone-500 mb-2">
                      販売形態・委託先は「入力」タブの日次設定で選びます。ここは自動計算の結果表示のみです。
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-stone-500 border-b">
                            <th className="py-1 pr-2">日付</th>
                            <th className="py-1 pr-2">販売形態</th>
                            <th className="py-1 pr-2">委託先</th>
                            <th className="py-1 pr-2">客数</th>
                            <th className="py-1 pr-2">客単価</th>
                            <th className="py-1 pr-2">売上(値引前)</th>
                            <th className="py-1 pr-2">リベート</th>
                            <th className="py-1 pr-2">売上(日次)</th>
                            <th className="py-1 pr-2">原価(標準)</th>
                            <th className="py-1 pr-2">粗利</th>
                            <th className="py-1 pr-2">その他経費</th>
                            <th className="py-1 pr-2">営業利益(管理)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyRows.map((d) => {
                            const channel = channelMap[d.channelId];
                            const rebateEligible = !!(channel && channel.rebateApplicable);
                            return (
                              <tr key={d.date} className="border-b border-stone-100">
                                <td className="py-1 pr-2 font-medium">{d.date}</td>
                                <td className="py-1 pr-2 text-stone-600">{channel?.name || "(未選択)"}</td>
                                <td className="py-1 pr-2 text-stone-600">
                                  {rebateEligible ? rebateMap[d.clientId]?.name || "(未選択)" : "対象外"}
                                </td>
                                <td className="py-1 pr-2 tabular-nums">{d.客数}</td>
                                <td className="py-1 pr-2 tabular-nums">{yen(d.客単価)}</td>
                                <td className="py-1 pr-2 tabular-nums">{yen(d.値引前)}</td>
                                <td className="py-1 pr-2 tabular-nums text-red-600">{d.リベート ? `-${yen(d.リベート)}` : "-"}</td>
                                <td className="py-1 pr-2 tabular-nums font-medium">{yen(d.売上_日次)}</td>
                                <td className="py-1 pr-2 tabular-nums text-stone-500">{yen(d.原価標準_日次)}</td>
                                <td className="py-1 pr-2 tabular-nums">{yen(d.粗利_日次)}</td>
                                <td className="py-1 pr-2 tabular-nums text-stone-500">{yen(d.その他経費_日次)}</td>
                                <td
                                  className={`py-1 pr-2 tabular-nums font-semibold ${d.営業利益_管理_日次 >= 0 ? "text-emerald-700" : "text-red-600"}`}
                                >
                                  {yen(d.営業利益_管理_日次)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-xs text-stone-500">
                    月次の目標(売上・粗利率・利益)は「入力」タブの「目標」セクションで編集できます。
                  </p>
                </div>
              )}
            </section>
          </>
        )}

        {/* ============ 財務会計タブ ============ */}
        {tab === "financial" && (
          <section className="bg-white rounded-lg border border-stone-200 p-4 space-y-4">
            <div>
              <h2 className="font-semibold">PL(損益計算書) — 実際の入出金ベース</h2>
              <p className="text-xs text-stone-500 mt-1">標準原価ではなく、実際に仕入れた原材料・資材の金額を使います。</p>
            </div>

            {monthlyRows.map((m) => {
              const diff = m.営業利益_財務 - (m.fBudget.profitBudget || 0);
              const 売上総利益 = m.売上_実績 - m.原材料仕入_実績;
              return (
                <div key={m.yearMonth} className="border border-stone-200 rounded-md p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">{m.yearMonth}</span>
                    <span className={`flex items-center gap-1 text-sm font-medium ${diff >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {diff >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      予実差 {yen(diff)}
                    </span>
                  </div>

                  {/* 損益計算書(縦積み) */}
                  <div className="font-mono text-sm">
                    <div className="flex justify-between py-1">
                      <span>売上高</span>
                      <span className="tabular-nums">{yen(m.売上_実績)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-stone-600">
                      <span>売上原価(原材料・資材仕入)</span>
                      <span className="tabular-nums">▲{yen(m.原材料仕入_実績)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-t border-stone-300 font-semibold">
                      <span>売上総利益</span>
                      <span className="tabular-nums">{yen(売上総利益)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-stone-600">
                      <span>販売費及び一般管理費</span>
                      <span className="tabular-nums">▲{yen(m.その他経費_実績)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-t border-stone-300 font-semibold text-base">
                      <span>営業利益</span>
                      <span className={`tabular-nums ${m.営業利益_財務 >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        {yen(m.営業利益_財務)}
                      </span>
                    </div>
                  </div>

                  {/* 参考: 原価差異 */}
                  <div className="mt-3 flex items-center gap-1 text-xs text-stone-500 bg-stone-50 rounded px-2 py-1.5">
                    <Info size={11} className="shrink-0" />
                    <span>
                      (参考)原価差異(原材料仕入実績 − 標準原価) ={" "}
                      <span className={`font-medium ${m.原価差異 >= 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {m.原価差異 >= 0 ? "+" : ""}
                        {yen(m.原価差異)}
                      </span>
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 items-end text-xs">
                    <div>
                      <label className="block text-stone-500 mb-1">原材料仕入_予算</label>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-28"
                        value={m.fBudget.rawMaterialBudget || 0}
                        onChange={(e) => setFinBudgetField(m.yearMonth, "rawMaterialBudget", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-stone-500 mb-1">その他経費_予算</label>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-28"
                        value={m.fBudget.otherExpenseBudget || 0}
                        onChange={(e) => setFinBudgetField(m.yearMonth, "otherExpenseBudget", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-stone-500 mb-1">営業利益_予算</label>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-28"
                        value={m.fBudget.profitBudget || 0}
                        onChange={(e) => setFinBudgetField(m.yearMonth, "profitBudget", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {monthlyRows.length > 0 && (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRows.map((m) => ({ name: m.yearMonth, サマリ: m.営業利益_管理, PL: m.営業利益_財務 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => yen(v)} />
                    <Legend />
                    <Bar dataKey="サマリ" fill="#b45309" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="PL" fill="#57534e" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        )}

        {/* ============ TODOタブ ============ */}
        {tab === "todo" && (
          <>
            <section className="bg-white rounded-lg border border-stone-200 p-4">
              <h2 className="font-semibold mb-3">タスク追加</h2>
              <div className="flex flex-wrap gap-2 items-end mb-3 text-sm">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">カテゴリ</label>
                  <select
                    className="border rounded px-2 py-1"
                    value={todoForm.category}
                    onChange={(e) => setTodoForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {TODO_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">タスク</label>
                  <input
                    className="border rounded px-2 py-1 w-48"
                    value={todoForm.task}
                    onChange={(e) => setTodoForm((f) => ({ ...f, task: e.target.value }))}
                    placeholder="例: 夏メニュー試作"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">期限</label>
                  <input
                    type="date"
                    className="border rounded px-2 py-1"
                    value={todoForm.deadline}
                    onChange={(e) => setTodoForm((f) => ({ ...f, deadline: e.target.value }))}
                  />
                </div>
                <button onClick={addTodo} className="flex items-center gap-1 bg-amber-700 text-white rounded px-3 py-1.5 hover:bg-amber-800">
                  <Plus size={14} /> 追加
                </button>
              </div>
            </section>

            <div className="flex justify-end">
              <button
                onClick={() => setShowSnoozed((v) => !v)}
                className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-full px-3 py-1"
              >
                <span className="text-sm">{showSnoozed ? "👁" : "🙈"}</span>
                ちょっとあと{showSnoozed ? "を表示中" : "は非表示"}
              </button>
            </div>

            <div className="space-y-6">
              {todos.length === 0 && (
                <p className="text-xs text-stone-400 bg-white rounded-lg border border-stone-200 p-4">タスクがありません。</p>
              )}
              {TODO_CATEGORIES.map((category) => {
                const categoryTasks = todos.filter((t) => t.category === category && (showSnoozed || !t.snoozed));
                if (categoryTasks.length === 0) return null;
                return (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-stone-700 mb-2 flex items-center gap-2">
                      {category}
                      <span className="text-xs font-normal text-stone-400">({categoryTasks.length}件)</span>
                    </h3>
                    <div className="space-y-3">
                      {categoryTasks.map((t) => {
                        const taskSubtasks = subtasks.filter((s) => s.parentTaskId === t.id && (showSnoozed || !s.snoozed));
                        const expanded = expandedTaskId === t.id;
                        const sf = getSubtaskForm(t.id);
                        const statusColor =
                          t.status === "完了" ? "bg-emerald-100 text-emerald-700" : t.status === "進行中" ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-600";
                        return (
                  <section key={t.id} className={`bg-white rounded-lg border border-stone-200 p-4 ${t.snoozed ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => setExpandedTaskId(expanded ? null : t.id)}
                        className="flex items-start gap-2 text-left flex-1"
                      >
                        {expanded ? <ChevronDown size={16} className="mt-0.5 text-stone-400 shrink-0" /> : <ChevronRight size={16} className="mt-0.5 text-stone-400 shrink-0" />}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{t.task}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColor}`}>{t.status}</span>
                            {t.snoozed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">ちょっとあと</span>}
                          </div>
                          <div className="text-xs text-stone-400 mt-1">
                            {t.deadline ? `期限: ${t.deadline}` : "期限未設定"} ・ サブタスク{taskSubtasks.length}件
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleTodoSnooze(t.id)}
                          title="ちょっとあと"
                          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded border ${
                            t.snoozed ? "border-amber-300 text-amber-700 bg-amber-50" : "border-stone-200 text-stone-500 hover:bg-stone-50"
                          }`}
                        >
                          <Clock size={11} /> ちょっとあと
                        </button>
                        <select
                          className="border rounded px-1 py-0.5 text-xs"
                          value={t.status}
                          onChange={(e) => updateTodo(t.id, "status", e.target.value)}
                        >
                          {TODO_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => removeTodo(t.id)}>
                          <Trash2 size={13} className="text-stone-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-3 pl-6 border-l-2 border-stone-100 space-y-3">
                        <div className="flex flex-wrap gap-2 items-end text-xs">
                          <div>
                            <label className="block text-stone-500 mb-1">サブタスク名</label>
                            <input
                              className="border rounded px-2 py-1 w-36"
                              value={sf.name}
                              onChange={(e) => setSubtaskFormField(t.id, "name", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-stone-500 mb-1">担当</label>
                            <select
                              className="border rounded px-2 py-1"
                              value={sf.assignee}
                              onChange={(e) => setSubtaskFormField(t.id, "assignee", e.target.value)}
                            >
                              {STAFF_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-stone-500 mb-1">期限</label>
                            <input
                              type="date"
                              className="border rounded px-2 py-1"
                              value={sf.deadline}
                              onChange={(e) => setSubtaskFormField(t.id, "deadline", e.target.value)}
                            />
                          </div>
                          <button
                            onClick={() => addSubtask(t.id)}
                            className="flex items-center gap-1 text-amber-700 hover:text-amber-900"
                          >
                            <Plus size={12} /> 追加
                          </button>
                        </div>

                        <div className="space-y-1">
                          {taskSubtasks.length === 0 && <p className="text-xs text-stone-400">サブタスクなし</p>}
                          {taskSubtasks.map((s, i) => (
                            <div
                              key={s.id}
                              className={`flex items-center gap-2 text-xs border-b border-stone-100 py-1 ${s.snoozed ? "opacity-50" : ""}`}
                            >
                              <div className="flex flex-col shrink-0">
                                <button
                                  onClick={() => moveSubtask(t.id, s.id, -1)}
                                  disabled={i === 0}
                                  className="disabled:opacity-20 text-stone-400 hover:text-stone-700"
                                >
                                  <ChevronUp size={12} />
                                </button>
                                <button
                                  onClick={() => moveSubtask(t.id, s.id, 1)}
                                  disabled={i === taskSubtasks.length - 1}
                                  className="disabled:opacity-20 text-stone-400 hover:text-stone-700"
                                >
                                  <ChevronDown size={12} />
                                </button>
                              </div>
                              <span className="flex-1">
                                {s.name}
                                {s.snoozed && <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-stone-100 text-stone-500">ちょっとあと</span>}
                              </span>
                              <span className="text-stone-500 w-16">{s.assignee}</span>
                              <span className="text-stone-400 w-24">{s.deadline || "期限未設定"}</span>
                              <select
                                className="border rounded px-1 py-0.5"
                                value={s.status}
                                onChange={(e) => updateSubtask(s.id, "status", e.target.value)}
                              >
                                {TODO_STATUSES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => toggleSubtaskSnooze(s.id)}
                                title="ちょっとあと"
                                className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                                  s.snoozed ? "border-amber-300 text-amber-700 bg-amber-50" : "border-stone-200 text-stone-500 hover:bg-stone-50"
                                }`}
                              >
                                <Clock size={11} /> ちょっとあと
                              </button>
                              <button onClick={() => removeSubtask(s.id)}>
                                <Trash2 size={12} className="text-stone-400 hover:text-red-500" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ============ 商品マスタタブ ============ */}
        {tab === "master" && (
          <>
            {selectedProduct && (
              <section className="bg-white rounded-lg border border-stone-200 p-4">
                <div className="flex flex-col gap-3 mb-1">
                  <div>
                    <div className="text-xs text-stone-500 mb-1">区分(検索・新規登録の対象)</div>
                    <div className="flex gap-1 bg-stone-100 rounded-md p-1 w-fit text-xs">
                      {[
                        { value: "single", label: "単品" },
                        { value: "set", label: "セット" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setKindMode(opt.value)}
                          className={`px-3 py-1 rounded ${
                            kindMode === opt.value ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-xs text-stone-500 mb-1">商品を検索・選択</label>
                    <input
                      className="border rounded px-2 py-1 text-sm w-full max-w-xs"
                      value={productQuery}
                      onChange={(e) => {
                        setProductQuery(e.target.value);
                        setComboOpen(true);
                      }}
                      onFocus={() => setComboOpen(true)}
                      onBlur={() => setTimeout(() => setComboOpen(false), 150)}
                      placeholder="商品名の一部を入力"
                      autoComplete="off"
                    />
                    {comboOpen && productQuery.trim() && (
                      <ul className="absolute z-10 mt-1 w-60 bg-white border border-stone-200 rounded shadow-md max-h-48 overflow-y-auto text-xs">
                        {comboMatches.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              className="w-full text-left px-2 py-1.5 hover:bg-amber-50"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSelectedProductId(p.id);
                                setProductQuery("");
                                setComboOpen(false);
                              }}
                            >
                              {p.name}
                              <span className="text-stone-400 ml-1">({yen(p.price)})</span>
                            </button>
                          </li>
                        ))}
                        {!exactMatchExists && (
                          <li className="border-t border-stone-100">
                            <button
                              type="button"
                              className="w-full text-left px-2 py-1.5 hover:bg-amber-50 text-amber-700 flex items-center gap-1"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => createProductFromQuery(productQuery)}
                            >
                              <PlusCircle size={12} />「{productQuery}」を{kindMode === "set" ? "セット" : "単品"}として新規登録
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-stone-500">編集中の商品</div>
                    <div className="text-sm font-semibold">{selectedProduct.name}</div>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-500 mb-1">価格(円)</label>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 text-sm w-28"
                      value={selectedProduct.price}
                      onChange={(e) => updateProduct(selectedProductId, "price", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-stone-500 mb-1">原価率(%)で自動計算</label>
                    <input
                      type="number"
                      step="0.1"
                      className="border rounded px-2 py-1 text-sm w-28"
                      value={costRatioDraft}
                      onFocus={() => setEditingRatio(true)}
                      onChange={(e) => handleCostRatioChange(e.target.value)}
                      onBlur={() => setEditingRatio(false)}
                      placeholder="例: 30"
                    />
                    <p className="text-[10px] text-stone-400 mt-0.5">価格は50円単位で切り上げ</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-stone-100 rounded-md p-3">
                    <div>
                      <div className="text-stone-500">製造原価計</div>
                      <div className="tabular-nums font-medium">{yen(selectedCost?.製造原価計)}</div>
                    </div>
                    <div>
                      <div className="text-stone-500">製造原価単価(÷分割数)</div>
                      <div className="tabular-nums font-medium">{yen(selectedCost?.製造原価単価)}</div>
                    </div>
                    <div>
                      <div className="text-stone-500">包材費計</div>
                      <div className="tabular-nums font-medium">{yen(selectedCost?.梱包材費計)}</div>
                    </div>
                    <div>
                      <div className="text-stone-500">原価(1個あたり)</div>
                      <div className="tabular-nums font-semibold">{yen(selectedCost?.原価)}</div>
                    </div>
                    <div>
                      <div className="text-stone-500">原価率</div>
                      <div className="tabular-nums font-semibold">{pct(selectedCost?.原価率)}</div>
                    </div>
                    <div>
                      <div className="text-stone-500">限界利益率</div>
                      <div className="tabular-nums font-semibold">{pct(selectedCost?.限界利益率)}</div>
                    </div>
                  </div>

                  {(selectedProduct.kind || "single") !== "set" && (
                    <div className="flex items-center gap-2 text-xs">
                      <label className="text-stone-500">分割数(何個分作れるか)</label>
                      <input
                        type="number"
                        min={1}
                        className="border rounded px-2 py-1 w-16"
                        value={selectedRecipe.servings}
                        onChange={(e) => updateServings(selectedProductId, e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value === "" || Number(e.target.value) < 1) updateServings(selectedProductId, "1");
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 材料リスト(単品のみ) */}
                {(selectedProduct.kind || "single") !== "set" && (
                <>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium">材料</h3>
                    <button
                      onClick={() => addIngredientRow(selectedProductId, "ingredients")}
                      className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"
                    >
                      <Plus size={12} /> 材料を追加
                    </button>
                  </div>
                  <div className="space-y-1">
                    {selectedRecipe.ingredients.map((row) => {
                      const mat = materialMap[row.materialId];
                      return (
                        <div key={row.id} className="flex items-center gap-2 text-xs">
                          <select
                            className="border rounded px-2 py-1 flex-1"
                            value={row.materialId}
                            onChange={(e) => updateIngredientRow(selectedProductId, "ingredients", row.id, "materialId", e.target.value)}
                          >
                            {rawMaterials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-20"
                            value={row.amount}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateIngredientRow(selectedProductId, "ingredients", row.id, "amount", e.target.value)}
                          />
                          <span className="text-stone-500 w-6">{mat?.unit || "g"}</span>
                          <span className="w-20 text-right tabular-nums text-stone-500">{yen((mat?.unitPrice || 0) * row.amount)}</span>
                          <button onClick={() => removeIngredientRow(selectedProductId, "ingredients", row.id)}>
                            <Trash2 size={12} className="text-stone-400 hover:text-red-500" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                </>
                )}

                {/* セット内訳(セットのみ) */}
                {selectedProduct.kind === "set" && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium">セット内訳</h3>
                      <button
                        onClick={() => addBreakdownRow(selectedProductId, "component")}
                        className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"
                      >
                        <Plus size={12} /> 構成商品を追加
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-400 mb-2">構成商品は「数量×原価」で計算されます。</p>
                    <div className="space-y-1">
                      {getBreakdown(selectedProductId).map((row) => {
                        const unitCost =
                          row.kind === "component" ? productCosts[row.refId]?.原価 || 0 : materialMap[row.refId]?.unitPrice || 0;
                        const lineCost = row.kind === "component" ? unitCost * (Number(row.qty) || 0) : unitCost;
                        return (
                          <div key={row.id} className="flex items-center gap-2 text-xs">
                            <span
                              className={`shrink-0 w-16 text-center rounded px-1 py-0.5 ${
                                row.kind === "component" ? "bg-amber-50 text-amber-700" : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {row.kind === "component" ? "構成商品" : "梱包・資材"}
                            </span>
                            <select
                              className="border rounded px-2 py-1 flex-1"
                              value={row.refId || ""}
                              onChange={(e) => updateBreakdownRow(selectedProductId, row.id, "refId", e.target.value)}
                            >
                              {row.kind === "component"
                                ? singleProducts
                                    .filter((p) => p.id !== selectedProductId)
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))
                                : materials.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name}
                                    </option>
                                  ))}
                            </select>
                            <input
                              type="number"
                              className="border rounded px-2 py-1 w-16"
                              value={row.qty}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateBreakdownRow(selectedProductId, row.id, "qty", e.target.value)}
                            />
                            <span className="w-24 text-right tabular-nums text-stone-500">{yen(lineCost)}</span>
                            <button onClick={() => removeBreakdownRow(selectedProductId, row.id)}>
                              <Trash2 size={12} className="text-stone-400 hover:text-red-500" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 包材リスト */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium">
                      {selectedProduct.kind === "set" ? "包材(セット全体の外箱など)" : "包材"}
                    </h3>
                    <button
                      onClick={() => addIngredientRow(selectedProductId, "packaging")}
                      className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"
                    >
                      <Plus size={12} /> 包材を追加
                    </button>
                  </div>
                  <div className="space-y-1">
                    {selectedRecipe.packaging.map((row) => {
                      const mat = materialMap[row.materialId];
                      return (
                        <div key={row.id} className="flex items-center gap-2 text-xs">
                          <select
                            className="border rounded px-2 py-1 flex-1"
                            value={row.materialId}
                            onChange={(e) => updateIngredientRow(selectedProductId, "packaging", row.id, "materialId", e.target.value)}
                          >
                            {packMaterials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-20"
                            value={row.amount}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateIngredientRow(selectedProductId, "packaging", row.id, "amount", e.target.value)}
                          />
                          <span className="text-stone-500 w-6">{mat?.unit || "個"}</span>
                          <span className="w-20 text-right tabular-nums text-stone-500">{yen((mat?.unitPrice || 0) * row.amount)}</span>
                          <button onClick={() => removeIngredientRow(selectedProductId, "packaging", row.id)}>
                            <Trash2 size={12} className="text-stone-400 hover:text-red-500" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* 商品マスター一覧 */}
            <section className="bg-white rounded-lg border border-stone-200 p-4">
              <h2 className="font-semibold mb-1">商品マスター(単品)</h2>
              <p className="text-xs text-stone-500 mb-3">
                新規登録は上の検索欄から行います。商品名はレシピ・売上から参照されるキーなので、変更は鉛筆アイコンからのみ行えます。
              </p>

              <button
                onClick={() => setProductListOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-medium mb-2"
              >
                {productListOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                登録済み一覧({products.length}件)
              </button>

              {productListOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-stone-500 border-b">
                        <th className="py-1 pr-2">商品名</th>
                        <th className="py-1 pr-2">区分</th>
                        <th className="py-1 pr-2">価格</th>
                        <th className="py-1 pr-2">材料費(按分後)</th>
                        <th className="py-1 pr-2">包材費</th>
                        <th className="py-1 pr-2">原価</th>
                        <th className="py-1 pr-2">原価率</th>
                        <th className="py-1 pr-2">限界利益</th>
                        <th className="py-1 pr-2">限界利益率</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => {
                        const c = productCosts[p.id];
                        return (
                          <tr
                            key={p.id}
                            className={`border-b border-stone-100 cursor-pointer ${selectedProductId === p.id ? "bg-amber-50" : ""}`}
                            onClick={() => setSelectedProductId(p.id)}
                          >
                            <td className="py-1 pr-2 font-medium">
                              <div className="flex items-center gap-1">
                                {renamingId === p.id ? (
                                  <input
                                    autoFocus
                                    className="border rounded px-1 py-0.5 text-xs w-28"
                                    value={p.name}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => updateProduct(p.id, "name", e.target.value)}
                                    onBlur={() => setRenamingId(null)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") setRenamingId(null);
                                    }}
                                  />
                                ) : (
                                  <span>{p.name}</span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenamingId(renamingId === p.id ? null : p.id);
                                  }}
                                  title="商品名を変更"
                                >
                                  <Pencil size={11} className="text-stone-300 hover:text-amber-700" />
                                </button>
                                {selectedProductId === p.id && <ChevronDown size={12} className="text-amber-700" />}
                              </div>
                            </td>
                            <td className="py-1 pr-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.kind === "set" ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-600"}`}>
                                {p.kind === "set" ? "セット" : "単品"}
                              </span>
                            </td>
                            <td className="py-1 pr-2 tabular-nums">{yen(p.price)}</td>
                            <td className="py-1 pr-2 tabular-nums text-stone-500">{yen(c?.材料費)}</td>
                            <td className="py-1 pr-2 tabular-nums text-stone-500">{yen(c?.梱包材費)}</td>
                            <td className="py-1 pr-2 tabular-nums font-medium">{yen(c?.原価)}</td>
                            <td className="py-1 pr-2 tabular-nums text-stone-500">{pct(c?.原価率)}</td>
                            <td className="py-1 pr-2 tabular-nums">{yen(c?.限界利益)}</td>
                            <td className={`py-1 pr-2 tabular-nums font-semibold ${c?.限界利益率 >= 0.5 ? "text-emerald-700" : "text-amber-700"}`}>
                              {pct(c?.限界利益率)}
                            </td>
                            <td>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProducts((prev) => prev.filter((x) => x.id !== p.id));
                                }}
                              >
                                <Trash2 size={13} className="text-stone-400 hover:text-red-500" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 材料・包材マスタ */}
            <section className="bg-white rounded-lg border border-stone-200 p-4">
              <h2 className="font-semibold mb-3">材料・包材マスタ</h2>
              <div className="flex flex-wrap gap-2 items-end mb-3 text-sm">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">材料名</label>
                  <input
                    className="border rounded px-2 py-1 w-32"
                    value={materialForm.name}
                    onChange={(e) => setMaterialForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="薄力粉"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">区分</label>
                  <select
                    className="border rounded px-2 py-1"
                    value={materialForm.category}
                    onChange={(e) => setMaterialForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    <option value={RAW}>{RAW}</option>
                    <option value={PACK}>{PACK}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">単位</label>
                  <select
                    className="border rounded px-2 py-1"
                    value={materialForm.unit}
                    onChange={(e) => setMaterialForm((f) => ({ ...f, unit: e.target.value }))}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">仕入単価</label>
                  <input
                    type="number"
                    step="0.01"
                    className="border rounded px-2 py-1 w-24"
                    value={materialForm.unitPrice}
                    onChange={(e) => setMaterialForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  />
                </div>
                <button onClick={addMaterial} className="flex items-center gap-1 bg-amber-700 text-white rounded px-3 py-1.5 hover:bg-amber-800">
                  <Plus size={14} /> 追加
                </button>
              </div>

              <button
                onClick={() => setMaterialListOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-medium"
              >
                {materialListOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                登録済み一覧({materials.length}件)
              </button>

              {materialListOpen && (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-stone-500 border-b">
                        <th className="py-1 pr-2">材料名</th>
                        <th className="py-1 pr-2">区分</th>
                        <th className="py-1 pr-2">単位</th>
                        <th className="py-1 pr-2">仕入単価</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((m) => (
                        <tr key={m.id} className="border-b border-stone-100">
                          <td className="py-1 pr-2">
                            <input
                              className="border rounded px-1 py-0.5 w-28"
                              value={m.name}
                              onChange={(e) => updateMaterial(m.id, "name", e.target.value)}
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <select
                              className="border rounded px-1 py-0.5"
                              value={m.category}
                              onChange={(e) => updateMaterial(m.id, "category", e.target.value)}
                            >
                              <option value={RAW}>{RAW}</option>
                              <option value={PACK}>{PACK}</option>
                            </select>
                          </td>
                          <td className="py-1 pr-2">
                            <select
                              className="border rounded px-1 py-0.5"
                              value={m.unit}
                              onChange={(e) => updateMaterial(m.id, "unit", e.target.value)}
                            >
                              {UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1 pr-2">
                            <div className="flex items-center gap-1">
                              <span>¥</span>
                              <input
                                type="number"
                                step="0.01"
                                className="border rounded px-1 py-0.5 w-20"
                                value={m.unitPrice}
                                onChange={(e) => updateMaterial(m.id, "unitPrice", e.target.value)}
                              />
                              <span className="text-stone-400">/ {m.unit}</span>
                            </div>
                          </td>
                          <td>
                            <button onClick={() => removeMaterial(m.id)}>
                              <Trash2 size={13} className="text-stone-400 hover:text-red-500" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 販売先(委託先)マスタ */}
            <section className="bg-white rounded-lg border border-stone-200 p-4">
              <h2 className="font-semibold mb-3">販売先(委託先)マスタ</h2>
              <div className="flex flex-wrap gap-2 items-end mb-3 text-sm">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">販売先</label>
                  <input
                    className="border rounded px-2 py-1 w-32"
                    value={rebateForm.name}
                    onChange={(e) => setRebateForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="□□商店"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">リベート率(%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="border rounded px-2 py-1 w-20"
                    value={rebateForm.rate}
                    onChange={(e) => setRebateForm((f) => ({ ...f, rate: e.target.value }))}
                    placeholder="15"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">備考</label>
                  <input
                    className="border rounded px-2 py-1 w-40"
                    value={rebateForm.memo}
                    onChange={(e) => setRebateForm((f) => ({ ...f, memo: e.target.value }))}
                    placeholder="任意"
                  />
                </div>
                <button onClick={addRebateClient} className="flex items-center gap-1 bg-amber-700 text-white rounded px-3 py-1.5 hover:bg-amber-800">
                  <Plus size={14} /> 追加
                </button>
              </div>

              <button
                onClick={() => setRebateListOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-medium"
              >
                {rebateListOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                登録済み一覧({rebateClients.length}件)
              </button>

              {rebateListOpen && (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-stone-500 border-b">
                        <th className="py-1 pr-2">販売先</th>
                        <th className="py-1 pr-2">リベート率</th>
                        <th className="py-1 pr-2">備考</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rebateClients.map((c) => (
                        <tr key={c.id} className="border-b border-stone-100">
                          <td className="py-1 pr-2">
                            <input
                              className="border rounded px-1 py-0.5 w-28"
                              value={c.name}
                              onChange={(e) => updateRebateClient(c.id, "name", e.target.value)}
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                className="border rounded px-1 py-0.5 w-16"
                                value={Math.round(c.rate * 1000) / 10}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updateRebateClient(c.id, "rate", e.target.value)}
                              />
                              <span className="text-stone-400">%</span>
                            </div>
                          </td>
                          <td className="py-1 pr-2">
                            <input
                              className="border rounded px-1 py-0.5 w-40"
                              value={c.memo || ""}
                              onChange={(e) => updateRebateClient(c.id, "memo", e.target.value)}
                              placeholder="任意"
                            />
                          </td>
                          <td>
                            <button onClick={() => removeRebateClient(c.id)}>
                              <Trash2 size={13} className="text-stone-400 hover:text-red-500" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 経費マスタ(時間単価) */}
            <section className="bg-white rounded-lg border border-stone-200 p-4">
              <h2 className="font-semibold mb-1">経費マスタ(時間単価)</h2>
              <p className="text-xs text-stone-500 mb-3">
                店舗利用料(製造・販売/製造)と人件費は時間単価で管理します。入力タブで時間を入れると自動で金額を計算します。
              </p>

              <button
                onClick={() => setExpenseRateListOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-medium"
              >
                {expenseRateListOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                登録済み一覧({HOURLY_ITEMS.length}件)
              </button>

              {expenseRateListOpen && (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-stone-500 border-b">
                        <th className="py-1 pr-2">項目</th>
                        <th className="py-1 pr-2">時間単価(円/時)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {HOURLY_ITEMS.map((item) => (
                        <tr key={item} className="border-b border-stone-100">
                          <td className="py-1 pr-2">{item}</td>
                          <td className="py-1 pr-2">
                            <div className="flex items-center gap-1">
                              <span>¥</span>
                              <input
                                type="number"
                                className="border rounded px-1 py-0.5 w-24"
                                value={expenseRates[item] || 0}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updateExpenseRate(item, e.target.value)}
                              />
                              <span className="text-stone-400">/ 時間</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Square連携(商品マスタの正の切り替え) */}
            <section className="bg-white rounded-lg border border-stone-200 p-4">
              <h2 className="font-semibold mb-1">Square連携</h2>
              <p className="text-xs text-stone-500 mb-3">
                商品マスタ(商品名・価格)をどちらが正として扱うかを切り替えます。切り替えは現場運用に直結するため、確認ダイアログが出ます。
              </p>
              <div className="flex items-center justify-between border border-stone-200 rounded-md p-3">
                <div>
                  <div className="text-sm font-medium">
                    {squareSyncFromSquare ? "Square → アプリ(現在の運用)" : "アプリ → Square"}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {squareSyncFromSquare
                      ? "商品名・価格はSquare側が正。アプリのレシピ・原価計算は参考表示のみで、価格には反映されません。"
                      : "商品名・価格はアプリ側が正。保存すると即座にSquare Catalogへ反映されます。"}
                  </div>
                </div>
                <button
                  onClick={() => setSquareSyncConfirmOpen(true)}
                  className={`relative w-14 h-7 rounded-full transition shrink-0 ml-4 ${
                    squareSyncFromSquare ? "bg-stone-300" : "bg-amber-700"
                  }`}
                  aria-label="Square連携モード切り替え"
                >
                  <span
                    className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition ${
                      squareSyncFromSquare ? "left-0.5" : "left-7"
                    }`}
                  />
                </button>
              </div>
            </section>

            {/* フェールセーフ確認ダイアログ */}
            {squareSyncConfirmOpen && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
                  <h3 className="font-semibold text-sm mb-2">確認</h3>
                  <p className="text-sm text-stone-700 mb-1">Squareとの商品マスタの連動が変わります。本当に実行しますか?</p>
                  <p className="text-xs text-stone-500 mb-4">
                    切り替え後: {squareSyncFromSquare ? "アプリ → Square(アプリの価格がSquareに反映されます)" : "Square → アプリ(Squareの価格が正に戻ります)"}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setSquareSyncConfirmOpen(false)}
                      className="px-3 py-1.5 text-sm rounded border border-stone-300 text-stone-600 hover:bg-stone-50"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => {
                        setSquareSyncFromSquare((v) => !v);
                        setSquareSyncConfirmOpen(false);
                      }}
                      className="px-3 py-1.5 text-sm rounded bg-amber-700 text-white hover:bg-amber-800"
                    >
                      実行する
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
