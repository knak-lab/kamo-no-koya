import { yearMonthOf, RAW_MATERIAL_ITEM, METRIC_LABEL, METRIC_DAILY_FIELD } from "./constants";

export const getRecipe = (recipes, productId) => recipes[productId] || { servings: 1, ingredients: [], packaging: [] };
export const getBreakdown = (setBreakdowns, productId) => setBreakdowns[productId] || [];

// ========== 原価計算(単品はレシピから、セットは内訳の積み上げから。単品を先に計算してからセットで参照する) ==========
export function computeProductCosts({ products, recipes, setBreakdowns, materialMap }) {
  const costs = {};

  // パス1: 単品商品(レシピから計算)
  products
    .filter((p) => p.kind !== "set")
    .forEach((p) => {
      const recipe = getRecipe(recipes, p.id);
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
      const rows = getBreakdown(setBreakdowns, p.id);
      const 材料費 = rows.reduce((sum, row) => {
        if (row.kind === "component") {
          const compCost = costs[row.refId]?.原価 || 0;
          return sum + compCost * (Number(row.qty) || 0);
        }
        const mat = materialMap[row.refId];
        return sum + (mat ? mat.unitPrice : 0); // 梱包・資材は数量を掛けない(数量欄は記録用)
      }, 0);

      // セット自身のレシピ(あれば)の包材リストを「セットを包む外箱」の費用として加算
      const recipe = getRecipe(recipes, p.id);
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
}

// ========== 日次・月次集計対象日付 ==========
export function computeAllDates({ sales, expenses, dailyMeta }) {
  const s = new Set([...sales.map((s) => s.date), ...expenses.map((e) => e.date), ...Object.keys(dailyMeta)]);
  return [...s].sort();
}

// ========== 日次集計(売上_Square + 経費 → 自動生成) ==========
export function computeDailyRows({ allDates, sales, expenses, dailyMeta, channelMap, rebateMap, productCosts }) {
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
}

export function computeAllYearMonths({ dailyRows, mgmtBudgets, finBudgets }) {
  const s = new Set([...dailyRows.map((d) => d.yearMonth), ...Object.keys(mgmtBudgets), ...Object.keys(finBudgets)]);
  return [...s].filter(Boolean).sort();
}

// ========== 月次集計 ==========
export function computeMonthlyRows({ allYearMonths, dailyRows, mgmtBudgets, finBudgets }) {
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
}

// 月次予実(販売形態フィルタは日次集計を絞り込んでから月次に積み上げ直す。予算は形態別に持たないため全体の予算を使用)
export function computeMonthlyByChannel({ dailyRows, monthChannel, allYearMonths }) {
  const filtered = monthChannel === "all" ? dailyRows : dailyRows.filter((d) => d.channelId === monthChannel);
  const map = {};
  filtered.forEach((d) => {
    if (!map[d.yearMonth]) map[d.yearMonth] = { yearMonth: d.yearMonth, 売上: 0, 粗利: 0, 営業利益: 0 };
    map[d.yearMonth].売上 += d.売上_日次;
    map[d.yearMonth].粗利 += d.粗利_日次;
    map[d.yearMonth].営業利益 += d.営業利益_管理_日次;
  });
  return allYearMonths.map((ym) => map[ym] || { yearMonth: ym, 売上: 0, 粗利: 0, 営業利益: 0 });
}

function getTargetAmount(mgmtBudgets, ym, metric) {
  const b = mgmtBudgets[ym];
  if (!b) return 0;
  if (metric === "sales") return b.salesBudget || 0;
  return b.profitBudget || 0;
}

export function computeMonthlyChartData({ monthlyByChannel, monthMetric, monthChannel, mgmtBudgets }) {
  const key = METRIC_LABEL[monthMetric];
  const showTarget = monthChannel === "all";
  return monthlyByChannel.map((row) => ({
    name: row.yearMonth,
    実績: row[key],
    実績粗利率: row.売上 > 0 ? Math.round((row.粗利 / row.売上) * 1000) / 10 : 0,
    ...(showTarget
      ? { 目標: getTargetAmount(mgmtBudgets, row.yearMonth, monthMetric), 目標粗利率: mgmtBudgets[row.yearMonth]?.grossMarginRatio || 0 }
      : {}),
  }));
}

// 日次予実(実績のみ)
export function computeDailyChartData({ dailyRows, dayChannel, dayMetric }) {
  const filtered = dayChannel === "all" ? dailyRows : dailyRows.filter((d) => d.channelId === dayChannel);
  const field = METRIC_DAILY_FIELD[dayMetric];
  return filtered.map((d) => ({
    name: d.date,
    実績: d[field],
    実績粗利率: d.売上_日次 > 0 ? Math.round((d.粗利_日次 / d.売上_日次) * 1000) / 10 : 0,
  }));
}

// 客数と客単価(2軸)
export function computeCustomerChartData(dailyRows) {
  return dailyRows.map((d) => ({ name: d.date, 客数: d.客数, 客単価: Math.round(d.客単価) }));
}

// 商品別売上(上位10)
export function computeProductSalesRanking({ sales, productMap }) {
  const totals = {};
  sales.forEach((s) => {
    totals[s.productId] = (totals[s.productId] || 0) + s.amount;
  });
  return Object.entries(totals)
    .map(([pid, amt]) => ({ name: productMap[pid]?.name || pid, 売上: amt }))
    .sort((a, b) => b.売上 - a.売上)
    .slice(0, 10);
}
