import { Plus, Trash2, ChevronDown, ChevronRight, ChevronUp, Clock } from "lucide-react";
import { TODO_CATEGORIES, TODO_STATUSES, STAFF_OPTIONS } from "../lib/constants";

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
}) {
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

      <div className="flex justify-end">
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
          const categoryTasks = todos.filter((t) => t.category === category && (showSnoozed || !t.snoozed));
          if (categoryTasks.length === 0) return null;
          return (
            <div key={category}>
              <h3 className="text-sm font-semibold text-stone-700 mb-2 flex items-center gap-2">
                {category}
                <span className="text-xs font-normal text-stone-400">({categoryTasks.length}件)</span>
              </h3>
              <div className="space-y-3">
                {categoryTasks.map((t) => {
                  const taskSubtasks = subtasks.filter((s) => s.parentTaskId === t.id && (showSnoozed || !s.snoozed));
                  const expanded = expandedTaskId === t.id;
                  const sf = getSubtaskForm(t.id);
                  const statusColor =
                    t.status === "完了"
                      ? "bg-emerald-100 text-emerald-700"
                      : t.status === "進行中"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-stone-100 text-stone-600";
                  return (
                    <section key={t.id} className={`bg-white rounded-lg border border-stone-200 p-4 ${t.snoozed ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => setExpandedTaskId(expanded ? null : t.id)}
                          className="flex items-start gap-2 text-left flex-1"
                        >
                          {expanded ? (
                            <ChevronDown size={16} className="mt-0.5 text-stone-400 shrink-0" />
                          ) : (
                            <ChevronRight size={16} className="mt-0.5 text-stone-400 shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{t.task}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColor}`}>{t.status}</span>
                              {t.snoozed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">ちょっとあと</span>}
                            </div>
                            <div className="text-xs text-stone-400 mt-1">
                              {t.deadline ? `期限: ${t.deadline}` : "期限未設定"} ・ サブタスク{taskSubtasks.length}件
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => toggleTodoSnooze(t.id)}
                            title="ちょっとあと"
                            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded border ${
                              t.snoozed ? "border-amber-300 text-amber-700 bg-amber-50" : "border-stone-200 text-stone-500 hover:bg-stone-50"
                            }`}
                          >
                            <Clock size={11} /> ちょっとあと
                          </button>
                          <select
                            className="border rounded px-1 py-0.5 text-xs"
                            value={t.status}
                            onChange={(e) => updateTodo(t.id, "status", e.target.value)}
                          >
                            {TODO_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <button onClick={() => removeTodo(t.id)}>
                            <Trash2 size={13} className="text-stone-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="mt-3 pl-6 border-l-2 border-stone-100 space-y-3">
                          <div className="flex flex-wrap gap-2 items-end text-xs">
                            <div>
                              <label className="block text-stone-500 mb-1">サブタスク名</label>
                              <input
                                className="border rounded px-2 py-1 w-36"
                                value={sf.name}
                                onChange={(e) => setSubtaskFormField(t.id, "name", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-stone-500 mb-1">担当</label>
                              <select
                                className="border rounded px-2 py-1"
                                value={sf.assignee}
                                onChange={(e) => setSubtaskFormField(t.id, "assignee", e.target.value)}
                              >
                                {STAFF_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-stone-500 mb-1">期限</label>
                              <input
                                type="date"
                                className="border rounded px-2 py-1"
                                value={sf.deadline}
                                onChange={(e) => setSubtaskFormField(t.id, "deadline", e.target.value)}
                              />
                            </div>
                            <button onClick={() => addSubtask(t.id)} className="flex items-center gap-1 text-amber-700 hover:text-amber-900">
                              <Plus size={12} /> 追加
                            </button>
                          </div>

                          <div className="space-y-1">
                            {taskSubtasks.length === 0 && <p className="text-xs text-stone-400">サブタスクなし</p>}
                            {taskSubtasks.map((s, i) => (
                              <div
                                key={s.id}
                                className={`flex items-center gap-2 text-xs border-b border-stone-100 py-1 ${s.snoozed ? "opacity-50" : ""}`}
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
                                <span className="flex-1">
                                  {s.name}
                                  {s.snoozed && <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-stone-100 text-stone-500">ちょっとあと</span>}
                                </span>
                                <span className="text-stone-500 w-16">{s.assignee}</span>
                                <span className="text-stone-400 w-24">{s.deadline || "期限未設定"}</span>
                                <select
                                  className="border rounded px-1 py-0.5"
                                  value={s.status}
                                  onChange={(e) => updateSubtask(s.id, "status", e.target.value)}
                                >
                                  {TODO_STATUSES.map((st) => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => toggleSubtaskSnooze(s.id)}
                                  title="ちょっとあと"
                                  className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                                    s.snoozed ? "border-amber-300 text-amber-700 bg-amber-50" : "border-stone-200 text-stone-500 hover:bg-stone-50"
                                  }`}
                                >
                                  <Clock size={11} /> ちょっとあと
                                </button>
                                <button onClick={() => removeSubtask(s.id)}>
                                  <Trash2 size={12} className="text-stone-400 hover:text-red-500" />
                                </button>
                              </div>
                            ))}
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
    </>
  );
}
