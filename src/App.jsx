import { useState, useMemo, useEffect, useRef } from "react";
import { gasApi, isGasReady } from "./api/gas";
import {
  uid,
  RAW,
  PACK,
  RAW_MATERIAL_ITEM,
  FIXED_EXPENSE_ITEMS,
  TODO_CATEGORIES,
  STAFF_OPTIONS,
  TABS,
} from "./lib/constants";
import {
  computeProductCosts,
  computeAllDates,
  computeDailyRows,
  computeAllYearMonths,
  computeMonthlyRows,
  computeMonthlyByChannel,
  computeMonthlyChartData,
  computeDailyChartData,
  computeCustomerChartData,
  computeProductSalesRanking,
  getRecipe,
  getBreakdown,
} from "./lib/calc";
import InputTab from "./components/InputTab";
import SummaryTab from "./components/SummaryTab";
import PLTab from "./components/PLTab";
import TodoTab from "./components/TodoTab";
import MasterTab from "./components/MasterTab";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [tab, setTab] = useState("input");

  // ========== ロード・保存状態 ==========
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle"); // idle|saving|saved|error
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef(null);

  // ========== 材料・包材マスタ ==========
  const [materials, setMaterials] = useState([]);
  const [materialForm, setMaterialForm] = useState({ name: "", category: RAW, unit: "g", unitPrice: "" });
  const [materialListOpen, setMaterialListOpen] = useState(false);

  // ========== 商品マスター(単品・セット)+ レシピ ==========
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState({});
  const [selectedProductId, setSelectedProductId] = useState(null);
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
  const [rebateClients, setRebateClients] = useState([]);
  const [rebateForm, setRebateForm] = useState({ name: "", rate: "", memo: "" });
  const [rebateListOpen, setRebateListOpen] = useState(false);
  const [salesChannels, setSalesChannels] = useState([]); // 読み取り専用(GASでseedされる)

  // ========== 売上(Square由来・読み取り専用)・経費 ==========
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
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
  const [expenseForm, setExpenseForm] = useState({ date: todayStr(), item: RAW_MATERIAL_ITEM, amount: "", hours: "" });

  // 経費マスタ(時間単価。店舗利用料2パターン・人件費が初期値だが、項目名は動的に追加できる)
  const [expenseRates, setExpenseRates] = useState({
    "店舗利用料(製造・販売)": 1500,
    "店舗利用料(製造)": 1200,
    人件費: 1100,
  });
  const [expenseRateForm, setExpenseRateForm] = useState({ name: "", rate: "" });
  const [expenseRateListOpen, setExpenseRateListOpen] = useState(false);

  // Square連携: 商品マスタの正がどちらか(true=Square→アプリ, false=アプリ→Square)
  const [squareSyncFromSquare, setSquareSyncFromSquare] = useState(true);
  const [squareSyncConfirmOpen, setSquareSyncConfirmOpen] = useState(false);
  const [squareSyncLog, setSquareSyncLog] = useState([]);
  const [squareSyncing, setSquareSyncing] = useState(false);

  // ========== TODO・サブタスク ==========
  const [todos, setTodos] = useState([]);
  const [todoForm, setTodoForm] = useState({ category: TODO_CATEGORIES[0], task: "", deadline: "", status: "未着手" });
  const [subtasks, setSubtasks] = useState([]);
  const [subtaskForms, setSubtaskForms] = useState({});
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [showSnoozed, setShowSnoozed] = useState(false); // ちょっとあと表示切り替え(デフォルト非表示)

  // ========== 初回ロード ==========
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isGasReady()) {
        setLoadError("VITE_GAS_URLが設定されていません(.env.localを確認してください)");
        setLoading(false);
        return;
      }
      try {
        const data = await gasApi.getAll();
        if (cancelled) return;
        setMaterials(data.materials || []);
        setProducts(data.products || []);
        setRecipes(data.recipes || {});
        setSetBreakdowns(data.setBreakdowns || {});
        setRebateClients(data.rebateClients || []);
        setSalesChannels(data.salesChannels || []);
        setExpenseRates((prev) => ({ ...prev, ...(data.expenseRates || {}) }));
        setExpenses(data.expenses || []);
        setDailyMeta(data.dailyMeta || {});
        setMgmtBudgets(data.mgmtBudgets || {});
        setFinBudgets(data.finBudgets || {});
        setTodos(data.todos || []);
        setSubtasks(data.subtasks || []);
        setSquareSyncFromSquare(data.settings?.squareSyncFromSquare ?? true);
        setSales(data.sales || []);
        setSquareSyncLog(data.squareSyncLog || []);
        if ((data.products || []).length > 0) setSelectedProductId(data.products[0].id);
        hasLoadedRef.current = true;
        setSaveState("idle");
      } catch (e) {
        setLoadError(String(e.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ========== 自動保存(800msデバウンス。初回ロード完了前は保存しない) ==========
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    setSaveState("saving");
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await gasApi.saveAll({
          materials,
          products,
          recipes,
          setBreakdowns,
          rebateClients,
          expenseRates,
          expenses,
          dailyMeta,
          mgmtBudgets,
          finBudgets,
          todos,
          subtasks,
          settings: { squareSyncFromSquare },
        });
        setSaveState("saved");
        setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2000);
      } catch (e) {
        setSaveState("error");
      }
    }, 800);
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    materials,
    products,
    recipes,
    setBreakdowns,
    rebateClients,
    expenseRates,
    expenses,
    dailyMeta,
    mgmtBudgets,
    finBudgets,
    todos,
    subtasks,
    squareSyncFromSquare,
  ]);

  // ========== 参照マップ ==========
  const materialMap = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials]);
  const rawMaterials = materials.filter((m) => m.category === RAW);
  const packMaterials = materials.filter((m) => m.category === PACK);
  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const singleProducts = products.filter((p) => p.kind !== "set");
  const rebateMap = useMemo(() => Object.fromEntries(rebateClients.map((c) => [c.id, c])), [rebateClients]);
  const channelMap = useMemo(() => Object.fromEntries(salesChannels.map((c) => [c.id, c])), [salesChannels]);

  // ========== 原価計算 ==========
  const productCosts = useMemo(
    () => computeProductCosts({ products, recipes, setBreakdowns, materialMap }),
    [products, recipes, setBreakdowns, materialMap]
  );

  // ========== 日次・月次集計 ==========
  const allDates = useMemo(() => computeAllDates({ sales, expenses, dailyMeta }), [sales, expenses, dailyMeta]);
  const dailyRows = useMemo(
    () => computeDailyRows({ allDates, sales, expenses, dailyMeta, channelMap, rebateMap, productCosts }),
    [allDates, sales, expenses, dailyMeta, channelMap, rebateMap, productCosts]
  );
  const allYearMonths = useMemo(
    () => computeAllYearMonths({ dailyRows, mgmtBudgets, finBudgets }),
    [dailyRows, mgmtBudgets, finBudgets]
  );
  const monthlyRows = useMemo(
    () => computeMonthlyRows({ allYearMonths, dailyRows, mgmtBudgets, finBudgets }),
    [allYearMonths, dailyRows, mgmtBudgets, finBudgets]
  );

  // ========== サマリタブ用データ ==========
  const monthlyByChannel = useMemo(
    () => computeMonthlyByChannel({ dailyRows, monthChannel, allYearMonths }),
    [dailyRows, monthChannel, allYearMonths]
  );
  const monthlyChartData = useMemo(
    () => computeMonthlyChartData({ monthlyByChannel, monthMetric, monthChannel, mgmtBudgets }),
    [monthlyByChannel, monthMetric, monthChannel, mgmtBudgets]
  );
  const dailyChartData = useMemo(
    () => computeDailyChartData({ dailyRows, dayChannel, dayMetric }),
    [dailyRows, dayChannel, dayMetric]
  );
  const customerChartData = useMemo(() => computeCustomerChartData(dailyRows), [dailyRows]);
  const productSalesRanking = useMemo(
    () => computeProductSalesRanking({ sales, productMap }),
    [sales, productMap]
  );

  // ========== ハンドラ: 材料マスタ ==========
  // 材料・商品は既存データ(原材料・資材マスタ/レシピ/セット内訳マスタ)が名前をキーにしているため、
  // id = name として扱う。名前の変更は commitMaterialRename/commitProductRename で
  // レシピ・セット内訳側の参照も連動して書き換える(id自体は編集中は変えず、確定時にのみ変更する)。
  const addMaterial = () => {
    const trimmed = materialForm.name.trim();
    if (!trimmed || materialForm.unitPrice === "") return;
    if (materials.some((m) => m.id === trimmed)) return; // 同名は追加しない
    setMaterials((prev) => [...prev, { id: trimmed, name: trimmed, category: materialForm.category, unit: materialForm.unit, unitPrice: Number(materialForm.unitPrice) }]);
    setMaterialForm({ name: "", category: RAW, unit: "g", unitPrice: "" });
  };
  const updateMaterial = (id, field, value) => {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: field === "unitPrice" ? Number(value) : value } : m)));
  };
  const commitMaterialRename = (id) => {
    const material = materials.find((m) => m.id === id);
    if (!material) return;
    const trimmed = (material.name || "").trim();
    if (!trimmed || trimmed === id) return;
    if (materials.some((m) => m.id !== id && m.id === trimmed)) return; // 既存の別材料と同名なら変更しない
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, id: trimmed, name: trimmed } : m)));
    setRecipes((prev) => {
      const next = {};
      Object.keys(prev).forEach((pid) => {
        const r = prev[pid];
        next[pid] = {
          ...r,
          ingredients: r.ingredients.map((ing) => (ing.materialId === id ? { ...ing, materialId: trimmed } : ing)),
          packaging: r.packaging.map((pk) => (pk.materialId === id ? { ...pk, materialId: trimmed } : pk)),
        };
      });
      return next;
    });
    setSetBreakdowns((prev) => {
      const next = {};
      Object.keys(prev).forEach((pid) => {
        next[pid] = prev[pid].map((row) => (row.kind === "material" && row.refId === id ? { ...row, refId: trimmed } : row));
      });
      return next;
    });
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
  const commitProductRename = (id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const trimmed = (product.name || "").trim();
    if (!trimmed || trimmed === id) return;
    if (products.some((p) => p.id !== id && p.id === trimmed)) return; // 既存の別商品と同名なら変更しない
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, id: trimmed, name: trimmed } : p)));
    setRecipes((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      next[trimmed] = next[id];
      delete next[id];
      return next;
    });
    setSetBreakdowns((prev) => {
      const next = {};
      Object.keys(prev).forEach((pid) => {
        const rows = prev[pid].map((row) => (row.kind === "component" && row.refId === id ? { ...row, refId: trimmed } : row));
        next[pid === id ? trimmed : pid] = rows;
      });
      return next;
    });
    if (selectedProductId === id) setSelectedProductId(trimmed);
  };
  const createProductFromQuery = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (products.some((p) => p.id === trimmed)) {
      setSelectedProductId(trimmed);
      setProductQuery("");
      setComboOpen(false);
      return;
    }
    const id = trimmed; // 既存データ(レシピ・セット内訳マスタ)が商品名をキーにしているためidは名前そのもの
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
    setRecipes((prev) => ({ ...prev, [productId]: { ...getRecipe(prev, productId), servings: value } }));
  };
  const addIngredientRow = (productId, kind) => {
    const defaultMaterial = kind === "ingredients" ? rawMaterials[0]?.id : packMaterials[0]?.id;
    const defaultAmount = kind === "packaging" ? 1 : 0;
    setRecipes((prev) => {
      const r = getRecipe(prev, productId);
      return { ...prev, [productId]: { ...r, [kind]: [...r[kind], { id: uid(), materialId: defaultMaterial, amount: defaultAmount }] } };
    });
  };
  const updateIngredientRow = (productId, kind, rowId, field, value) => {
    setRecipes((prev) => {
      const r = getRecipe(prev, productId);
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
      const r = getRecipe(prev, productId);
      return { ...prev, [productId]: { ...r, [kind]: r[kind].filter((row) => row.id !== rowId) } };
    });
  };

  const selectedRecipe = getRecipe(recipes, selectedProductId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedCost = productCosts[selectedProductId];

  useEffect(() => {
    setProductQuery("");
  }, [selectedProductId]);

  // 検索・登録モードのトグルを、選択中商品の区分と同期させる
  useEffect(() => {
    if (selectedProduct) setKindMode(selectedProduct.kind || "single");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  useEffect(() => {
    if (editingRatio) return;
    if (!selectedProduct || !selectedCost) return;
    const ratio = selectedProduct.price > 0 ? (selectedCost.原価 / selectedProduct.price) * 100 : 0;
    setCostRatioDraft(ratio ? ratio.toFixed(1) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const isHourlyExpenseItem = (item) => Object.prototype.hasOwnProperty.call(expenseRates, item);
  const expenseItemOptions = [
    RAW_MATERIAL_ITEM,
    ...Object.keys(expenseRates).filter((it) => it !== RAW_MATERIAL_ITEM),
    ...FIXED_EXPENSE_ITEMS.filter((it) => it !== RAW_MATERIAL_ITEM),
  ];
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
    const entry = { id: uid(), date: expenseForm.date, item: expenseForm.item, amount };
    if (isHourly) entry.hours = Number(expenseForm.hours);
    setExpenses((prev) => [...prev, entry]);
    setExpenseForm((f) => ({ ...f, amount: "", hours: "" }));
  };
  const removeExpense = (id) => setExpenses((prev) => prev.filter((x) => x.id !== id));
  const updateExpenseRate = (item, value) => setExpenseRates((prev) => ({ ...prev, [item]: Number(value) || 0 }));
  const addExpenseRate = () => {
    const trimmed = expenseRateForm.name.trim();
    if (!trimmed) return;
    setExpenseRates((prev) => ({ ...prev, [trimmed]: Number(expenseRateForm.rate) || 0 }));
    setExpenseRateForm({ name: "", rate: "" });
  };
  const removeExpenseRate = (item) =>
    setExpenseRates((prev) => {
      const next = { ...prev };
      delete next[item];
      return next;
    });

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

  // --- ハンドラ: Square連携 ---
  const confirmSquareSyncToggle = () => {
    setSquareSyncFromSquare((v) => !v);
    setSquareSyncConfirmOpen(false);
  };
  const runSyncCatalogFromSquare = async () => {
    setSquareSyncing(true);
    try {
      const res = await gasApi.syncCatalogFromSquare();
      if (res.products) setProducts(res.products);
      if (res.squareSyncLog) setSquareSyncLog(res.squareSyncLog);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setSquareSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-500 text-sm">
        読み込み中…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <header className="border-b border-stone-300 pb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs tracking-widest text-amber-700 font-semibold uppercase">カモの小屋 収益分析</p>
              <h1 className="text-2xl font-bold mt-1">収益分析アプリ</h1>
              <p className="text-sm text-stone-500 mt-1">商品マスタで計算した原価が、売上の日次・月次集計にそのまま連動します。</p>
            </div>
            <SaveIndicator state={saveState} loadError={loadError} />
          </div>
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

        {tab === "input" && (
          <InputTab
            targetForm={targetForm}
            setTargetForm={setTargetForm}
            addTarget={addTarget}
            targetListOpen={targetListOpen}
            setTargetListOpen={setTargetListOpen}
            mgmtBudgets={mgmtBudgets}
            editingTargetMonth={editingTargetMonth}
            setEditingTargetMonth={setEditingTargetMonth}
            removeTargetMonth={removeTargetMonth}
            setMgmtBudgetField={setMgmtBudgetField}
            allDates={allDates}
            dailyMeta={dailyMeta}
            channelMap={channelMap}
            salesChannels={salesChannels}
            rebateClients={rebateClients}
            setDayField={setDayField}
            expenseForm={expenseForm}
            setExpenseForm={setExpenseForm}
            isHourlyExpenseItem={isHourlyExpenseItem}
            expenseItemOptions={expenseItemOptions}
            expenseRates={expenseRates}
            addExpense={addExpense}
            expenses={expenses}
            removeExpense={removeExpense}
          />
        )}

        {tab === "management" && (
          <SummaryTab
            monthMetric={monthMetric}
            setMonthMetric={setMonthMetric}
            monthChannel={monthChannel}
            setMonthChannel={setMonthChannel}
            salesChannels={salesChannels}
            monthlyChartData={monthlyChartData}
            dayMetric={dayMetric}
            setDayMetric={setDayMetric}
            dayChannel={dayChannel}
            setDayChannel={setDayChannel}
            dailyChartData={dailyChartData}
            customerChartData={customerChartData}
            productSalesRanking={productSalesRanking}
            summaryDetailOpen={summaryDetailOpen}
            setSummaryDetailOpen={setSummaryDetailOpen}
            dailyRows={dailyRows}
            channelMap={channelMap}
            rebateMap={rebateMap}
          />
        )}

        {tab === "financial" && <PLTab monthlyRows={monthlyRows} setFinBudgetField={setFinBudgetField} />}

        {tab === "todo" && (
          <TodoTab
            todoForm={todoForm}
            setTodoForm={setTodoForm}
            addTodo={addTodo}
            todos={todos}
            subtasks={subtasks}
            subtaskForms={subtaskForms}
            expandedTaskId={expandedTaskId}
            setExpandedTaskId={setExpandedTaskId}
            getSubtaskForm={getSubtaskForm}
            setSubtaskFormField={setSubtaskFormField}
            addSubtask={addSubtask}
            updateTodo={updateTodo}
            toggleTodoSnooze={toggleTodoSnooze}
            removeTodo={removeTodo}
            updateSubtask={updateSubtask}
            toggleSubtaskSnooze={toggleSubtaskSnooze}
            removeSubtask={removeSubtask}
            moveSubtask={moveSubtask}
            showSnoozed={showSnoozed}
            setShowSnoozed={setShowSnoozed}
          />
        )}

        {tab === "master" && (
          <MasterTab
            selectedProduct={selectedProduct}
            selectedRecipe={selectedRecipe}
            selectedCost={selectedCost}
            selectedProductId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            kindMode={kindMode}
            setKindMode={setKindMode}
            productQuery={productQuery}
            setProductQuery={setProductQuery}
            comboOpen={comboOpen}
            setComboOpen={setComboOpen}
            comboMatches={comboMatches}
            exactMatchExists={exactMatchExists}
            createProductFromQuery={createProductFromQuery}
            updateProduct={updateProduct}
            commitProductRename={commitProductRename}
            costRatioDraft={costRatioDraft}
            handleCostRatioChange={handleCostRatioChange}
            setEditingRatio={setEditingRatio}
            updateServings={updateServings}
            rawMaterials={rawMaterials}
            packMaterials={packMaterials}
            materials={materials}
            materialMap={materialMap}
            addIngredientRow={addIngredientRow}
            updateIngredientRow={updateIngredientRow}
            removeIngredientRow={removeIngredientRow}
            singleProducts={singleProducts}
            getBreakdown={(pid) => getBreakdown(setBreakdowns, pid)}
            addBreakdownRow={addBreakdownRow}
            updateBreakdownRow={updateBreakdownRow}
            removeBreakdownRow={removeBreakdownRow}
            productCosts={productCosts}
            products={products}
            productListOpen={productListOpen}
            setProductListOpen={setProductListOpen}
            renamingId={renamingId}
            setRenamingId={setRenamingId}
            setProducts={setProducts}
            materialForm={materialForm}
            setMaterialForm={setMaterialForm}
            addMaterial={addMaterial}
            materialListOpen={materialListOpen}
            setMaterialListOpen={setMaterialListOpen}
            updateMaterial={updateMaterial}
            commitMaterialRename={commitMaterialRename}
            removeMaterial={removeMaterial}
            rebateForm={rebateForm}
            setRebateForm={setRebateForm}
            addRebateClient={addRebateClient}
            rebateListOpen={rebateListOpen}
            setRebateListOpen={setRebateListOpen}
            rebateClients={rebateClients}
            updateRebateClient={updateRebateClient}
            removeRebateClient={removeRebateClient}
            expenseRates={expenseRates}
            expenseRateForm={expenseRateForm}
            setExpenseRateForm={setExpenseRateForm}
            addExpenseRate={addExpenseRate}
            removeExpenseRate={removeExpenseRate}
            expenseRateListOpen={expenseRateListOpen}
            setExpenseRateListOpen={setExpenseRateListOpen}
            updateExpenseRate={updateExpenseRate}
            squareSyncFromSquare={squareSyncFromSquare}
            squareSyncConfirmOpen={squareSyncConfirmOpen}
            setSquareSyncConfirmOpen={setSquareSyncConfirmOpen}
            confirmSquareSyncToggle={confirmSquareSyncToggle}
            squareSyncLog={squareSyncLog}
            squareSyncing={squareSyncing}
            runSyncCatalogFromSquare={runSyncCatalogFromSquare}
          />
        )}
      </div>
    </div>
  );
}

function SaveIndicator({ state, loadError }) {
  if (loadError) return <span className="text-xs text-red-600">{loadError}</span>;
  const label = { idle: "", saving: "保存中…", saved: "保存しました", error: "保存に失敗しました" }[state];
  if (!label) return null;
  const color = state === "error" ? "text-red-600" : "text-stone-400";
  return <span className={`text-xs ${color} shrink-0`}>{label}</span>;
}
