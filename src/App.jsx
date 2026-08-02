import { useState, useMemo, useEffect, useRef } from "react";
import { gasApi, isGasReady, loadTaskmaniaProjects } from "./api/gas";
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
  computeSettingDates,
  computeDailyRows,
  computeAllYearMonths,
  computeMonthlyRows,
  computeMonthlyByChannel,
  computeMonthlyChartData,
  computeDailyChartData,
  computeCustomerChartData,
  computeProductSalesRanking,
  computeDataGaps,
  getRecipe,
  getBreakdown,
} from "./lib/calc";
import InputTab from "./components/InputTab";
import CalendarTab from "./components/CalendarTab";
import SummaryTab from "./components/SummaryTab";
import PLTab from "./components/PLTab";
import TodoTab from "./components/TodoTab";
import MasterTab from "./components/MasterTab";

const todayStr = () => new Date().toISOString().slice(0, 10);

// 読み込み中画面で、画面上をランダムに歩き回るカモ(絵文字)
// タスクマニア(家族タブの「カモの小屋」PJ)側で完了操作されたサブタスクの状態を、
// このアプリのTODOサブタスクへ反映する。タイムスタンプが新しい方が勝つ双方向同期の
// カモ側担当分。「進行中」への巻き戻しはできず、完了↔未着手の2値でのみ反映される。
function mergeTaskmaniaCompletion(subtasks, taskmaniaProjects) {
  const doneBySourceId = {};
  (taskmaniaProjects || []).forEach((p) => {
    (p.tasks || []).forEach((t) => {
      (t.subtasks || []).forEach((s) => {
        if (s.sourceSubtaskId) doneBySourceId[s.sourceSubtaskId] = { done: !!s.done, doneUpdatedAt: s.doneUpdatedAt || 0 };
      });
    });
  });
  if (Object.keys(doneBySourceId).length === 0) return subtasks;

  let changed = false;
  const next = subtasks.map((s) => {
    const match = doneBySourceId[s.id];
    if (!match) return s;
    if (match.doneUpdatedAt <= (s.statusUpdatedAt || 0)) return s;
    const wantStatus = match.done ? "完了" : "未着手";
    if (s.status === wantStatus) return s;
    changed = true;
    return { ...s, status: wantStatus, statusUpdatedAt: match.doneUpdatedAt };
  });
  return changed ? next : subtasks;
}

function WanderingDuck() {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [facingLeft, setFacingLeft] = useState(false);

  useEffect(() => {
    const wander = () => {
      setPos((prev) => {
        const nextX = 8 + Math.random() * 84;
        const nextY = 12 + Math.random() * 76;
        setFacingLeft(nextX < prev.x);
        return { x: nextX, y: nextY };
      });
    };
    wander();
    const timer = setInterval(wander, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed text-4xl pointer-events-none transition-[left,top] duration-[2000ms] ease-in-out"
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: `translate(-50%, -50%) scaleX(${facingLeft ? -1 : 1})` }}
    >
      🦆
    </div>
  );
}

// 自動保存の共通ロジック(デバウンス + 保存中の多重発火防止)。
// snapshotRefは常に最新のデータを保持するref(保存関数は毎回この時点の最新値を送る)。
// 保存中に次の変更が来た場合は待ち行列を作らず「保存完了後にもう一度だけ」保存する
// (連投すると同じスプレッドシートへの書き込みが重なりGAS側が詰まるため)。
function useAutosave(hasLoadedRef, snapshotRef, saveFn, setSaveState, deps) {
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const timerRef = useRef(null);

  async function runSave() {
    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }
    savingRef.current = true;
    try {
      await saveFn(snapshotRef.current);
      setSaveState("saved");
      setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setSaveState("error");
    } finally {
      savingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        runSave();
      }
    }
  }

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    setSaveState("saving");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(runSave, 800);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default function App() {
  const [tab, setTab] = useState("input");

  // ========== ロード・保存状態 ==========
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle"); // idle|saving|saved|error
  const hasLoadedRef = useRef(false);

  // ========== 材料・包材マスタ ==========
  const [materials, setMaterials] = useState([]);
  const [materialForm, setMaterialForm] = useState({ name: "", category: RAW, unit: "g", unitPrice: "" });
  const [materialListOpen, setMaterialListOpen] = useState(false);

  // ========== 商品マスター(単品・セット)+ レシピ ==========
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState({});
  const [productListOpen, setProductListOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [comboOpen, setComboOpen] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [editingRatio, setEditingRatio] = useState(false);
  const [costRatioDraft, setCostRatioDraft] = useState("");
  const [kindMode, setKindMode] = useState("single"); // 検索・新規登録の対象("single"|"set")
  // ヌケモレチェック「商品マスタで包材費が0円」で、個別に「不要」扱いにした商品idの一覧
  const [packagingExemptions, setPackagingExemptions] = useState([]);
  const [aliasListOpen, setAliasListOpen] = useState(false);
  const [saleOverrideListOpen, setSaleOverrideListOpen] = useState(false);
  const [packagingExemptListOpen, setPackagingExemptListOpen] = useState(false);

  // 商品マスタの編集ドラフト: 検索/新規登録→編集画面表示→「保存」で初めてproducts/recipes/setBreakdownsに反映される
  const [productDraft, setProductDraft] = useState(null);
  const [productDraftSnapshot, setProductDraftSnapshot] = useState(null);
  const [pendingProductSwitch, setPendingProductSwitch] = useState(null);

  // セット商品の内訳(構成商品 or 梱包・資材の行の可変長リスト)
  const [setBreakdowns, setSetBreakdowns] = useState({}); // { [productId]: [{id, kind:'component'|'material', refId, qty}] }

  // ========== 販売形態・委託先マスタ ==========
  const [rebateClients, setRebateClients] = useState([]);
  const [rebateForm, setRebateForm] = useState({ name: "", rate: "", memo: "" });
  const [rebateListOpen, setRebateListOpen] = useState(false);
  const [salesChannels, setSalesChannels] = useState([]); // 読み取り専用(GASでseedされる)

  // ========== 売上(Square由来・読み取り専用)・経費 ==========
  const [sales, setSales] = useState([]);
  // 売上の商品名(rawName)が商品マスタと一致しない場合に、既存商品へ統合するためのマッピング
  const [productAliases, setProductAliases] = useState({}); // { [rawName]: productId }
  // 売上明細1行(saleId)単位で商品・数量を個別に上書きするマッピング(同名でも日によって実商品が違う場合用)
  const [saleOverrides, setSaleOverrides] = useState({}); // { [saleId]: { productId, qty } }
  const [expenses, setExpenses] = useState([]);
  const [dailyMeta, setDailyMeta] = useState({}); // { [date]: { channelId, clientId } }
  const [mgmtBudgets, setMgmtBudgets] = useState({});

  // サマリタブのフィルタ
  const [monthMetric, setMonthMetric] = useState("sales"); // 'sales'|'gross'|'profit'
  const [monthChannel, setMonthChannel] = useState("all");
  const [dayMetric, setDayMetric] = useState("sales");
  const [dayChannel, setDayChannel] = useState("all");
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
  const [recalcZeroCostRunning, setRecalcZeroCostRunning] = useState(false);
  const [recalcZeroCostResult, setRecalcZeroCostResult] = useState(null);
  const [salesSyncing, setSalesSyncing] = useState(false);

  // ========== TODO・サブタスク ==========
  const [todos, setTodos] = useState([]);
  const [todoForm, setTodoForm] = useState({ category: TODO_CATEGORIES[0], task: "", deadline: "", status: "未着手" });
  const [subtasks, setSubtasks] = useState([]);
  const [subtaskForms, setSubtaskForms] = useState({});
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [showSnoozed, setShowSnoozed] = useState(false); // ちょっとあと表示切り替え(デフォルト非表示)
  const [showCompletedTodos, setShowCompletedTodos] = useState(false); // 完了済み表示切り替え(デフォルト非表示)

  // ========== カレンダー(出店計画・イベント予定) ==========
  const [calendarEvents, setCalendarEvents] = useState([]); // [{id, date, title, memo}]

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
        setCalendarEvents(data.calendarEvents || []);
        setProducts(data.products || []);
        setProductAliases(data.productAliases || {});
        setSaleOverrides(data.saleOverrides || {});
        setPackagingExemptions(data.packagingExemptions || []);
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
        hasLoadedRef.current = true;
        setSaveState("idle");
        try {
          const { projects: taskmaniaProjects } = await loadTaskmaniaProjects();
          if (!cancelled) setSubtasks((prev) => mergeTaskmaniaCompletion(prev, taskmaniaProjects));
        } catch {
          // タスクマニア側が読み込めなくても、カモの小屋自体の読み込みは成功扱いのまま続行する
        }
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
  // TODO/サブタスクは他の15シートと切り離した軽量経路(saveTodos)で保存する。
  // 理由: 編集頻度が高く、全シート分の保存(saveAll)を毎回発生させるとGAS側の
  // 書き込みが重なって詰まりやすいため。
  const mainSaveDataRef = useRef(null);
  useEffect(() => {
    mainSaveDataRef.current = {
      materials,
      calendarEvents,
      products,
      productAliases,
      saleOverrides,
      packagingExemptions,
      recipes,
      setBreakdowns,
      rebateClients,
      expenseRates,
      expenses,
      dailyMeta,
      mgmtBudgets,
      finBudgets,
      settings: { squareSyncFromSquare },
    };
  });
  useAutosave(hasLoadedRef, mainSaveDataRef, gasApi.saveAll, setSaveState, [
    materials,
    calendarEvents,
    products,
    productAliases,
    saleOverrides,
    packagingExemptions,
    recipes,
    setBreakdowns,
    rebateClients,
    expenseRates,
    expenses,
    dailyMeta,
    mgmtBudgets,
    finBudgets,
    squareSyncFromSquare,
  ]);

  const todosSaveDataRef = useRef(null);
  useEffect(() => {
    todosSaveDataRef.current = { todos, subtasks };
  });
  useAutosave(hasLoadedRef, todosSaveDataRef, gasApi.saveTodos, setSaveState, [todos, subtasks]);

  // ========== 参照マップ ==========
  const materialMap = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials]);
  const rawMaterials = materials.filter((m) => m.category === RAW);
  const packMaterials = materials.filter((m) => m.category === PACK);
  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const singleProducts = products.filter((p) => p.kind !== "set");
  // 旧AppSheet由来のデータ等、日次集計シートの委託先列にIDでなく名前がそのまま
  // 入っているケースがあるため、IDと名前の両方でも引けるようにする
  const rebateMap = useMemo(() => {
    const map = {};
    rebateClients.forEach((c) => {
      map[c.id] = c;
      if (c.name) map[c.name] = c;
    });
    return map;
  }, [rebateClients]);
  const channelMap = useMemo(() => Object.fromEntries(salesChannels.map((c) => [c.id, c])), [salesChannels]);

  // ========== 原価計算 ==========
  const productCosts = useMemo(
    () => computeProductCosts({ products, recipes, setBreakdowns, materialMap }),
    [products, recipes, setBreakdowns, materialMap]
  );

  // 売上の商品名が商品マスタに無い場合でも、個別修正(saleId単位)またはエイリアス(rawName一括)
  // 設定があれば解決先の商品として扱う。個別修正が優先(同じ不明な商品名でも日によって実商品が
  // 違う場合に対応するため)。原価スナップショットは解決先の現在の原価でライブ再計算する
  // (未登録商品として0円でスタンプされている可能性があるため)。
  const resolvedSales = useMemo(
    () =>
      sales.map((s) => {
        const override = saleOverrides[s.id];
        if (override && override.productId) {
          const qty = Number(override.qty) || 0;
          const cost = productCosts[override.productId]?.原価 || 0;
          return { ...s, productId: override.productId, qty, unitCostAtSale: cost, costSubtotal: cost * qty };
        }
        const aliasTarget = productAliases[s.productId];
        if (!aliasTarget) return s;
        const cost = productCosts[aliasTarget]?.原価 || 0;
        return { ...s, productId: aliasTarget, unitCostAtSale: cost, costSubtotal: cost * s.qty };
      }),
    [sales, saleOverrides, productAliases, productCosts]
  );

  // ========== 日次・月次集計 ==========
  const allDates = useMemo(
    () => computeAllDates({ sales: resolvedSales, expenses, dailyMeta }),
    [resolvedSales, expenses, dailyMeta]
  );
  const settingDates = useMemo(
    () => computeSettingDates({ sales: resolvedSales, dailyMeta }),
    [resolvedSales, dailyMeta]
  );
  const dailyRows = useMemo(
    () => computeDailyRows({ allDates, sales: resolvedSales, expenses, dailyMeta, channelMap, rebateMap, productCosts }),
    [allDates, resolvedSales, expenses, dailyMeta, channelMap, rebateMap, productCosts]
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
    () => computeProductSalesRanking({ sales: resolvedSales, productMap }),
    [resolvedSales, productMap]
  );
  const dataGaps = useMemo(
    () =>
      computeDataGaps({
        settingDates,
        dailyMeta,
        sales: resolvedSales,
        productMap,
        expenses,
        products,
        productCosts,
        materials,
        packagingExemptIds: packagingExemptions,
      }),
    [settingDates, dailyMeta, resolvedSales, productMap, expenses, products, productCosts, materials, packagingExemptions]
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
  const removeMaterial = (id) => {
    if (!window.confirm("削除しますか？")) return;
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

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
  const removeRebateClient = (id) => {
    if (!window.confirm("削除しますか？")) return;
    setRebateClients((prev) => prev.filter((c) => c.id !== id));
  };

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
  };

  // --- 商品編集ドラフト(検索/新規登録→編集画面→「保存」で初めて確定するまでの一時編集state) ---
  const buildDraftFromProduct = (product) => {
    const recipe = getRecipe(recipes, product.id);
    return {
      id: product.id,
      isNew: false,
      name: product.name,
      price: product.price,
      kind: product.kind || "single",
      servings: recipe.servings,
      ingredients: recipe.ingredients,
      packaging: recipe.packaging,
      breakdown: getBreakdown(setBreakdowns, product.id),
      procedure: product.procedure || "",
    };
  };
  const buildNewDraft = (name, kind) => ({
    id: name,
    isNew: true,
    name,
    price: 0,
    kind,
    servings: 1,
    ingredients: [],
    packaging: [],
    breakdown: [],
    procedure: "",
  });
  const openProductDraft = (product) => {
    const draft = buildDraftFromProduct(product);
    setProductDraft(draft);
    setProductDraftSnapshot(JSON.stringify(draft));
    setProductQuery("");
    setComboOpen(false);
  };
  const openNewProductDraft = (name, kind) => {
    setProductDraft(buildNewDraft(name, kind));
    setProductDraftSnapshot(null);
    setProductQuery("");
    setComboOpen(false);
  };
  const isProductDraftDirty = () => {
    if (!productDraft) return false;
    if (productDraft.isNew) return true;
    return JSON.stringify(productDraft) !== productDraftSnapshot;
  };
  const requestOpenProduct = (product) => {
    if (isProductDraftDirty()) {
      setPendingProductSwitch(() => () => openProductDraft(product));
      return;
    }
    openProductDraft(product);
  };
  const requestCreateProduct = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = products.find((p) => p.id === trimmed);
    const action = existing ? () => openProductDraft(existing) : () => openNewProductDraft(trimmed, kindMode);
    if (isProductDraftDirty()) {
      setPendingProductSwitch(() => action);
      return;
    }
    action();
  };
  const confirmDiscardAndSwitchProduct = () => {
    const action = pendingProductSwitch;
    setPendingProductSwitch(null);
    if (action) action();
  };
  const cancelPendingProductSwitch = () => setPendingProductSwitch(null);

  // ヌケモレチェックから商品編集へ直接ジャンプ(既存商品は開く、未登録なら新規登録フォームを開く)
  const jumpToProductInMaster = (name) => {
    setTab("master");
    const existing = products.find((p) => p.id === name || p.name === name);
    if (existing) {
      requestOpenProduct(existing);
    } else {
      requestCreateProduct(name);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById("product-edit-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  // ヌケモレチェックの「商品マスタに無い(不明)」商品名を、既存商品の売上としてマージする
  const mergeProductAlias = (rawName, productId) => {
    if (!rawName || !productId) return;
    setProductAliases((prev) => ({ ...prev, [rawName]: productId }));
  };
  const removeProductAlias = (rawName) => {
    setProductAliases((prev) => {
      const next = { ...prev };
      delete next[rawName];
      return next;
    });
  };

  // ヌケモレチェックの「商品マスタに無い(不明)」明細1行を、個別に商品・数量を指定して解決する
  const setSaleOverride = (saleId, productId, qty) => {
    if (!saleId || !productId) return;
    setSaleOverrides((prev) => ({ ...prev, [saleId]: { productId, qty: Number(qty) || 0 } }));
  };
  const removeSaleOverride = (saleId) => {
    setSaleOverrides((prev) => {
      const next = { ...prev };
      delete next[saleId];
      return next;
    });
  };

  // ヌケモレチェック「商品マスタで包材費が0円」を個別に「不要」扱いにする(トグル)
  const togglePackagingExempt = (productId) => {
    setPackagingExemptions((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  // ヌケモレチェックから材料・包材マスタの該当行へ直接ジャンプ
  const jumpToMaterialInMaster = (name) => {
    setTab("master");
    setMaterialListOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(`material-row-${name}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  const saveProductDraft = () => {
    if (!productDraft) return;
    const { id, name, price, kind, servings, ingredients, packaging, breakdown, procedure, isNew } = productDraft;
    if (isNew) {
      setProducts((prev) => [...prev, { id, name, price, kind, procedure }]);
    } else {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, price, kind, procedure } : p)));
    }
    setRecipes((prev) => ({ ...prev, [id]: { servings, ingredients, packaging } }));
    setSetBreakdowns((prev) => ({ ...prev, [id]: breakdown }));
    setProductDraft(null);
    setProductDraftSnapshot(null);
  };
  const cancelProductDraft = () => {
    setProductDraft(null);
    setProductDraftSnapshot(null);
  };

  const updateDraftField = (field, value) => {
    setProductDraft((prev) => ({ ...prev, [field]: field === "price" ? Number(value) : value }));
  };
  const updateDraftServings = (rawValue) => {
    const value = rawValue === "" ? "" : Number(rawValue);
    setProductDraft((prev) => ({ ...prev, servings: value }));
  };
  const addDraftIngredientRow = (kind) => {
    const defaultMaterial = kind === "ingredients" ? rawMaterials[0]?.id : packMaterials[0]?.id;
    const defaultAmount = kind === "packaging" ? 1 : 0;
    setProductDraft((prev) => ({ ...prev, [kind]: [...prev[kind], { id: uid(), materialId: defaultMaterial, amount: defaultAmount }] }));
  };
  const updateDraftIngredientRow = (kind, rowId, field, value) => {
    setProductDraft((prev) => ({
      ...prev,
      [kind]: prev[kind].map((row) =>
        row.id === rowId ? { ...row, [field]: field === "amount" ? (value === "" ? "" : Number(value)) : value } : row
      ),
    }));
  };
  const removeDraftIngredientRow = (kind, rowId) => {
    setProductDraft((prev) => ({ ...prev, [kind]: prev[kind].filter((row) => row.id !== rowId) }));
  };
  const addDraftBreakdownRow = (kind) => {
    const defaultRef = kind === "component" ? singleProducts.find((p) => p.id !== productDraft.id)?.id : packMaterials[0]?.id;
    setProductDraft((prev) => ({ ...prev, breakdown: [...prev.breakdown, { id: uid(), kind, refId: defaultRef, qty: 1 }] }));
  };
  const updateDraftBreakdownRow = (rowId, field, value) => {
    setProductDraft((prev) => ({
      ...prev,
      breakdown: prev.breakdown.map((row) =>
        row.id === rowId ? { ...row, [field]: field === "qty" ? (value === "" ? "" : Number(value)) : value } : row
      ),
    }));
  };
  const removeDraftBreakdownRow = (rowId) => {
    setProductDraft((prev) => ({ ...prev, breakdown: prev.breakdown.filter((row) => row.id !== rowId) }));
  };

  const draftCost = useMemo(() => {
    if (!productDraft) return null;
    const mergedProducts = [
      ...products.filter((p) => p.id !== productDraft.id),
      { id: productDraft.id, name: productDraft.name, price: productDraft.price, kind: productDraft.kind },
    ];
    const mergedRecipes = {
      ...recipes,
      [productDraft.id]: { servings: productDraft.servings, ingredients: productDraft.ingredients, packaging: productDraft.packaging },
    };
    const mergedBreakdowns = { ...setBreakdowns, [productDraft.id]: productDraft.breakdown };
    const costs = computeProductCosts({ products: mergedProducts, recipes: mergedRecipes, setBreakdowns: mergedBreakdowns, materialMap });
    return costs[productDraft.id];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDraft, products, recipes, setBreakdowns, materialMap]);

  // 検索・登録モードのトグルを、編集中商品の区分と同期させる
  useEffect(() => {
    if (productDraft) setKindMode(productDraft.kind || "single");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDraft?.id]);

  useEffect(() => {
    if (editingRatio) return;
    if (!productDraft || !draftCost) {
      setCostRatioDraft("");
      return;
    }
    const ratio = productDraft.price > 0 ? (draftCost.原価 / productDraft.price) * 100 : 0;
    setCostRatioDraft(ratio ? ratio.toFixed(1) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDraft?.id, productDraft?.price, draftCost?.原価, editingRatio]);

  const handleCostRatioChange = (value) => {
    setCostRatioDraft(value);
    const rate = Number(value);
    if (!draftCost || !rate || rate <= 0) return;
    const rawPrice = draftCost.原価 / (rate / 100);
    const newPrice = Math.ceil(rawPrice / 50) * 50;
    updateDraftField("price", newPrice);
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
  const removeExpense = (id) => {
    if (!window.confirm("削除しますか？")) return;
    setExpenses((prev) => prev.filter((x) => x.id !== id));
  };
  // カレンダーのhibi日から直接、利用料(店舗利用料等)だけを登録するための専用ハンドラ(expenseFormは触らない)
  const addHibiFee = (date, item, hours) => {
    if (!item || !hours) return;
    const amount = Number(hours) * (expenseRates[item] || 0);
    setExpenses((prev) => [...prev, { id: uid(), date, item, amount, hours: Number(hours) }]);
  };
  const updateExpenseRate = (item, value) => setExpenseRates((prev) => ({ ...prev, [item]: Number(value) || 0 }));
  const addExpenseRate = () => {
    const trimmed = expenseRateForm.name.trim();
    if (!trimmed) return;
    setExpenseRates((prev) => ({ ...prev, [trimmed]: Number(expenseRateForm.rate) || 0 }));
    setExpenseRateForm({ name: "", rate: "" });
  };
  const removeExpenseRate = (item) => {
    if (!window.confirm("削除しますか？")) return;
    setExpenseRates((prev) => {
      const next = { ...prev };
      delete next[item];
      return next;
    });
  };

  // --- ハンドラ: TODO・サブタスク ---
  const addTodo = () => {
    if (!todoForm.task.trim()) return;
    const id = uid();
    setTodos((prev) => [...prev, { id, ...todoForm, snoozed: false }]);
    setTodoForm((f) => ({ ...f, task: "", deadline: "" }));
    setExpandedTaskId(id);
  };
  // カレンダーの日別詳細から、TODOタブのフォームとは独立にその場でタスクを追加する
  const addTodoWithDeadline = (date, category, task) => {
    if (!task.trim()) return;
    setTodos((prev) => [...prev, { id: uid(), category, task: task.trim(), deadline: date, status: "未着手", snoozed: false }]);
  };
  const updateTodo = (id, field, value) => setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  const toggleTodoSnooze = (id) => setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, snoozed: !t.snoozed } : t)));
  const removeTodo = (id) => {
    if (!window.confirm("削除しますか？")) return;
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
  const updateSubtask = (id, field, value) => setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value, ...(field === "status" ? { statusUpdatedAt: Date.now() } : {}) } : s)));
  const toggleSubtaskSnooze = (id) => setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, snoozed: !s.snoozed } : s)));
  const removeSubtask = (id) => {
    if (!window.confirm("削除しますか？")) return;
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };
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

  // --- ハンドラ: カレンダー(出店計画・イベント予定) ---
  const addCalendarEvent = (date, title, memo) => {
    if (!date || !title.trim()) return;
    setCalendarEvents((prev) => [...prev, { id: uid(), date, title: title.trim(), memo: memo || "" }]);
  };
  const removeCalendarEvent = (id) => {
    if (!window.confirm("削除しますか？")) return;
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
  };
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
    if (!window.confirm("削除しますか？")) return;
    setMgmtBudgets((prev) => {
      const next = { ...prev };
      delete next[ym];
      return next;
    });
    if (editingTargetMonth === ym) setEditingTargetMonth(null);
  };
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
  const runRecalcZeroCostSales = async () => {
    setRecalcZeroCostRunning(true);
    setRecalcZeroCostResult(null);
    try {
      const res = await gasApi.recalcZeroCostSales();
      if (res.squareSyncLog) setSquareSyncLog(res.squareSyncLog);
      setRecalcZeroCostResult(res.updated || 0);
      if (res.updated > 0) {
        const fresh = await gasApi.getAll();
        setSales(fresh.sales || []);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setRecalcZeroCostRunning(false);
    }
  };
  const runSyncSalesFromSquare = async () => {
    setSalesSyncing(true);
    try {
      const res = await gasApi.syncSalesFromSquare();
      if (res.squareSyncLog) setSquareSyncLog(res.squareSyncLog);
      const fresh = await gasApi.getAll();
      setSales(fresh.sales || []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setSalesSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-3 text-stone-500 text-sm overflow-hidden">
        <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="w-48 h-48 animate-pulse" />
        読み込み中…
        <WanderingDuck />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <header className="border-b border-stone-300 pb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="w-12 h-12 shrink-0" />
              <div>
                <p className="text-xs tracking-widest text-amber-700 font-semibold uppercase">カモの小屋 収益分析</p>
                <h1 className="text-2xl font-bold mt-1">カモの小屋！</h1>
                <p className="text-sm text-stone-500 mt-1">商品マスタで計算した原価が、売上の日次・月次集計にそのまま連動します。</p>
              </div>
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
            salesSyncing={salesSyncing}
            runSyncSalesFromSquare={runSyncSalesFromSquare}
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
            settingDates={settingDates}
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
            dataGaps={dataGaps}
            onEditProduct={jumpToProductInMaster}
            onEditMaterial={jumpToMaterialInMaster}
            products={products}
            saleOverrides={saleOverrides}
            setSaleOverride={setSaleOverride}
            packagingExemptions={packagingExemptions}
            togglePackagingExempt={togglePackagingExempt}
          />
        )}

        {tab === "calendar" && (
          <CalendarTab
            calendarEvents={calendarEvents}
            addCalendarEvent={addCalendarEvent}
            removeCalendarEvent={removeCalendarEvent}
            dailyMeta={dailyMeta}
            setDayField={setDayField}
            salesChannels={salesChannels}
            rebateClients={rebateClients}
            todos={todos}
            addTodoWithDeadline={addTodoWithDeadline}
            updateTodo={updateTodo}
            expenses={expenses}
            expenseRates={expenseRates}
            addHibiFee={addHibiFee}
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
            dailyRows={dailyRows}
            channelMap={channelMap}
            rebateMap={rebateMap}
            sales={resolvedSales}
            productMap={productMap}
          />
        )}

        {tab === "financial" && <PLTab monthlyRows={monthlyRows} />}

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
            showCompletedTodos={showCompletedTodos}
            setShowCompletedTodos={setShowCompletedTodos}
          />
        )}

        {tab === "master" && (
          <MasterTab
            productDraft={productDraft}
            draftCost={draftCost}
            saveProductDraft={saveProductDraft}
            cancelProductDraft={cancelProductDraft}
            updateDraftField={updateDraftField}
            updateDraftServings={updateDraftServings}
            addDraftIngredientRow={addDraftIngredientRow}
            updateDraftIngredientRow={updateDraftIngredientRow}
            removeDraftIngredientRow={removeDraftIngredientRow}
            addDraftBreakdownRow={addDraftBreakdownRow}
            updateDraftBreakdownRow={updateDraftBreakdownRow}
            removeDraftBreakdownRow={removeDraftBreakdownRow}
            pendingProductSwitch={pendingProductSwitch}
            confirmDiscardAndSwitchProduct={confirmDiscardAndSwitchProduct}
            cancelPendingProductSwitch={cancelPendingProductSwitch}
            requestOpenProduct={requestOpenProduct}
            requestCreateProduct={requestCreateProduct}
            kindMode={kindMode}
            setKindMode={setKindMode}
            productQuery={productQuery}
            setProductQuery={setProductQuery}
            comboOpen={comboOpen}
            setComboOpen={setComboOpen}
            comboMatches={comboMatches}
            exactMatchExists={exactMatchExists}
            updateProduct={updateProduct}
            commitProductRename={commitProductRename}
            costRatioDraft={costRatioDraft}
            handleCostRatioChange={handleCostRatioChange}
            setEditingRatio={setEditingRatio}
            rawMaterials={rawMaterials}
            packMaterials={packMaterials}
            materials={materials}
            materialMap={materialMap}
            singleProducts={singleProducts}
            productCosts={productCosts}
            products={products}
            productAliases={productAliases}
            removeProductAlias={removeProductAlias}
            aliasListOpen={aliasListOpen}
            setAliasListOpen={setAliasListOpen}
            sales={sales}
            saleOverrides={saleOverrides}
            removeSaleOverride={removeSaleOverride}
            saleOverrideListOpen={saleOverrideListOpen}
            setSaleOverrideListOpen={setSaleOverrideListOpen}
            packagingExemptions={packagingExemptions}
            togglePackagingExempt={togglePackagingExempt}
            packagingExemptListOpen={packagingExemptListOpen}
            setPackagingExemptListOpen={setPackagingExemptListOpen}
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
            recalcZeroCostRunning={recalcZeroCostRunning}
            recalcZeroCostResult={recalcZeroCostResult}
            runRecalcZeroCostSales={runRecalcZeroCostSales}
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
