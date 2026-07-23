import { Plus, Trash2, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { yen, RAW_MATERIAL_ITEM, EXPENSE_ITEMS } from "../lib/constants";

export default function InputTab({
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
  allDates,
  dailyMeta,
  channelMap,
  salesChannels,
  rebateClients,
  setDayField,
  expenseForm,
  setExpenseForm,
  isHourlyExpenseItem,
  expenseRates,
  addExpense,
  expenses,
  removeExpense,
}) {
  return (
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
                        className="border rounded px-1 py-0.5 text-xs"
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
                <button onClick={() => removeExpense(e.id)}>
                  <Trash2 size={13} className="text-stone-400 hover:text-red-500" />
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
