import { X, ExternalLink } from "lucide-react";
import { TABS } from "../lib/constants";

// PCでは常時表示の固定サイドバー、スマホでは左からスライドインするドロワーメニュー。
// openの真偽はスマホ表示時のみ意味を持つ(md以上はCSSで常に表示・位置固定)。
export default function Sidebar({ tab, setTab, open, onClose, onlineShopUrl }) {
  return (
    <>
      {open && <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={onClose} />}

      <nav
        className={`fixed md:sticky top-0 md:top-6 left-0 h-full md:h-[calc(100vh-3rem)] w-64 md:w-52 shrink-0 bg-white border-r md:border md:rounded-2xl border-stone-200/70 md:shadow-sm md:shadow-stone-300/30 z-50 transform transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } flex flex-col overflow-y-auto`}
      >
        <div className="flex items-center justify-between px-4 py-4 md:hidden border-b border-stone-100">
          <span className="font-display font-semibold text-stone-800">メニュー</span>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-800">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-1 p-3">
          {TABS.map((t, i) => (
            <div key={t.key}>
              {i > 0 && t.group !== TABS[i - 1].group && <div className="my-2 border-t border-stone-200/70" />}
              <button
                onClick={() => {
                  setTab(t.key);
                  onClose();
                }}
                className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.key ? "bg-amber-50 text-amber-800 shadow-sm shadow-stone-300/30" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                {t.label}
              </button>
              {t.key === "todo" &&
                (onlineShopUrl ? (
                  <a
                    href={onlineShopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all"
                  >
                    オンラインショップ
                    <ExternalLink size={12} className="text-stone-400 shrink-0" />
                  </a>
                ) : (
                  <span
                    title="「設定」タブでURLを登録してください"
                    className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-medium text-stone-300 cursor-not-allowed"
                  >
                    オンラインショップ
                    <ExternalLink size={12} className="text-stone-300 shrink-0" />
                  </span>
                ))}
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
