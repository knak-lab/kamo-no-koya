import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { yen } from "../lib/constants";

// カレンダーの日付セルの「販売形態」タグから開く詳細モーダル。
// 販売形態・委託先の選択と、hibiの日の利用料入力・一覧をまとめて扱う。
export default function CalendarChannelModal({
  date,
  dateLabel,
  meta,
  setDayField,
  salesChannels,
  rebateClients,
  expenses,
  expenseRates,
  addHibiFee,
  removeExpense,
  onClose,
}) {
  const [feeForm, setFeeForm] = useState({ item: "", hours: "" });
  const feeItemOptions = Object.keys(expenseRates).filter((it) => it.includes("利用料"));
  const dayFees = expenses.filter((e) => e.date === date && e.item.includes("利用料"));
  const selectedFeeItem = feeForm.item || feeItemOptions[0] || "";

  const submitFee = () => {
    if (!selectedFeeItem || !feeForm.hours) return;
    addHibiFee(date, selectedFeeItem, feeForm.hours);
    setFeeForm((f) => ({ ...f, hours: "" }));
  };

  const inputCls =
    "border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">{dateLabel}の販売形態</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2.5 text-xs mb-5">
          <div>
            <label className="block text-stone-500 mb-1">販売形態</label>
            <select
              className={inputCls}
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
              <label className="block text-stone-500 mb-1">委託先(販売先)</label>
              <select
                className={inputCls}
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

        {meta.channelId === "hibi" && (
          <div className="border-t border-stone-100 pt-4">
            <h4 className="text-[11px] font-semibold text-stone-400 mb-2 tracking-wide">利用料</h4>
            <div className="space-y-1 mb-2">
              {dayFees.length === 0 && <p className="text-xs text-stone-400">この日の利用料はまだ登録されていません。</p>}
              {dayFees.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-xs border-b border-stone-100 py-1">
                  <div>
                    {e.item}
                    {e.hours != null && <span className="text-stone-400">（{e.hours}h）</span>} ・ {yen(e.amount)}
                  </div>
                  <button onClick={() => removeExpense(e.id)}>
                    <Trash2 size={12} className="text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md p-0.5 -m-0.5 transition-colors" style={{ boxSizing: "content-box" }} />
                  </button>
                </div>
              ))}
            </div>
            {feeItemOptions.length === 0 ? (
              <p className="text-xs text-stone-400">
                「利用料」を含む経費項目が経費マスタにありません。マスタタブで項目を追加してください。
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 items-end text-xs">
                <div>
                  <label className="block text-stone-500 mb-1">項目</label>
                  <select
                    className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow"
                    value={selectedFeeItem}
                    onChange={(e) => setFeeForm((f) => ({ ...f, item: e.target.value }))}
                  >
                    {feeItemOptions.map((it) => (
                      <option key={it} value={it}>
                        {it}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-500 mb-1">時間(h)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-20"
                    value={feeForm.hours}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFeeForm((f) => ({ ...f, hours: e.target.value }))}
                  />
                </div>
                <div>
                  <div className="text-stone-500 mb-1">金額(自動計算・時間単価¥{expenseRates[selectedFeeItem] || 0})</div>
                  <div className="tabular-nums font-medium py-1.5">
                    {yen((Number(feeForm.hours) || 0) * (expenseRates[selectedFeeItem] || 0))}
                  </div>
                </div>
                <button
                  onClick={submitFee}
                  className="flex items-center gap-1 bg-amber-700 text-white rounded-lg px-3.5 py-1.5 shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow transition-all"
                >
                  <Plus size={14} /> 追加
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
