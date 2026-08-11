import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, ChevronUp, Clock, Pencil, CheckCircle2, Circle } from "lucide-react";
import { TODO_CATEGORIES, STAFF_OPTIONS } from "../lib/constants";

export default function TodoTab({
  todoForm,
  setTodoForm,
  addTodo,
  todos,
  subtasks,
  subtaskForms,
  expandedTaskId,
  setExpandedTaskId,
  getSubtaskForm,
  setSubtaskFormField,
  addSubtask,
  updateTodo,
  toggleTodoSnooze,
  removeTodo,
  updateSubtask,
  toggleSubtaskSnooze,
  removeSubtask,
  moveSubtask,
  showSnoozed,
  setShowSnoozed,
  showCompletedTodos,
  setShowCompletedTodos,
}) {
  const [subtaskModalTaskId, setSubtaskModalTaskId] = useState(null);
  const modalTask = todos.find((t) => t.id === subtaskModalTaskId);
  const msf = subtaskModalTaskId ? getSubtaskForm(subtaskModalTaskId) : null;

  const [editTaskId, setEditTaskId] = useState(null);
  const editTask = todos.find((t) => t.id === editTaskId);
  const [editSubtaskId, setEditSubtaskId] = useState(null);
  const editSubtask = subtasks.find((s) => s.id === editSubtaskId);

  return (
    <>
      <section className="bg-white rounded-lg border border-stone-200 p-4">
        <h2 className="font-semibold mb-3">タスク追加</h2>
        <div className="flex flex-wrap gap-2 items-end mb-3 text-sm">
          <div>
            <label className="block text-xs text-stone-500 mb-1">カテゴリ</label>
            <select
              className="border rounded px-2 py-1"
              value={todoForm.category}
              onChange={(e) => setTodoForm((f) => ({ ...f, category: e.target.value }))}
            >
              {TODO_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">タスク</label>
            <input
              className="border rounded px-2 py-1 w-48"
              value={todoForm.task}
              onChange={(e) => setTodoForm((f) => ({ ...f, task: e.target.value }))}
              placeholder="例: 夏メニュー試作"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">期限</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={todoForm.deadline}
              onChange={(e) => setTodoForm((f) => ({ ...f, deadline: e.target.value }))}
            />
          </div>
          <button onClick={addTodo} className="flex items-center gap-1 bg-amber-700 text-white rounded px-3 py-1.5 hover:bg-amber-800">
            <Plus size={14} /> 追加
          </button>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => setShowCompletedTodos((v) => !v)}
          className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-full px-3 py-1"
        >
          <span className="text-sm">{showCompletedTodos ? "👁" : "🙈"}</span>
          完了済み{showCompletedTodos ? "を表示中" : "は非表示"}
        </button>
        <button
          onClick={() => setShowSnoozed((v) => !v)}
          className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-full px-3 py-1"
        >
          <span className="text-sm">{showSnoozed ? "👁" : "🙈"}</span>
          ちょっとあと{showSnoozed ? "を表示中" : "は非表示"}
        </button>
      </div>

      <div className="space-y-6">
        {todos.length === 0 && (
          <p className="text-xs text-stone-400 bg-white rounded-lg border border-stone-200 p-4">タスクがありません。</p>
        )}
        {TODO_CATEGORIES.map((category) => {
          const categoryTasks = todos.filter(
            (t) => t.category === category && (showSnoozed || !t.snoozed) && (showCompletedTodos || t.status !== "完了")
          );
          if (categoryTasks.length === 0) return null;
          return (
            <div key={category}>
              <h3 className="text-sm font-semibold text-stone-700 mb-2 flex items-center gap-2">
                {category}
                <span className="text-xs font-normal text-stone-400">({categoryTasks.length}件)</span>
              </h3>
              <div className="space-y-3">
                {categoryTasks.map((t) => {
                  const taskSubtasks = subtasks.filter(
                    (s) => s.parentTaskId === t.id && (showSnoozed || !s.snoozed) && (showCompletedTodos || s.status !== "完了")
                  );
                  const expanded = expandedTaskId === t.id;
                  const done = t.status === "完了";
                  return (
                    <section key={t.id} className={`bg-white rounded-lg border border-stone-200 p-4 ${t.snoozed ? "opacity-50" : ""}`}>
                      <div className="flex items-start gap-2">
                        <button onClick={() => setExpandedTaskId(expanded ? null : t.id)} className="shrink-0 mt-0.5">
                          {expanded ? (
                            <ChevronDown size={16} className="text-stone-400" />
                          ) : (
                            <ChevronRight size={16} className="text-stone-400" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          {/* 1行目: タイトル */}
                          <button
                            onClick={() => setEditTaskId(t.id)}
                            className={`font-medium text-sm hover:underline text-left flex items-center gap-1 ${
                              done ? "line-through text-stone-400" : ""
                            }`}
                          >
                            {t.task}
                            <Pencil size={10} className="text-stone-300" />
                          </button>
                          {/* 2行目: 完了・ちょっとあと・期限/サブタスク件数 */}
                          <div className="flex items-center gap-2 flex-wrap mt-1.5">
                            <button
                              onClick={() => updateTodo(t.id, "status", done ? "未着手" : "完了")}
                              title="完了"
                              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded border shrink-0 ${
                                done ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-stone-200 text-stone-500 hover:bg-stone-50"
                              }`}
                            >
                              {done ? <CheckCircle2 size={11} /> : <Circle size={11} />} 完了
                            </button>
                            <button
                              onClick={() => toggleTodoSnooze(t.id)}
                              title="ちょっとあと"
                              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded border shrink-0 ${
                                t.snoozed ? "border-amber-300 text-amber-700 bg-amber-50" : "border-stone-200 text-stone-500 hover:bg-stone-50"
                              }`}
                            >
                              <Clock size={11} /> ちょっとあと
                            </button>
                            <span className="text-xs text-stone-400">
                              {t.deadline ? `期限: ${t.deadline}` : "期限未設定"} ・ サブタスク{taskSubtasks.length}件
                            </span>
                            <button onClick={() => removeTodo(t.id)} className="ml-auto shrink-0">
                              <Trash2 size={13} className="text-stone-400 hover:text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {expanded && (
                        <div className="mt-3 pl-6 border-l-2 border-stone-100 space-y-3">
                          <button
                            onClick={() => setSubtaskModalTaskId(t.id)}
                            className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"
                          >
                            <Plus size={12} /> サブタスク
                          </button>

                          <div className="overflow-x-auto">
                            <div className="space-y-1 min-w-max">
                              {taskSubtasks.length === 0 && <p className="text-xs text-stone-400">サブタスクなし</p>}
                              {taskSubtasks.map((s, i) => (
                                <div
                                  key={s.id}
                                  className={`flex items-center gap-2 text-xs whitespace-nowrap border-b border-stone-100 py-1 ${s.snoozed ? "opacity-50" : ""}`}
                                >
                                  <div className="flex flex-col shrink-0">
                                    <button
                                      onClick={() => moveSubtask(t.id, s.id, -1)}
                                      disabled={i === 0}
                                      className="disabled:opacity-20 text-stone-400 hover:text-stone-700"
                                    >
                                      <ChevronUp size={12} />
                                    </button>
                                    <button
                                      onClick={() => moveSubtask(t.id, s.id, 1)}
                                      disabled={i === taskSubtasks.length - 1}
                                      className="disabled:opacity-20 text-stone-400 hover:text-stone-700"
                                    >
                                      <ChevronDown size={12} />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => setEditSubtaskId(s.id)}
                                    className={`shrink-0 hover:underline text-left flex items-center gap-1 ${
                                      s.status === "完了" ? "line-through text-stone-400" : ""
                                    }`}
                                  >
                                    {s.name}
                                    <Pencil size={10} className="text-stone-300" />
                                  </button>
                                  {s.snoozed && <span className="text-[10px] px-1 py-0.5 rounded bg-stone-100 text-stone-500 shrink-0">ちょっとあと</span>}
                                  <span className="text-stone-500 shrink-0">{s.assignee}</span>
                                  <span className="text-stone-400 shrink-0">{s.deadline || "期限未設定"}</span>
                                  <button
                                    onClick={() => updateSubtask(s.id, "status", s.status === "完了" ? "未着手" : "完了")}
                                    title="完了"
                                    className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                                      s.status === "完了"
                                        ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                                        : "border-stone-200 text-stone-500 hover:bg-stone-50"
                                    }`}
                                  >
                                    {s.status === "完了" ? <CheckCircle2 size={11} /> : <Circle size={11} />} 完了
                                  </button>
                                  <button
                                    onClick={() => toggleSubtaskSnooze(s.id)}
                                    title="ちょっとあと"
                                    className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                                      s.snoozed ? "border-amber-300 text-amber-700 bg-amber-50" : "border-stone-200 text-stone-500 hover:bg-stone-50"
                                    }`}
                                  >
                                    <Clock size={11} /> ちょっとあと
                                  </button>
                                  <button onClick={() => removeSubtask(s.id)} className="shrink-0">
                                    <Trash2 size={12} className="text-stone-400 hover:text-red-500" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {subtaskModalTaskId && msf && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-semibold text-sm mb-3">サブタスクを追加{modalTask ? `（${modalTask.task}）` : ""}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-500 mb-1">サブタスク名</label>
                <input
                  autoFocus
                  className="border rounded px-2 py-1 w-full"
                  value={msf.name}
                  onChange={(e) => setSubtaskFormField(subtaskModalTaskId, "name", e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-stone-500 mb-1">担当</label>
                  <select
                    className="border rounded px-2 py-1 w-full"
                    value={msf.assignee}
                    onChange={(e) => setSubtaskFormField(subtaskModalTaskId, "assignee", e.target.value)}
                  >
                    {STAFF_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-stone-500 mb-1">期限</label>
                  <input
                    type="date"
                    className="border rounded px-2 py-1 w-full"
                    value={msf.deadline}
                    onChange={(e) => setSubtaskFormField(subtaskModalTaskId, "deadline", e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setSubtaskModalTaskId(null)}
                className="px-3 py-1.5 text-sm rounded border border-stone-300 text-stone-600 hover:bg-stone-50"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (!msf.name.trim()) return;
                  addSubtask(subtaskModalTaskId);
                  setSubtaskModalTaskId(null);
                }}
                className="px-3 py-1.5 text-sm rounded bg-amber-700 text-white hover:bg-amber-800"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {editTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-semibold text-sm mb-3">タスクを編集</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-500 mb-1">タスク名</label>
                <input
                  autoFocus
                  className="border rounded px-2 py-1 w-full"
                  value={editTask.task}
                  onChange={(e) => updateTodo(editTask.id, "task", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-500 mb-1">カテゴリ</label>
                  <select
                    className="border rounded px-2 py-1 w-full"
                    value={editTask.category}
                    onChange={(e) => updateTodo(editTask.id, "category", e.target.value)}
                  >
                    {TODO_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-500 mb-1">完了</label>
                  <button
                    onClick={() => updateTodo(editTask.id, "status", editTask.status === "完了" ? "未着手" : "完了")}
                    className={`w-full flex items-center justify-center gap-1 border rounded px-2 py-1 ${
                      editTask.status === "完了"
                        ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                        : "border-stone-300 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {editTask.status === "完了" ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    {editTask.status === "完了" ? "完了済み" : "完了にする"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-stone-500 mb-1">期限</label>
                <input
                  type="date"
                  className="border rounded px-2 py-1 w-full"
                  value={editTask.deadline}
                  onChange={(e) => updateTodo(editTask.id, "deadline", e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setEditTaskId(null)}
                className="px-3 py-1.5 text-sm rounded bg-amber-700 text-white hover:bg-amber-800"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {editSubtask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-semibold text-sm mb-3">サブタスクを編集</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-500 mb-1">サブタスク名</label>
                <input
                  autoFocus
                  className="border rounded px-2 py-1 w-full"
                  value={editSubtask.name}
                  onChange={(e) => updateSubtask(editSubtask.id, "name", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-500 mb-1">担当</label>
                  <select
                    className="border rounded px-2 py-1 w-full"
                    value={editSubtask.assignee}
                    onChange={(e) => updateSubtask(editSubtask.id, "assignee", e.target.value)}
                  >
                    {STAFF_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-500 mb-1">完了</label>
                  <button
                    onClick={() => updateSubtask(editSubtask.id, "status", editSubtask.status === "完了" ? "未着手" : "完了")}
                    className={`w-full flex items-center justify-center gap-1 border rounded px-2 py-1 ${
                      editSubtask.status === "完了"
                        ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                        : "border-stone-300 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {editSubtask.status === "完了" ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    {editSubtask.status === "完了" ? "完了済み" : "完了にする"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-stone-500 mb-1">期限</label>
                <input
                  type="date"
                  className="border rounded px-2 py-1 w-full"
                  value={editSubtask.deadline}
                  onChange={(e) => updateSubtask(editSubtask.id, "deadline", e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setEditSubtaskId(null)}
                className="px-3 py-1.5 text-sm rounded bg-amber-700 text-white hover:bg-amber-800"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
