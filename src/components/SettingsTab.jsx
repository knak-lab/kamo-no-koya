import { useState } from "react";
import { Upload, Trash2, Loader2 } from "lucide-react";

const MAX_DIMENSION = 800; // 長辺をこのサイズ以下にリサイズしてから保存する
const MAX_BASE64_CHARS = 200000; // GAS側の上限(約150KB)と合わせる
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

// 選んだPNG/JPEGファイルを長辺MAX_DIMENSION以下に縮小し、data URL(元と同じ形式)として返す
function resizeToDataUrl(file) {
  const mimeType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("画像として読み込めませんでした"));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(mimeType, mimeType === "image/jpeg" ? 0.85 : undefined));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function SettingsTab({ todoVisual, saveTodoVisual, saving }) {
  const [pendingPreview, setPendingPreview] = useState(null); // まだ保存していないプレビュー
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを連続で選び直せるようにする
    if (!file) return;
    setError("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("PNGまたはJPEGファイルを選んでください。");
      return;
    }
    try {
      const dataUrl = await resizeToDataUrl(file);
      const base64Len = dataUrl.split(",")[1]?.length || 0;
      if (base64Len > MAX_BASE64_CHARS) {
        setError("画像が大きすぎます。もう少し小さい・シンプルな画像を選んでください。");
        return;
      }
      setPendingPreview(dataUrl);
    } catch (err) {
      setError(String(err.message || err));
    }
  };

  const handleSave = async () => {
    if (!pendingPreview) return;
    setError("");
    try {
      await saveTodoVisual(pendingPreview);
      setPendingPreview(null);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(String(err.message || err));
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("ビジュアル画像を削除しますか？")) return;
    setError("");
    try {
      await saveTodoVisual("");
      setPendingPreview(null);
    } catch (err) {
      setError(String(err.message || err));
    }
  };

  const previewSrc = pendingPreview || todoVisual;

  return (
    <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
      <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-1">設定</h2>
      <p className="text-xs text-stone-500 mb-4">
        ここでの変更はアプリを使う全員に反映されます。開発者(Claude Code)に頼まなくても、この画面から直接変更できます。
      </p>

      <div className="border border-stone-200/80 rounded-xl p-4">
        <h3 className="font-medium text-sm text-stone-800 mb-1">todoタブのビジュアル画像</h3>
        <p className="text-xs text-stone-500 mb-3">
          todoタブの「タスク追加」ボタンの下に表示する画像です。PNGまたはJPEGファイルを選んで保存すると、全員の画面に反映されます。
          長辺{MAX_DIMENSION}px程度に自動で縮小されます。
        </p>

        {previewSrc ? (
          <div className="mb-3 flex justify-center bg-stone-50 rounded-xl p-3">
            <img src={previewSrc} alt="" className="max-h-40 rounded-lg" />
          </div>
        ) : (
          <p className="text-xs text-stone-400 mb-3">現在、画像は設定されていません。</p>
        )}

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-sm border border-stone-300 rounded-lg px-3.5 py-1.5 cursor-pointer hover:bg-stone-50 transition-colors">
            <Upload size={14} />
            画像を選ぶ
            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFileChange} />
          </label>
          <button
            onClick={handleSave}
            disabled={!pendingPreview || saving}
            className="flex items-center gap-1 bg-amber-700 text-white rounded-lg px-3.5 py-1.5 text-sm shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow disabled:opacity-40 disabled:shadow-none transition-all"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            保存
          </button>
          {todoVisual && (
            <button
              onClick={handleRemove}
              disabled={saving}
              className="flex items-center gap-1 text-sm text-stone-500 hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 size={14} /> 画像を削除
            </button>
          )}
          {savedFlash && <span className="text-xs text-emerald-600">保存しました</span>}
        </div>
      </div>
    </section>
  );
}
