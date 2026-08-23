import { X, Trash2, CheckCircle2, Circle } from "lucide-react";
import { TODO_CATEGORIES, STAFF_OPTIONS } from "../lib/constants";

// カレンダーの日付セルのTODOタグから開くクイック編集モーダル。
export default function CalendarTodoModal({ todo, updateTodo, removeTodo, onClose }) {
  const handleDelete = () => {
    if (!window.confirm("削除しますか？")) return;
    removeTodo(todo.id);
    onClose();
  };

  const inputCls =
    "border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">タスクの詳細</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-stone-500 mb-1">タスク名</label>
            <input
              autoFocus
              className={inputCls}
              value={todo.task}
              onChange={(e) => updateTodo(todo.id, "task", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-500 mb-1">カテゴリ</label>
              <select
                className={inputCls}
                value={todo.category}
                onChange={(e) => updateTodo(todo.id, "category", e.target.value)}
              >
                {TODO_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-stone-500 mb-1">担当</label>
              <select
                className={inputCls}
                value={todo.assignee || STAFF_OPTIONS[0]}
                onChange={(e) => updateTodo(todo.id, "assignee", e.target.value)}
              >
                {STAFF_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-500 mb-1">期限</label>
              <input
                type="date"
                className={inputCls}
                value={todo.deadline || ""}
                onChange={(e) => updateTodo(todo.id, "deadline", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-stone-500 mb-1">完了</label>
              <button
                onClick={() => updateTodo(todo.id, "status", todo.status === "完了" ? "未着手" : "完了")}
                className={`w-full flex items-center justify-center gap-1 border rounded-lg px-2.5 py-1.5 transition-shadow ${
                  todo.status === "完了"
                    ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                    : "border-stone-300 text-stone-600 bg-white hover:bg-stone-50"
                }`}
              >
                {todo.status === "完了" ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                {todo.status === "完了" ? "完了済み" : "完了にする"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 text-xs text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={12} /> 削除
          </button>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-sm rounded-lg bg-amber-700 text-white shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow transition-all"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
