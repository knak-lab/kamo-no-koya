import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { TODO_CATEGORIES, TODO_STATUSES, yen } from "../lib/constants";

const todayStr = () => new Date().toISOString().slice(0, 10);
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function buildMonthWeeks(viewMonth) {
  const [y, m] = viewMonth.split("-").map(Number);
  const firstWeekday = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const shiftMonth = (viewMonth, diff) => {
  const [y, m] = viewMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + diff, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const formatDateLabel = (date) => {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${y}年${m}月${d}日(${weekday})`;
};

// 委託販売の日は「委託販売」だけでは誰宛か分からないため「{委託先名}:委託販売」の形式にする
const formatChannelLabel = (dMeta, rebateClients) => {
  if (!dMeta.channelId) return "";
  if (dMeta.channelId !== "委託販売") return dMeta.channelId;
  const clientName = rebateClients.find((c) => c.id === dMeta.clientId)?.name || "(未選択)";
  return `${clientName}:委託販売`;
};

export default function CalendarTab({
  calendarEvents,
  addCalendarEvent,
  removeCalendarEvent,
  dailyMeta,
  setDayField,
  salesChannels,
  rebateClients,
  todos,
  addTodoWithDeadline,
  updateTodo,
  expenses,
  expenseRates,
  addHibiFee,
  removeExpense,
}) {
  const today = todayStr();
  const [viewMonth, setViewMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [eventForm, setEventForm] = useState({ title: "", memo: "" });
  const [todoQuickForm, setTodoQuickForm] = useState({ category: TODO_CATEGORIES[0], task: "" });
  const [feeForm, setFeeForm] = useState({ item: "", hours: "" });

  const weeks = buildMonthWeeks(viewMonth);
  const meta = dailyMeta[selectedDate] || {};
  const dayEvents = calendarEvents.filter((e) => e.date === selectedDate);
  const dayTodos = todos.filter((t) => t.deadline === selectedDate);
  const feeItemOptions = Object.keys(expenseRates).filter((it) => it.includes("利用料"));
  const dayFees = expenses.filter((e) => e.date === selectedDate && e.item.includes("利用料"));
  const selectedFeeItem = feeForm.item || feeItemOptions[0] || "";

  const submitFee = () => {
    if (!selectedFeeItem || !feeForm.hours) return;
    addHibiFee(selectedDate, selectedFeeItem, feeForm.hours);
    setFeeForm((f) => ({ ...f, hours: "" }));
  };

  const submitEvent = () => {
    if (!eventForm.title.trim()) return;
    addCalendarEvent(selectedDate, eventForm.title, eventForm.memo);
    setEventForm({ title: "", memo: "" });
  };
  const submitTodo = () => {
    if (!todoQuickForm.task.trim()) return;
    addTodoWithDeadline(selectedDate, todoQuickForm.category, todoQuickForm.task);
    setTodoQuickForm((f) => ({ ...f, task: "" }));
  };

  return (
    <>
      <section className="bg-white rounded-lg border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">
            {viewMonth.slice(0, 4)}年{Number(viewMonth.slice(5, 7))}月
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMonth((v) => shiftMonth(v, -1))}
              className="p-1 rounded border border-stone-200 text-stone-500 hover:bg-stone-50"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => {
                setViewMonth(today.slice(0, 7));
                setSelectedDate(today);
              }}
              className="text-xs px-2 py-1 rounded border border-stone-200 text-stone-600 hover:bg-stone-50"
            >
              今月
            </button>
            <button
              onClick={() => setViewMonth((v) => shiftMonth(v, 1))}
              className="p-1 rounded border border-stone-200 text-stone-500 hover:bg-stone-50"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-stone-400 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((date, di) => {
                if (!date) return <div key={di} />;
                const day = Number(date.slice(8, 10));
                const dMeta = dailyMeta[date] || {};
                const events = calendarEvents.filter((e) => e.date === date);
                const openTodoCount = todos.filter((t) => t.deadline === date && t.status !== "完了").length;
                const isToday = date === today;
                const isSelected = date === selectedDate;
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`text-left align-top rounded-md border p-1 min-h-[64px] text-[11px] ${
                      isSelected ? "border-amber-500 bg-amber-50" : "border-stone-100 hover:bg-stone-50"
                    }`}
                  >
                    <div className={`text-xs ${isToday ? "font-bold text-amber-700" : "text-stone-600"}`}>{day}</div>
                    {dMeta.channelId && (
                      <div className="text-stone-400 truncate">{formatChannelLabel(dMeta, rebateClients)}</div>
                    )}
                    {events.slice(0, 2).map((e) => (
                      <div key={e.id} className="truncate text-amber-700">
                        ・{e.title}
                      </div>
                    ))}
                    {events.length > 2 && <div className="text-stone-400">他{events.length - 2}件</div>}
                    {openTodoCount > 0 && (
                      <div className="mt-0.5 inline-block bg-red-100 text-red-700 rounded px-1">TODO{openTodoCount}</div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {selectedDate && (
        <>
          <section className="bg-white rounded-lg border border-stone-200 p-4">
            <h2 className="font-semibold mb-3">{formatDateLabel(selectedDate)}</h2>

            <div className="mb-4">
              <h3 className="text-sm font-medium mb-1">販売形態・委託先</h3>
              <div className="flex flex-wrap gap-3 text-xs">
                <div>
                  <label className="block text-stone-500 mb-0.5">販売形態</label>
                  <select
                    className="border rounded px-1 py-0.5"
                    value={meta.channelId || ""}
                    onChange={(e) => {
                      const nextChannelId = e.target.value;
                      setDayField(selectedDate, "channelId", nextChannelId);
                      if (nextChannelId !== "委託販売" && meta.clientId) setDayField(selectedDate, "clientId", "");
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
                      className="border rounded px-1 py-0.5"
                      value={meta.clientId || ""}
                      onChange={(e) => setDayField(selectedDate, "clientId", e.target.value)}
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
            </div>

            {meta.channelId === "hibi" && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-1">利用料</h3>
                <div className="space-y-1 mb-2">
                  {dayFees.length === 0 && <p className="text-xs text-stone-400">この日の利用料はまだ登録されていません。</p>}
                  {dayFees.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-2 text-xs border-b border-stone-100 py-1">
                      <div>
                        {e.item}
                        {e.hours != null && <span className="text-stone-400">（{e.hours}h）</span>} ・ {yen(e.amount)}
                      </div>
                      <button onClick={() => removeExpense(e.id)}>
                        <Trash2 size={12} className="text-stone-400 hover:text-red-500" />
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
                        className="border rounded px-2 py-1"
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
                        className="border rounded px-2 py-1 w-20"
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
                      className="flex items-center gap-1 bg-amber-700 text-white rounded px-3 py-1.5 hover:bg-amber-800"
                    >
                      <Plus size={14} /> 追加
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-sm font-medium mb-1">予定(出店・イベント)</h3>
              <div className="space-y-1 mb-2">
                {dayEvents.length === 0 && <p className="text-xs text-stone-400">この日の予定はまだありません。</p>}
                {dayEvents.map((e) => (
                  <div key={e.id} className="flex items-start justify-between gap-2 text-xs border-b border-stone-100 py-1">
                    <div>
                      <div className="font-medium">{e.title}</div>
                      {e.memo && <div className="text-stone-500">{e.memo}</div>}
                    </div>
                    <button onClick={() => removeCalendarEvent(e.id)}>
                      <Trash2 size={12} className="text-stone-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 items-end text-xs">
                <div>
                  <label className="block text-stone-500 mb-1">タイトル</label>
                  <input
                    className="border rounded px-2 py-1 w-40"
                    value={eventForm.title}
                    onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="例: ○○マルシェ出店"
                  />
                </div>
                <div>
                  <label className="block text-stone-500 mb-1">メモ</label>
                  <input
                    className="border rounded px-2 py-1 w-48"
                    value={eventForm.memo}
                    onChange={(e) => setEventForm((f) => ({ ...f, memo: e.target.value }))}
                    placeholder="持ち物・注意事項など任意"
                  />
                </div>
                <button
                  onClick={submitEvent}
                  className="flex items-center gap-1 bg-amber-700 text-white rounded px-3 py-1.5 hover:bg-amber-800"
                >
                  <Plus size={14} /> 追加
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-1">この日が期限のTODO</h3>
              <div className="space-y-1 mb-2">
                {dayTodos.length === 0 && <p className="text-xs text-stone-400">この日を期限とするタスクはありません。</p>}
                {dayTodos.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 text-xs border-b border-stone-100 py-1">
                    <div>
                      <span className="text-stone-400 mr-1">[{t.category}]</span>
                      {t.task}
                    </div>
                    <select
                      className="border rounded px-1 py-0.5"
                      value={t.status}
                      onChange={(e) => updateTodo(t.id, "status", e.target.value)}
                    >
                      {TODO_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 items-end text-xs">
                <div>
                  <label className="block text-stone-500 mb-1">カテゴリ</label>
                  <select
                    className="border rounded px-2 py-1"
                    value={todoQuickForm.category}
                    onChange={(e) => setTodoQuickForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {TODO_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-500 mb-1">タスク</label>
                  <input
                    className="border rounded px-2 py-1 w-48"
                    value={todoQuickForm.task}
                    onChange={(e) => setTodoQuickForm((f) => ({ ...f, task: e.target.value }))}
                    placeholder="例: 前日仕込み"
                  />
                </div>
                <button
                  onClick={submitTodo}
                  className="flex items-center gap-1 bg-amber-700 text-white rounded px-3 py-1.5 hover:bg-amber-800"
                >
                  <Plus size={14} /> 追加
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
