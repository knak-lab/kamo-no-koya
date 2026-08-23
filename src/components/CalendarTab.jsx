import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { TODO_CATEGORIES, getEventChannelColor } from "../lib/constants";
import CalendarEventModal from "./CalendarEventModal";
import CalendarChannelModal from "./CalendarChannelModal";
import CalendarTodoModal from "./CalendarTodoModal";

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
  updateCalendarEvent,
  removeCalendarEvent,
  duplicateCalendarEvent,
  dailyMeta,
  setDayField,
  salesChannels,
  rebateClients,
  todos,
  addTodoWithDeadline,
  updateTodo,
  removeTodo,
  expenses,
  expenseRates,
  addHibiFee,
  removeExpense,
}) {
  const today = todayStr();
  const [viewMonth, setViewMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [channelModalDate, setChannelModalDate] = useState(null);
  const [selectedTodoId, setSelectedTodoId] = useState(null);
  const [eventForm, setEventForm] = useState({ title: "", memo: "", channelId: "" });
  const [todoQuickForm, setTodoQuickForm] = useState({ category: TODO_CATEGORIES[0], task: "" });

  const weeks = buildMonthWeeks(viewMonth);
  const dayEvents = calendarEvents.filter((e) => e.date === selectedDate);
  const dayTodos = todos.filter((t) => t.deadline === selectedDate);
  const selectedEvent = calendarEvents.find((e) => e.id === selectedEventId) || null;
  const selectedTodo = todos.find((t) => t.id === selectedTodoId) || null;
  const channelModalMeta = channelModalDate ? dailyMeta[channelModalDate] || {} : {};
  const selectedDateMeta = dailyMeta[selectedDate] || {};

  const submitEvent = () => {
    if (!eventForm.title.trim()) return;
    addCalendarEvent(selectedDate, eventForm.title, eventForm.memo, eventForm.channelId);
    setEventForm({ title: "", memo: "", channelId: "" });
  };
  const submitTodo = () => {
    if (!todoQuickForm.task.trim()) return;
    addTodoWithDeadline(selectedDate, todoQuickForm.category, todoQuickForm.task);
    setTodoQuickForm((f) => ({ ...f, task: "" }));
  };

  return (
    <>
      <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight">
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
                const channelColor = getEventChannelColor(dMeta.channelId, salesChannels);
                const events = calendarEvents.filter((e) => e.date === date);
                const openTodos = todos.filter((t) => t.deadline === date && t.status !== "完了");
                const isToday = date === today;
                const isSelected = date === selectedDate;
                return (
                  <div
                    key={date}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDate(date)}
                    onKeyDown={(ev) => ev.key === "Enter" && setSelectedDate(date)}
                    className={`text-left align-top rounded-md border p-1 min-h-[64px] text-[11px] cursor-pointer ${
                      isSelected ? "border-amber-500 bg-amber-50" : "border-stone-100 hover:bg-stone-50"
                    }`}
                  >
                    <div className={`text-xs ${isToday ? "font-bold text-amber-700" : "text-stone-600"}`}>{day}</div>
                    {dMeta.channelId && (
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setChannelModalDate(date);
                        }}
                        className={`block w-full truncate text-left rounded px-1 mt-0.5 ${channelColor.chip} hover:opacity-80 transition-opacity`}
                      >
                        {formatChannelLabel(dMeta, rebateClients)}
                      </button>
                    )}
                    <div className="space-y-0.5 mt-0.5">
                      {events.slice(0, 2).map((e) => {
                        const color = getEventChannelColor(e.channelId, salesChannels);
                        return (
                          <button
                            key={e.id}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelectedDate(date);
                              setSelectedEventId(e.id);
                            }}
                            className={`block w-full truncate text-left rounded px-1 ${color.chip} hover:opacity-80 transition-opacity`}
                          >
                            {e.title}
                          </button>
                        );
                      })}
                    </div>
                    {events.length > 2 && <div className="text-stone-400">他{events.length - 2}件</div>}
                    <div className="space-y-0.5 mt-0.5">
                      {openTodos.slice(0, 2).map((t) => (
                        <button
                          key={t.id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedDate(date);
                            setSelectedTodoId(t.id);
                          }}
                          className="block w-full truncate text-left rounded px-1 bg-red-50 text-red-700 hover:opacity-80 transition-opacity"
                        >
                          {t.task}
                        </button>
                      ))}
                    </div>
                    {openTodos.length > 2 && <div className="text-stone-400">他{openTodos.length - 2}件</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {selectedDate && (
        <>
          <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
            <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-3">{formatDateLabel(selectedDate)}</h2>

            <div className="mb-4">
              <h3 className="text-sm font-medium mb-1.5">販売形態</h3>
              <button
                onClick={() => setChannelModalDate(selectedDate)}
                className={`text-xs rounded-full px-2.5 py-1 hover:opacity-80 transition-opacity ${
                  getEventChannelColor(selectedDateMeta.channelId, salesChannels).chip
                }`}
              >
                {selectedDateMeta.channelId ? formatChannelLabel(selectedDateMeta, rebateClients) : "未設定・タップして設定"}
              </button>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-medium mb-1">予定(出店・イベント)</h3>
              <p className="text-xs text-stone-500 mb-2">クリックすると詳細(編集・削除・コピー・タスク)を開けます。</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {dayEvents.length === 0 && <p className="text-xs text-stone-400">この日の予定はまだありません。</p>}
                {dayEvents.map((e) => {
                  const color = getEventChannelColor(e.channelId, salesChannels);
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEventId(e.id)}
                      className={`text-xs rounded-full px-2.5 py-1 ${color.chip} hover:opacity-80 transition-opacity`}
                    >
                      {e.title}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 items-end text-xs">
                <div>
                  <label className="block text-stone-500 mb-1">タイトル</label>
                  <input
                    className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-40"
                    value={eventForm.title}
                    onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="例: ○○マルシェ出店"
                  />
                </div>
                <div>
                  <label className="block text-stone-500 mb-1">出店形態</label>
                  <select
                    className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow"
                    value={eventForm.channelId}
                    onChange={(e) => setEventForm((f) => ({ ...f, channelId: e.target.value }))}
                  >
                    <option value="">(未選択)</option>
                    {salesChannels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-500 mb-1">メモ</label>
                  <input
                    className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-48"
                    value={eventForm.memo}
                    onChange={(e) => setEventForm((f) => ({ ...f, memo: e.target.value }))}
                    placeholder="持ち物・注意事項など任意"
                  />
                </div>
                <button
                  onClick={submitEvent}
                  className="flex items-center gap-1 bg-amber-700 text-white rounded-lg px-3.5 py-1.5 shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow transition-all"
                >
                  <Plus size={14} /> 追加
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-1">この日が期限のTODO</h3>
              <p className="text-xs text-stone-500 mb-2">クリックすると詳細(編集・削除)を開けます。</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {dayTodos.length === 0 && <p className="text-xs text-stone-400">この日を期限とするタスクはありません。</p>}
                {dayTodos.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTodoId(t.id)}
                    className={`text-xs rounded-full px-2.5 py-1 hover:opacity-80 transition-opacity ${
                      t.status === "完了" ? "bg-emerald-100 text-emerald-800" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {t.task}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 items-end text-xs">
                <div>
                  <label className="block text-stone-500 mb-1">カテゴリ</label>
                  <select
                    className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow"
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
                    className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-48"
                    value={todoQuickForm.task}
                    onChange={(e) => setTodoQuickForm((f) => ({ ...f, task: e.target.value }))}
                    placeholder="例: 前日仕込み"
                  />
                </div>
                <button
                  onClick={submitTodo}
                  className="flex items-center gap-1 bg-amber-700 text-white rounded-lg px-3.5 py-1.5 shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow transition-all"
                >
                  <Plus size={14} /> 追加
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {selectedEvent && (
        <CalendarEventModal
          event={selectedEvent}
          salesChannels={salesChannels}
          todos={todos}
          addTodoWithDeadline={addTodoWithDeadline}
          updateTodo={updateTodo}
          updateCalendarEvent={updateCalendarEvent}
          removeCalendarEvent={removeCalendarEvent}
          duplicateCalendarEvent={duplicateCalendarEvent}
          onClose={() => setSelectedEventId(null)}
        />
      )}

      {channelModalDate && (
        <CalendarChannelModal
          date={channelModalDate}
          dateLabel={formatDateLabel(channelModalDate)}
          meta={channelModalMeta}
          setDayField={setDayField}
          salesChannels={salesChannels}
          rebateClients={rebateClients}
          expenses={expenses}
          expenseRates={expenseRates}
          addHibiFee={addHibiFee}
          removeExpense={removeExpense}
          onClose={() => setChannelModalDate(null)}
        />
      )}

      {selectedTodo && (
        <CalendarTodoModal
          todo={selectedTodo}
          updateTodo={updateTodo}
          removeTodo={removeTodo}
          onClose={() => setSelectedTodoId(null)}
        />
      )}
    </>
  );
}
