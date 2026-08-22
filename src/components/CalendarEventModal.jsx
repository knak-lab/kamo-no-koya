import { useState } from "react";
import { X, Copy, Trash2, Plus } from "lucide-react";
import { TODO_CATEGORIES, TODO_STATUSES } from "../lib/constants";

// カレンダーの「予定」1件の詳細モーダル。出店(タイトル・出店形態・メモ・日付)の
// 編集/削除/コピーと、その日を期限とするタスクの一覧・追加をセクション分けして扱う。
export default function CalendarEventModal({
  event,
  salesChannels,
  todos,
  addTodoWithDeadline,
  updateTodo,
  updateCalendarEvent,
  removeCalendarEvent,
  duplicateCalendarEvent,
  onClose,
}) {
  const [todoQuickForm, setTodoQuickForm] = useState({ category: TODO_CATEGORIES[0], task: "" });
  const dayTodos = todos.filter((t) => t.deadline === event.date);

  const submitTodo = () => {
    if (!todoQuickForm.task.trim()) return;
    addTodoWithDeadline(event.date, todoQuickForm.category, todoQuickForm.task);
    setTodoQuickForm((f) => ({ ...f, task: "" }));
  };

  const handleDelete = () => {
    removeCalendarEvent(event.id);
    onClose();
  };
  const handleDuplicate = () => {
    duplicateCalendarEvent(event.id);
    onClose();
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
          <h3 className="font-semibold text-sm">予定の詳細</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X size={18} />
          </button>
        </div>

        {/* 出店セクション */}
        <div className="mb-5">
          <h4 className="text-[11px] font-semibold text-stone-400 mb-2 tracking-wide">出店</h4>
          <div className="space-y-2.5 text-xs">
            <div>
              <label className="block text-stone-500 mb-1">日付</label>
              <input
                type="date"
                className={inputCls}
                value={event.date}
                onChange={(e) => updateCalendarEvent(event.id, "date", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-stone-500 mb-1">タイトル</label>
              <input
                className={inputCls}
                value={event.title}
                onChange={(e) => updateCalendarEvent(event.id, "title", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-stone-500 mb-1">出店形態</label>
              <select
                className={inputCls}
                value={event.channelId || ""}
                onChange={(e) => updateCalendarEvent(event.id, "channelId", e.target.value)}
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
                className={inputCls}
                value={event.memo || ""}
                onChange={(e) => updateCalendarEvent(event.id, "memo", e.target.value)}
                placeholder="持ち物・注意事項など任意"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDuplicate}
              className="flex items-center gap-1 text-xs text-stone-600 border border-stone-300 rounded-lg px-3 py-1.5 hover:bg-stone-50 transition-colors"
            >
              <Copy size={12} /> コピー
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 text-xs text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={12} /> 削除
            </button>
          </div>
        </div>

        {/* タスクセクション */}
        <div className="border-t border-stone-100 pt-4">
          <h4 className="text-[11px] font-semibold text-stone-400 mb-2 tracking-wide">タスク</h4>
          <div className="space-y-1 mb-2">
            {dayTodos.length === 0 && <p className="text-xs text-stone-400">この日を期限とするタスクはありません。</p>}
            {dayTodos.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-xs border-b border-stone-100 py-1">
                <div>
                  <span className="text-stone-400 mr-1">[{t.category}]</span>
                  {t.task}
                </div>
                <select
                  className="border border-stone-300 rounded-md px-1.5 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow"
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
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-stone-500 mb-1 text-xs">カテゴリ</label>
              <select
                className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow text-xs"
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
            <div className="flex-1 min-w-[120px]">
              <label className="block text-stone-500 mb-1 text-xs">タスク</label>
              <input
                className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full text-xs"
                value={todoQuickForm.task}
                onChange={(e) => setTodoQuickForm((f) => ({ ...f, task: e.target.value }))}
                placeholder="例: 前日仕込み"
              />
            </div>
            <button
              onClick={submitTodo}
              className="flex items-center gap-1 bg-amber-700 text-white rounded-lg px-3.5 py-1.5 text-xs shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow transition-all"
            >
              <Plus size={14} /> 追加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
