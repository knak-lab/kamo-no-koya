import { useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, ExternalLink, Upload, FileText, Image as ImageIcon, Loader2, X } from "lucide-react";
import { resizeToDataUrl, fileToDataUrl } from "../lib/image";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB(GAS Web Appへのdata URL送信が現実的な上限の目安)

// タイトル単位のセクション。デフォルト閉じており、開いている間だけ本体全体が
// ドキュメント・写真のドロップ先になる。
function BizPlanSection({ item, files, addFile, removeFile, updateItem, removeItem }) {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const thumbInputRef = useRef(null);

  const thumbnail = files.find((f) => f.itemId === item.id && f.kind === "thumbnail");
  const attachments = files.filter((f) => f.itemId === item.id && f.kind === "attachment");

  const handleUploadFiles = async (fileList) => {
    const list = Array.from(fileList || []);
    if (list.length === 0) return;
    setError("");
    setUploading(true);
    try {
      for (const file of list) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          setError(`「${file.name}」は10MBを超えるため追加できません。`);
          continue;
        }
        const dataUrl = await fileToDataUrl(file);
        await addFile(item.id, "attachment", file.name, file.type || "application/octet-stream", dataUrl);
      }
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setUploading(false);
    }
  };

  const handleThumbFile = async (file) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("サムネイルは画像ファイルを選んでください。");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await resizeToDataUrl(file, 400);
      const mimeType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
      await addFile(item.id, "thumbnail", file.name, mimeType, dataUrl);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-stone-200/80 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors"
      >
        {open ? <ChevronDown size={16} className="shrink-0 text-stone-400" /> : <ChevronRight size={16} className="shrink-0 text-stone-400" />}
        {thumbnail ? (
          <img src={thumbnail.url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-stone-200" />
        ) : (
          <div className="w-10 h-10 rounded-lg shrink-0 bg-stone-100 flex items-center justify-center text-stone-300">
            <ImageIcon size={16} />
          </div>
        )}
        <span className="flex-1 min-w-0 font-medium text-sm text-stone-800 truncate">{item.title || "(無題)"}</span>
        {item.url && <ExternalLink size={13} className="text-stone-300 shrink-0" />}
        {attachments.length > 0 && <span className="text-[11px] text-stone-400 shrink-0">添付{attachments.length}件</span>}
      </button>

      {open && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleUploadFiles(e.dataTransfer.files);
          }}
          className={`border-t border-stone-100 p-4 space-y-4 transition-colors ${dragOver ? "bg-amber-50" : "bg-stone-50/50"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <input
              value={item.title}
              onChange={(e) => updateItem(item.id, "title", e.target.value)}
              placeholder="タイトル"
              className="flex-1 font-medium text-sm border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow"
            />
            <button onClick={() => removeItem(item.id)} className="shrink-0 text-stone-400 hover:text-red-600 p-1.5" title="セクションを削除">
              <Trash2 size={16} />
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="shrink-0">
              <p className="text-xs text-stone-500 mb-1.5">サムネイル</p>
              {thumbnail ? (
                <div className="relative w-20 h-20">
                  <img src={thumbnail.url} alt="" className="w-20 h-20 rounded-xl object-cover border border-stone-200" />
                  <button
                    onClick={() => removeFile(thumbnail.id)}
                    className="absolute -top-1.5 -right-1.5 bg-white border border-stone-200 rounded-full p-0.5 text-stone-400 hover:text-red-600 shadow-sm"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => thumbInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-stone-300 flex items-center justify-center text-stone-300 hover:text-amber-600 hover:border-amber-400 transition-colors"
                >
                  <Upload size={16} />
                </button>
              )}
              <input
                ref={thumbInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  handleThumbFile(f);
                }}
              />
            </div>

            <div className="flex-1 min-w-[200px] space-y-1">
              <p className="text-xs text-stone-500">URL</p>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  inputMode="url"
                  value={item.url}
                  onChange={(e) => updateItem(item.id, "url", e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow"
                />
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-stone-400 hover:text-amber-700">
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-stone-500 mb-1">自由記入欄</p>
            <textarea
              value={item.memo}
              onChange={(e) => updateItem(item.id, "memo", e.target.value)}
              rows={4}
              placeholder="メモ・詳細など"
              className="w-full border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-stone-500">ドキュメント・写真</p>
              <label className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 cursor-pointer">
                <Upload size={12} />
                ファイルを選ぶ
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleUploadFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div
              className={`rounded-xl border-2 border-dashed p-3 text-center transition-colors ${
                dragOver ? "border-amber-400 bg-amber-50" : "border-stone-300"
              }`}
            >
              {attachments.length === 0 && !uploading && <p className="text-xs text-stone-400 py-2">ここにドキュメントや写真をドラッグ&ドロップ</p>}
              {uploading && (
                <p className="text-xs text-stone-400 py-2 flex items-center justify-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> アップロード中…
                </p>
              )}
              {attachments.length > 0 && (
                <ul className="space-y-1.5 text-left">
                  {attachments.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 bg-white border border-stone-200/80 rounded-lg px-2.5 py-1.5">
                      {f.mimeType?.startsWith("image/") ? (
                        <img src={f.url} alt="" className="w-8 h-8 rounded object-cover shrink-0 border border-stone-200" />
                      ) : (
                        <FileText size={16} className="shrink-0 text-stone-400" />
                      )}
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 text-xs text-stone-700 truncate hover:text-amber-700">
                        {f.name}
                      </a>
                      <button onClick={() => removeFile(f.id)} className="shrink-0 text-stone-300 hover:text-red-600">
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default function BizPlanTab({ items, files, addItem, updateItem, removeItem, addFile, removeFile }) {
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addItem(newTitle);
    setNewTitle("");
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
      <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-1">事業計画</h2>
      <p className="text-xs text-stone-500 mb-4">
        タイトルごとにセクションを分けて管理します。セクションを開くと、そのままドキュメントや写真をドラッグ&ドロップで追加できます。
      </p>

      <div className="space-y-2 mb-4">
        {items.length === 0 && <p className="text-xs text-stone-400">まだセクションがありません。下から追加してください。</p>}
        {items.map((item) => (
          <BizPlanSection key={item.id} item={item} files={files} addFile={addFile} removeFile={removeFile} updateItem={updateItem} removeItem={removeItem} />
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-stone-100 pt-4">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="新しいセクションのタイトル"
          className="flex-1 border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow"
        />
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 bg-amber-700 text-white rounded-lg px-3.5 py-1.5 text-sm shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow transition-all shrink-0"
        >
          <Plus size={14} /> 追加
        </button>
      </div>
    </section>
  );
}
