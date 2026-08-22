import { useState } from "react";
import { Upload, Trash2, Loader2, Plus } from "lucide-react";
import { resizeToDataUrl } from "../lib/image";

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

// サマリタブ「今月実績」の上に表示する複数枚の画像(自動でディゾルブ切り替え)。
// 1枚ずつではなく複数選択・複数登録を前提とするため、単一画像用のImageSettingCardとは別に用意する。
function SummaryImagesCard({ images, addSummaryImage, removeSummaryImage }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const maxDimension = 640; // サマリ上部で小さく表示するだけのため、大きな解像度は持たせない

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setError("");
    setUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          setError("画像ファイルを選んでください。");
          continue;
        }
        const dataUrl = await resizeToDataUrl(file, maxDimension);
        await addSummaryImage(file.name, dataUrl);
      }
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm("この画像を削除しますか？")) return;
    setError("");
    try {
      await removeSummaryImage(id);
    } catch (err) {
      setError(String(err.message || err));
    }
  };

  return (
    <div className="border border-stone-200/80 rounded-xl p-4">
      <h3 className="font-medium text-sm text-stone-800 mb-1">サマリページの画像(自動切り替え)</h3>
      <p className="text-xs text-stone-500 mb-3">
        サマリタブの「今月実績」の上に、小さく複数枚が自動で切り替わって表示されます。複数ファイルをまとめて選んで追加できます。長辺640px程度に自動で縮小されます。
      </p>

      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {images.map((img) => (
            <div key={img.id} className="relative w-16 h-16">
              <img src={img.url} alt="" className="w-16 h-16 rounded-lg object-cover border border-stone-200" />
              <button
                onClick={() => handleRemove(img.id)}
                className="absolute -top-1.5 -right-1.5 bg-white border border-stone-200 rounded-full p-0.5 text-stone-400 hover:text-red-600 shadow-sm"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-stone-400 mb-3">現在、画像は登録されていません。</p>
      )}

      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      <label className="flex items-center gap-1 text-sm border border-stone-300 rounded-lg px-3.5 py-1.5 cursor-pointer hover:bg-stone-50 transition-colors w-fit">
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        画像を追加
        <input
          type="file"
          accept="image/png,image/jpeg"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

// 商品マスタのカテゴリ一覧(追加・削除)。並び順=登録順で、商品マスタ一覧の
// グルーピング順にそのまま使われる。
function ProductCategoriesCard({ productCategories, addProductCategory, removeProductCategory }) {
  const [newCategory, setNewCategory] = useState("");

  const handleAdd = () => {
    if (!newCategory.trim()) return;
    addProductCategory(newCategory);
    setNewCategory("");
  };

  return (
    <div className="border border-stone-200/80 rounded-xl p-4">
      <h3 className="font-medium text-sm text-stone-800 mb-1">商品カテゴリ</h3>
      <p className="text-xs text-stone-500 mb-3">
        商品マスタで各商品に設定できるカテゴリの一覧です。ここでの追加・削除が商品マスタのカテゴリ選択肢・一覧のグルーピングに反映されます。
      </p>

      {productCategories.length > 0 ? (
        <ul className="space-y-1 mb-3">
          {productCategories.map((c) => (
            <li key={c} className="flex items-center justify-between border border-stone-200/80 rounded-lg px-2.5 py-1.5 text-sm">
              <span>{c}</span>
              <button onClick={() => removeProductCategory(c)} title="削除">
                <Trash2 size={13} className="text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md p-0.5 -m-0.5 transition-colors" style={{ boxSizing: "content-box" }} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-stone-400 mb-3">カテゴリがありません。</p>
      )}

      <div className="flex gap-2">
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="新しいカテゴリ名"
          className="flex-1 border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 transition-shadow"
        />
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 bg-amber-700 text-white rounded-lg px-3.5 py-1.5 text-sm shadow-sm shadow-amber-900/20 hover:bg-amber-800 hover:shadow transition-all shrink-0"
        >
          <Plus size={14} /> 追加
        </button>
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
  summaryImages,
  addSummaryImage,
  removeSummaryImage,
  productCategories,
  addProductCategory,
  removeProductCategory,
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

        <SummaryImagesCard images={summaryImages} addSummaryImage={addSummaryImage} removeSummaryImage={removeSummaryImage} />

        <ProductCategoriesCard productCategories={productCategories} addProductCategory={addProductCategory} removeProductCategory={removeProductCategory} />

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
