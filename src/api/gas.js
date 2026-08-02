const GAS_URL = import.meta.env.VITE_GAS_URL;
const API_TOKEN = import.meta.env.VITE_API_TOKEN || "";
const TASKMANIA_GAS_URL = import.meta.env.VITE_TASKMANIA_GAS_URL;

export const isGasReady = () => Boolean(GAS_URL);

// タスクマニアの完了状態(done)を読み取るための読み取り専用フェッチ。
// タスクマニアのGAS Web Appはこのアプリと違い { projects: [...] } を直接返す(okラッパーなし)。
export async function loadTaskmaniaProjects() {
  if (!TASKMANIA_GAS_URL) return { projects: [] };
  const res = await fetch(TASKMANIA_GAS_URL);
  if (!res.ok) throw new Error(`Taskmania GAS load failed: ${res.status}`);
  const data = await res.json();
  return { projects: data.projects || [] };
}

async function post(body) {
  if (!GAS_URL) throw new Error("VITE_GAS_URLが設定されていません");
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...body, token: API_TOKEN }),
  });
  if (!res.ok) throw new Error(`GAS request failed: ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "API error");
  return json;
}

export const gasApi = {
  // GAS Web AppはGETに対して常に全データを返す
  getAll: async () => {
    if (!GAS_URL) throw new Error("VITE_GAS_URLが設定されていません");
    const url = new URL(GAS_URL);
    if (API_TOKEN) url.searchParams.set("token", API_TOKEN);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`GAS request failed: ${res.status}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "API error");
    return json;
  },

  // 編集可能な全シートを一括で全洗い替え保存
  saveAll: (snapshot) => post({ action: "saveAll", ...snapshot }),

  // TODO/サブタスクだけを保存する軽量経路(頻繁に単独で保存されるためsaveAllから分離)
  saveTodos: (snapshot) => post({ action: "saveTodos", ...snapshot }),

  // Square連携フェーズ1: 商品マスター(Square由来)→ 商品マスター_原価管理 への名前・価格の一方向反映
  syncCatalogFromSquare: () => post({ action: "syncCatalogFromSquare" }),

  // レシピ登録前に原価0円で確定してしまった売上行を、現在のレシピで再計算する
  recalcZeroCostSales: () => post({ action: "recalcZeroCostSales" }),

  // Square注文の即時取り込み(売上データ取込ボタン)。取り込み後の原価スタンプまで行う
  syncSalesFromSquare: () => post({ action: "syncSalesFromSquare" }),
};
