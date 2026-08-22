import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, Loader2 } from "lucide-react";
import { yen, RAW_MATERIAL_ITEM } from "../lib/constants";
import DateAccordion from "./DateAccordion";

const SUB_TABS = [
  { key: "intake", label: "取込・目標" },
  { key: "daily", label: "日次設定" },
  { key: "expense", label: "経費" },
  { key: "check", label: "ヌケモレチェック" },
];

export default function InputTab({
  subTab,
  setSubTab,
  salesSyncing,
  runSyncSalesFromSquare,
  baseOrdersSyncing,
  runSyncOrdersFromBase,
  targetForm,
  setTargetForm,
  addTarget,
  targetListOpen,
  setTargetListOpen,
  mgmtBudgets,
  editingTargetMonth,
  setEditingTargetMonth,
  removeTargetMonth,
  setMgmtBudgetField,
  settingDates,
  dailyMeta,
  channelMap,
  salesChannels,
  rebateClients,
  setDayField,
  expenseForm,
  setExpenseForm,
  isHourlyExpenseItem,
  expenseItemOptions,
  expenseRates,
  addExpense,
  expenses,
  removeExpense,
  dataGaps,
  onEditProduct,
  onEditMaterial,
  products,
  saleOverrides,
  setSaleOverride,
  packagingExemptions,
  togglePackagingExempt,
}) {
  const [unknownSaleDrafts, setUnknownSaleDrafts] = useState({}); // { [saleId]: { productId, qty } }
  const getUnknownSaleDraft = (item) =>
    unknownSaleDrafts[item.id] || { productId: "", qty: item.qty };
  const setUnknownSaleDraftField = (item, field, value) =>
    setUnknownSaleDrafts((prev) => ({ ...prev, [item.id]: { ...getUnknownSaleDraft(item), [field]: value } }));
  const applyUnknownSale = (item) => {
    const draft = getUnknownSaleDraft(item);
    if (!draft.productId) return;
    setSaleOverride(item.id, draft.productId, draft.qty);
    setUnknownSaleDrafts((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };
  // 日次設定の対象日を 年 > 月 > 日 のツリーにまとめる(settingDatesは既にソート済み)
  const settingDateTree = {};
  settingDates.forEach((date) => {
    const [y, m] = date.split("-");
    settingDateTree[y] = settingDateTree[y] || {};
    settingDateTree[y][m] = settingDateTree[y][m] || [];
    settingDateTree[y][m].push(date);
  });
  const settingYears = Object.keys(settingDateTree).sort();
  const latestSettingYear = settingYears.at(-1);
  const latestSettingMonth = latestSettingYear ? Object.keys(settingDateTree[latestSettingYear]).sort().at(-1) : null;

  const [openYears, setOpenYears] = useState(() => (latestSettingYear ? { [latestSettingYear]: true } : {}));
  const [openMonths, setOpenMonths] = useState(() =>
    latestSettingYear && latestSettingMonth ? { [`${latestSettingYear}-${latestSettingMonth}`]: true } : {}
  );
  const [openDates, setOpenDates] = useState({});
  const toggleYear = (y) => setOpenYears((prev) => ({ ...prev, [y]: !prev[y] }));
  const toggleMonth = (key) => setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleDate = (d) => setOpenDates((prev) => ({ ...prev, [d]: !prev[d] }));

  // ヌケモレチェックの項目から、該当サブタブに切り替えて該当箇所を開きスクロールする
  const focusSettingDate = (date) => {
    const [y, m] = date.split("-");
    setSubTab("daily");
    setOpenYears((prev) => ({ ...prev, [y]: true }));
    setOpenMonths((prev) => ({ ...prev, [`${y}-${m}`]: true }));
    setOpenDates((prev) => ({ ...prev, [date]: true }));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(`setting-date-${date}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };
  const focusExpenseDate = (date) => {
    setSubTab("expense");
    setExpenseForm((f) => ({ ...f, date }));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById("expense-input-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  const totalGapCount =
    dataGaps.unknownSales.length +
    dataGaps.missingChannel.length +
    dataGaps.missingClient.length +
    dataGaps.hibiDatesWithoutFee.length +
    dataGaps.zeroRawMaterialProducts.length +
    dataGaps.zeroPackagingProducts.length +
    dataGaps.zeroPriceMaterials.length;

  return (
    <>
      <div className="flex gap-1 bg-stone-200/70 rounded-2xl p-1 w-fit flex-wrap backdrop-blur-sm">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
              subTab === t.key ? "bg-white shadow-sm shadow-stone-300/50 text-amber-800" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            {t.label}
            {t.key === "check" && totalGapCount > 0 && (
              <span className="text-[10px] font-semibold rounded-full bg-red-100 text-red-600 px-1.5 py-0.5 leading-none">
                {totalGapCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {subTab === "intake" && (
      <>
      {/* 売上データ取込(Square注文の即時取り込み) */}
      <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-1">売上データ取込</h2>
            <p className="text-xs text-stone-500">Squareの注文を今すぐ取り込み、原価も合わせて計算します(通常は毎日22:00頃に自動実行されます)。</p>
          </div>
          <button
            onClick={runSyncSalesFromSquare}
            disabled={salesSyncing}
            className="shrink-0 ml-4 bg-amber-700 text-white rounded-lg px-3.5 py-1.5 text-sm shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow disabled:opacity-50 disabled:shadow-none transition-all"
          >
            {salesSyncing ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" /> 取込中…
              </span>
            ) : (
              "売上データ取込"
            )}
          </button>
        </div>
      </section>

      {/* BASE注文取込 */}
      <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-1">BASE注文取込</h2>
            <p className="text-xs text-stone-500">
              BASE(ネットショップ)の注文を今すぐ取り込みます。実店舗(Square)と同じ売上明細に「チャネル」で区別して記録され、原価も合わせて計算されます。
            </p>
          </div>
          <button
            onClick={runSyncOrdersFromBase}
            disabled={baseOrdersSyncing}
            className="shrink-0 ml-4 bg-amber-700 text-white rounded-lg px-3.5 py-1.5 text-sm shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow disabled:opacity-50 disabled:shadow-none transition-all"
          >
            {baseOrdersSyncing ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" /> 取込中…
              </span>
            ) : (
              "BASE注文取込"
            )}
          </button>
        </div>
      </section>

      {/* 目標(月単位・売上/原価率/利益) */}
      <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
        <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-1">目標</h2>
        <p className="text-xs text-stone-500 mb-3">
          月単位で売上・利益の目標額と、原価率の目標を入力します。原価目標(金額)は「売上目標 × 原価率」で自動計算されます。
        </p>
        <div className="flex flex-wrap gap-2 items-end mb-3 text-sm">
          <div>
            <label className="block text-xs text-stone-500 mb-1">対象月</label>
            <input
              type="month"
              className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow"
              value={targetForm.month}
              onChange={(e) => setTargetForm((f) => ({ ...f, month: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">売上目標(円)</label>
            <input
              type="number"
              className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-28"
              value={targetForm.salesBudget}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setTargetForm((f) => ({ ...f, salesBudget: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">原価率目標(%)</label>
            <input
              type="number"
              step="0.1"
              className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-24"
              value={targetForm.costRatio}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setTargetForm((f) => ({ ...f, costRatio: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">利益目標(円)</label>
            <input
              type="number"
              className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-28"
              value={targetForm.profitBudget}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setTargetForm((f) => ({ ...f, profitBudget: e.target.value }))}
            />
          </div>
          <button onClick={addTarget} className="flex items-center gap-1 bg-amber-700 text-white rounded-lg px-3.5 py-1.5 shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow transition-all">
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
                const costAmount = (b.salesBudget || 0) * ((b.costRatio || 0) / 100);
                const isEditing = editingTargetMonth === ym;
                return (
                  <div key={ym} className="border border-stone-200/80 rounded-xl p-3">
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
                          <Trash2 size={13} className="text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md p-0.5 -m-0.5 transition-colors" style={{ boxSizing: "content-box" }} />
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex flex-wrap gap-3 items-end text-xs">
                        <div>
                          <label className="block text-stone-500 mb-1">売上目標(円)</label>
                          <input
                            type="number"
                            className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-28"
                            value={b.salesBudget || 0}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setMgmtBudgetField(ym, "salesBudget", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-stone-500 mb-1">原価率目標(%)</label>
                          <input
                            type="number"
                            step="0.1"
                            className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-24"
                            value={b.costRatio || 0}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setMgmtBudgetField(ym, "costRatio", e.target.value)}
                          />
                        </div>
                        <div>
                          <div className="text-stone-500 mb-1">原価目標(自動計算)</div>
                          <div className="tabular-nums font-medium py-1">{yen(costAmount)}</div>
                        </div>
                        <div>
                          <label className="block text-stone-500 mb-1">利益目標(円)</label>
                          <input
                            type="number"
                            className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-28"
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
                          <div className="text-stone-500">原価率目標</div>
                          <div className="tabular-nums font-medium">{(b.costRatio || 0).toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-stone-500">原価目標</div>
                          <div className="tabular-nums font-medium">{yen(costAmount)}</div>
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
      </>
      )}

      {subTab === "daily" && (
      <>
      {/* 日次設定(販売形態・委託先) */}
      <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
        <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-1">日次設定(販売形態・委託先)</h2>
        <p className="text-xs text-stone-500 mb-3">
          「委託販売」などリベート対象の形態を選んだ日だけ、隣で委託先を選べます。年・月・日をクリックして開閉できます。
        </p>
        <div className="text-xs space-y-1">
          {Object.keys(settingDateTree)
            .sort()
            .map((year) => {
              const months = settingDateTree[year];
              const yearCount = Object.values(months).reduce((a, arr) => a + arr.length, 0);
              return (
                <div key={year} className="border border-stone-200/80 rounded-xl">
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center gap-1 px-2 py-1.5 text-left font-medium hover:bg-stone-50"
                  >
                    {openYears[year] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {year}年({yearCount}件)
                  </button>
                  {openYears[year] && (
                    <div className="pl-4 pb-1 space-y-1">
                      {Object.keys(months)
                        .sort()
                        .map((month) => {
                          const dates = months[month];
                          const monthKey = `${year}-${month}`;
                          return (
                            <div key={monthKey}>
                              <button
                                onClick={() => toggleMonth(monthKey)}
                                className="w-full flex items-center gap-1 px-2 py-1 text-left hover:bg-stone-50"
                              >
                                {openMonths[monthKey] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                {month}月({dates.length}件)
                              </button>
                              {openMonths[monthKey] && (
                                <div className="pl-4 space-y-0.5">
                                  {dates.map((date) => {
                                    const meta = dailyMeta[date] || {};
                                    const clientName = meta.clientId
                                      ? rebateClients.find((c) => c.id === meta.clientId || c.name === meta.clientId)?.name
                                      : "";
                                    return (
                                      <div key={date} id={`setting-date-${date}`} className="border-b border-stone-100">
                                        <button
                                          onClick={() => toggleDate(date)}
                                          className="w-full flex items-center gap-1 px-2 py-1 text-left hover:bg-stone-50"
                                        >
                                          {openDates[date] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                          <span className="font-medium">{date}</span>
                                          {(meta.channelId || clientName) && (
                                            <span className="text-stone-400">
                                              {meta.channelId}
                                              {clientName ? ` / ${clientName}` : ""}
                                            </span>
                                          )}
                                        </button>
                                        {openDates[date] && (
                                          <div className="flex flex-wrap gap-3 px-2 pb-2 pt-1">
                                            <div>
                                              <label className="block text-stone-500 mb-0.5">販売形態</label>
                                              <select
                                                className="border border-stone-300 rounded-md px-1.5 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow text-xs"
                                                value={meta.channelId || ""}
                                                onChange={(e) => {
                                                  const nextChannelId = e.target.value;
                                                  setDayField(date, "channelId", nextChannelId);
                                                  if (nextChannelId !== "委託販売" && meta.clientId) setDayField(date, "clientId", "");
                                                }}
                                              >
                                                <option value="">(未選択)</option>
                                                {salesChannels.map((c) => (
                                                  <option key={c.id} value={c.id}>
                                                    {c.name}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>
                                            {meta.channelId === "委託販売" && (
                                              <div>
                                                <label className="block text-stone-500 mb-0.5">委託先(販売先)</label>
                                                <select
                                                  className="border border-stone-300 rounded-md px-1.5 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow text-xs"
                                                  value={meta.clientId || ""}
                                                  onChange={(e) => setDayField(date, "clientId", e.target.value)}
                                                >
                                                  <option value="">(未選択・リベート対象外)</option>
                                                  {rebateClients.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                      {c.name}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </section>
      </>
      )}

      {subTab === "expense" && (
      <>
      {/* 経費入力 */}
      <section id="expense-input-section" className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
        <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-1">経費入力</h2>
        <p className="text-xs text-stone-500 mb-3">
          入力先は1つ。「{RAW_MATERIAL_ITEM}」を選んだ分だけ、裏側で標準原価と突き合わせて原価差異を計算します。
        </p>
        <div className="flex flex-wrap gap-2 items-end mb-3 text-sm">
          <div>
            <label className="block text-xs text-stone-500 mb-1">日付</label>
            <input
              type="date"
              className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">項目</label>
            <select
              className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow"
              value={expenseForm.item}
              onChange={(e) => setExpenseForm((f) => ({ ...f, item: e.target.value, amount: "", hours: "" }))}
            >
              {expenseItemOptions.map((it) => (
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
                  className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-20"
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
                className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-24"
                value={expenseForm.amount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
          )}
          <button onClick={addExpense} className="flex items-center gap-1 bg-amber-700 text-white rounded-lg px-3.5 py-1.5 shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow transition-all">
            <Plus size={14} /> 追加
          </button>
        </div>
        <DateAccordion
          items={expenses}
          getDate={(e) => e.date}
          renderDay={(dayExpenses) => (
            <div className="text-sm space-y-1">
              {dayExpenses.map((e) => (
                <div key={e.id} className="flex justify-between border-b border-stone-100 py-1">
                  <span className={e.item === RAW_MATERIAL_ITEM ? "text-amber-700 font-medium" : ""}>{e.item}</span>
                  <span className="flex items-center gap-2">
                    {yen(e.amount)}
                    <button onClick={() => removeExpense(e.id)}>
                      <Trash2 size={13} className="text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md p-0.5 -m-0.5 transition-colors" style={{ boxSizing: "content-box" }} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        />
      </section>
      </>
      )}

      {subTab === "check" && (
      <>
      {/* ヌケモレチェック */}
      <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
        <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-1">ヌケモレチェック</h2>
        <p className="text-xs text-stone-500 mb-3">
          よくある入力漏れ・データ不整合を自動でチェックします。項目をクリックすると該当箇所を開いて編集できます。
        </p>
        <div className="space-y-2">
          {/* 売上明細の商品が商品マスタに無い(不明)。同じ商品名でも日によって実商品が違いうるため、
              名前で一括統合せず1行(日付)ごとに商品・数量を指定して解決する */}
          <div className="border border-stone-200/80 rounded-xl p-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">売上明細の商品が商品マスタに無い(不明)</span>
              <span
                className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                  dataGaps.unknownSales.length ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {dataGaps.unknownSales.length ? `${dataGaps.unknownSales.length}件` : "問題なし"}
              </span>
            </div>
            {dataGaps.unknownSales.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {dataGaps.unknownSales.slice(0, 30).map((item) => {
                  const draft = getUnknownSaleDraft(item);
                  const isBlank = item.rawName === "(空白)";
                  return (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center gap-1.5 text-xs bg-red-50 text-red-700 rounded px-1.5 py-1"
                    >
                      <span className="text-stone-500">{item.date}</span>
                      {isBlank ? (
                        <span>{item.rawName}</span>
                      ) : (
                        <button onClick={() => onEditProduct(item.rawName)} className="hover:underline">
                          {item.rawName}
                        </button>
                      )}
                      <span className="text-stone-500">
                        数量{item.qty}・{yen(item.amount)}
                      </span>
                      <select
                        className="border border-red-200 rounded text-[11px] px-1 py-0.5 bg-white text-stone-700"
                        value={draft.productId}
                        onChange={(e) => setUnknownSaleDraftField(item, "productId", e.target.value)}
                      >
                        <option value="">商品を選択</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="w-14 border border-red-200 rounded text-[11px] px-1 py-0.5 bg-white text-stone-700"
                        value={draft.qty}
                        onChange={(e) => setUnknownSaleDraftField(item, "qty", e.target.value)}
                      />
                      <button
                        onClick={() => applyUnknownSale(item)}
                        disabled={!draft.productId}
                        className="text-[11px] border border-red-200 rounded px-1.5 py-0.5 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                      >
                        適用
                      </button>
                    </div>
                  );
                })}
                {dataGaps.unknownSales.length > 30 && (
                  <span className="text-xs text-stone-400">他{dataGaps.unknownSales.length - 30}件</span>
                )}
              </div>
            )}
          </div>
          {[
            { label: "販売形態漏れ(日次設定)", items: dataGaps.missingChannel, onClick: focusSettingDate },
            { label: "販売形態が委託販売なのに販売先漏れ", items: dataGaps.missingClient, onClick: focusSettingDate },
            { label: "販売形態がhibiなのに利用料の経費が無い", items: dataGaps.hibiDatesWithoutFee, onClick: focusExpenseDate },
            { label: "商品マスタで原材料費が0円", items: dataGaps.zeroRawMaterialProducts, onClick: onEditProduct },
            {
              label: "商品マスタで包材費が0円",
              items: dataGaps.zeroPackagingProducts,
              onClick: onEditProduct,
              exemptable: true,
            },
            { label: "材料・包材マスタで仕入単価が0円", items: dataGaps.zeroPriceMaterials, onClick: onEditMaterial },
          ].map((check) => (
            <div key={check.label} className="border border-stone-200/80 rounded-xl p-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{check.label}</span>
                <span
                  className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                    check.items.length ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {check.items.length ? `${check.items.length}件` : "問題なし"}
                </span>
              </div>
              {check.items.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {check.items.slice(0, 30).map((item, i) => {
                    const disabled = check.disabled && check.disabled(item);
                    if (check.exemptable) {
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-1 text-xs bg-red-50 text-red-700 rounded pl-1.5 pr-1 py-0.5"
                        >
                          <button onClick={() => check.onClick(item)} className="hover:underline">
                            {item}
                          </button>
                          <button
                            onClick={() => togglePackagingExempt(item)}
                            className="text-[11px] text-stone-500 border border-stone-200 rounded px-1 py-0.5 bg-white hover:bg-stone-50"
                            title="この商品は包材不要として今後チェックから外す"
                          >
                            不要
                          </button>
                        </div>
                      );
                    }
                    const clickable = check.onClick && !disabled;
                    return clickable ? (
                      <button
                        key={i}
                        onClick={() => check.onClick(item)}
                        className="text-xs bg-red-50 text-red-700 rounded px-1.5 py-0.5 hover:bg-red-100 hover:underline"
                      >
                        {item}
                      </button>
                    ) : (
                      <span key={i} className="text-xs bg-red-50 text-red-700 rounded px-1.5 py-0.5">
                        {item}
                      </span>
                    );
                  })}
                  {check.items.length > 30 && (
                    <span className="text-xs text-stone-400 self-center">他{check.items.length - 30}件</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      </>
      )}
    </>
  );
}
