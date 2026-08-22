import { useState } from "react";
import { Upload, Trash2, Loader2 } from "lucide-react";

// 選んだ画像ファイルを長辺maxDimension以下に縮小し、data URLとして返す。
// mimeTypeが"image/jpeg"ならJPEGとして(品質0.85)、それ以外はPNGとして再エンコードする
function resizeToDataUrl(file, maxDimension) {
  const mimeType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("画像として読み込めませんでした"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const scale = maxDimension / Math.max(width, height);
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

// 画像1件の選択・プレビュー・保存・削除を扱う共通カード。
// allowJpeg=falseの場合はPNGのみ受け付ける(アプリアイコン用)。
function ImageSettingCard({ title, description, currentValue, onSave, saving, allowJpeg, maxDimension }) {
  const [pendingPreview, setPendingPreview] = useState(null);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const acceptedTypes = allowJpeg ? ["image/png", "image/jpeg"] : ["image/png"];
  const acceptAttr = allowJpeg ? "image/png,image/jpeg" : "image/png";
  const maxBase64Chars = 200000; // GAS側の上限(約150KB)と合わせる

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを連続で選び直せるようにする
    if (!file) return;
    setError("");
    if (!acceptedTypes.includes(file.type)) {
      setError(allowJpeg ? "PNGまたはJPEGファイルを選んでください。" : "PNGファイルを選んでください。");
      return;
    }
    try {
      const dataUrl = await resizeToDataUrl(file, maxDimension);
      const base64Len = dataUrl.split(",")[1]?.length || 0;
      if (base64Len > maxBase64Chars) {
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
      await onSave(pendingPreview);
      setPendingPreview(null);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(String(err.message || err));
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("画像を削除しますか？")) return;
    setError("");
    try {
      await onSave("");
      setPendingPreview(null);
    } catch (err) {
      setError(String(err.message || err));
    }
  };

  const previewSrc = pendingPreview || currentValue;

  return (
    <div className="border border-stone-200/80 rounded-xl p-4">
      <h3 className="font-medium text-sm text-stone-800 mb-1">{title}</h3>
      <p className="text-xs text-stone-500 mb-3">{description}</p>

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
          <input type="file" accept={acceptAttr} className="hidden" onChange={handleFileChange} />
        </label>
        <button
          onClick={handleSave}
          disabled={!pendingPreview || saving}
          className="flex items-center gap-1 bg-amber-700 text-white rounded-lg px-3.5 py-1.5 text-sm shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow disabled:opacity-40 disabled:shadow-none transition-all"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          保存
        </button>
        {currentValue && (
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
  );
}

export default function SettingsTab({
  todoVisual,
  saveTodoVisual,
  todoVisualSaving,
  appIcon,
  saveAppIcon,
  appIconSaving,
  onlineShopUrl,
  setOnlineShopUrl,
}) {
  return (
    <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
      <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-1">設定</h2>
      <p className="text-xs text-stone-500 mb-4">
        ここでの変更はアプリを使う全員に反映されます。開発者(Claude Code)に頼まなくても、この画面から直接変更できます。
      </p>

      <div className="space-y-4">
        <ImageSettingCard
          title="todoタブのビジュアル画像"
          description="todoタブの「タスク追加」ボタンの下に表示する画像です。PNGまたはJPEGファイルを選んで保存すると、全員の画面に反映されます。長辺800px程度に自動で縮小されます。"
          currentValue={todoVisual}
          onSave={saveTodoVisual}
          saving={todoVisualSaving}
          allowJpeg
          maxDimension={800}
        />
        <ImageSettingCard
          title="アプリアイコン"
          description="トップ左上と読み込み中画面に表示するアイコンです。他のアイコン(favicon等)と見た目を揃えるため、PNGファイルのみ選べます。長辺512px程度に自動で縮小されます。"
          currentValue={appIcon}
          onSave={saveAppIcon}
          saving={appIconSaving}
          allowJpeg={false}
          maxDimension={512}
        />

        <div className="border border-stone-200/80 rounded-xl p-4">
          <h3 className="font-medium text-sm text-stone-800 mb-1">オンラインショップのURL</h3>
          <p className="text-xs text-stone-500 mb-3">
            サイドバーの「todo」の下に表示される「オンラインショップ」リンクの遷移先です。入力すると自動で保存されます(未入力の間はリンクを押せません)。
          </p>
          <input
            type="url"
            inputMode="url"
            placeholder="https://example.com/shop"
            className="w-full border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow text-sm"
            value={onlineShopUrl}
            onChange={(e) => setOnlineShopUrl(e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}
