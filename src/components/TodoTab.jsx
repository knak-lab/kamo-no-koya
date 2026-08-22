import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, ChevronUp, Clock, Pencil, CheckCircle2, Circle } from "lucide-react";
import { TODO_CATEGORIES, STAFF_OPTIONS } from "../lib/constants";

// 完了トグル。未完了は「〇」、完了すると赤枠の「済」ハンコ風スタンプに変わる
function DoneMark({ done, onClick }) {
  return (
    <button
      onClick={onClick}
      title="完了"
      className={`inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-full border-2 leading-none ${
        done ? "border-red-600 text-red-600 text-[9px] font-bold -rotate-12" : "border-stone-300 text-stone-300 text-xs hover:border-stone-400 hover:text-stone-400"
      }`}
    >
      {done ? "済" : "〇"}
    </button>
  );
}

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
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [subtaskModalTaskId, setSubtaskModalTaskId] = useState(null);
  const modalTask = todos.find((t) => t.id === subtaskModalTaskId);
  const msf = subtaskModalTaskId ? getSubtaskForm(subtaskModalTaskId) : null;

  const [editTaskId, setEditTaskId] = useState(null);
  const editTask = todos.find((t) => t.id === editTaskId);
  const [editSubtaskId, setEditSubtaskId] = useState(null);
  const editSubtask = subtasks.find((s) => s.id === editSubtaskId);

  return (
    <>
      <div className="flex justify-between gap-2">
        <button
          onClick={() => setAddTaskModalOpen(true)}
          className="flex items-center gap-1 bg-amber-700 text-white rounded-lg px-3.5 py-1.5 text-sm shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow transition-all"
        >
          <Plus size={14} /> タスク追加
        </button>
        <div className="flex gap-2">
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
      </div>

      <div className="space-y-6">
        {todos.length === 0 && (
          <p className="text-xs text-stone-400 bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">タスクがありません。</p>
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
                    <section key={t.id} className={`bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5 ${t.snoozed ? "opacity-50" : ""}`}>
                      <div className="flex items-start gap-2">
                        <button onClick={() => setExpandedTaskId(expanded ? null : t.id)} className="shrink-0 mt-0.5">
                          {expanded ? (
                            <ChevronDown size={16} className="text-stone-400" />
                          ) : (
                            <ChevronRight size={16} className="text-stone-400" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          {/* 1行目: 〇/済・タイトル */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <DoneMark done={done} onClick={() => updateTodo(t.id, "status", done ? "未着手" : "完了")} />
                            <button
                              onClick={() => setEditTaskId(t.id)}
                              className={`font-medium text-sm hover:underline text-left flex items-center gap-1 ${
                                done ? "line-through text-stone-400" : ""
                              }`}
                            >
                              {t.task}
                              <Pencil size={10} className="text-stone-300" />
                            </button>
                          </div>
                          {/* 2行目: ちょっとあと・期限/サブタスク件数 */}
                          <div className="flex items-center gap-2 flex-wrap mt-1.5">
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
                              <Trash2 size={13} className="text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md p-0.5 -m-0.5 transition-colors" style={{ boxSizing: "content-box" }} />
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

                          <div className="space-y-2">
                            {taskSubtasks.length === 0 && <p className="text-xs text-stone-400">サブタスクなし</p>}
                            {taskSubtasks.map((s, i) => {
                              const sDone = s.status === "完了";
                              return (
                                <div
                                  key={s.id}
                                  className={`flex items-start gap-2 text-xs border-b border-stone-100 pb-2 ${s.snoozed ? "opacity-50" : ""}`}
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
                                  <div className="min-w-0 flex-1">
                                    {/* 1行目: 〇/済・タイトル */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <DoneMark done={sDone} onClick={() => updateSubtask(s.id, "status", sDone ? "未着手" : "完了")} />
                                      <button
                                        onClick={() => setEditSubtaskId(s.id)}
                                        className={`hover:underline text-left flex items-center gap-1 ${
                                          sDone ? "line-through text-stone-400" : ""
                                        }`}
                                      >
                                        {s.name}
                                        <Pencil size={10} className="text-stone-300" />
                                      </button>
                                    </div>
                                    {/* 2行目: 担当・期限・ちょっとあと */}
                                    <div className="flex items-center gap-2 flex-wrap mt-1">
                                      <span className="text-stone-500 shrink-0">{s.assignee}</span>
                                      <span className="text-stone-400 shrink-0">{s.deadline || "期限未設定"}</span>
                                      <button
                                        onClick={() => toggleSubtaskSnooze(s.id)}
                                        title="ちょっとあと"
                                        className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                                          s.snoozed ? "border-amber-300 text-amber-700 bg-amber-50" : "border-stone-200 text-stone-500 hover:bg-stone-50"
                                        }`}
                                      >
                                        <Clock size={11} /> ちょっとあと
                                      </button>
                                      <button onClick={() => removeSubtask(s.id)} className="ml-auto shrink-0">
                                        <Trash2 size={12} className="text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md p-0.5 -m-0.5 transition-colors" style={{ boxSizing: "content-box" }} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
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

      {addTaskModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-semibold text-sm mb-3">タスクを追加</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-500 mb-1">カテゴリ</label>
                <select
                  className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full"
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
                <label className="block text-stone-500 mb-1">タスク</label>
                <input
                  autoFocus
                  className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full"
                  value={todoForm.task}
                  onChange={(e) => setTodoForm((f) => ({ ...f, task: e.target.value }))}
                  placeholder="例: 夏メニュー試作"
                />
              </div>
              <div>
                <label className="block text-stone-500 mb-1">期限</label>
                <input
                  type="date"
                  className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full"
                  value={todoForm.deadline}
                  onChange={(e) => setTodoForm((f) => ({ ...f, deadline: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setAddTaskModalOpen(false)}
                className="px-3.5 py-1.5 text-sm rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 hover:border-stone-400 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (!todoForm.task.trim()) return;
                  addTodo();
                  setAddTaskModalOpen(false);
                }}
                className="px-3.5 py-1.5 text-sm rounded-lg bg-amber-700 text-white shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow transition-all"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {subtaskModalTaskId && msf && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-semibold text-sm mb-3">サブタスクを追加{modalTask ? `（${modalTask.task}）` : ""}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-500 mb-1">サブタスク名</label>
                <input
                  autoFocus
                  className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full"
                  value={msf.name}
                  onChange={(e) => setSubtaskFormField(subtaskModalTaskId, "name", e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-stone-500 mb-1">担当</label>
                  <select
                    className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full"
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
                    className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full"
                    value={msf.deadline}
                    onChange={(e) => setSubtaskFormField(subtaskModalTaskId, "deadline", e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setSubtaskModalTaskId(null)}
                className="px-3.5 py-1.5 text-sm rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 hover:border-stone-400 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (!msf.name.trim()) return;
                  addSubtask(subtaskModalTaskId);
                  setSubtaskModalTaskId(null);
                }}
                className="px-3.5 py-1.5 text-sm rounded-lg bg-amber-700 text-white shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow transition-all"
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
                  className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full"
                  value={editTask.task}
                  onChange={(e) => updateTodo(editTask.id, "task", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-500 mb-1">カテゴリ</label>
                  <select
                    className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full"
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
                    className={`w-full flex items-center justify-center gap-1 border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow ${
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
                  className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full"
                  value={editTask.deadline}
                  onChange={(e) => updateTodo(editTask.id, "deadline", e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setEditTaskId(null)}
                className="px-3.5 py-1.5 text-sm rounded-lg bg-amber-700 text-white shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow transition-all"
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
                  className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full"
                  value={editSubtask.name}
                  onChange={(e) => updateSubtask(editSubtask.id, "name", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-500 mb-1">担当</label>
                  <select
                    className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full"
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
                    className={`w-full flex items-center justify-center gap-1 border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow ${
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
                  className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow w-full"
                  value={editSubtask.deadline}
                  onChange={(e) => updateSubtask(editSubtask.id, "deadline", e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setEditSubtaskId(null)}
                className="px-3.5 py-1.5 text-sm rounded-lg bg-amber-700 text-white shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow transition-all"
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
