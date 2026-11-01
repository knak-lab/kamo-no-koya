// =============================================================
//  米チャレ！(knak-lab/komechalle) 向けの読み取り口
//
//  GET ?action=komechalleExport&token=...&since=YYYY-MM-DD
//    → { products: [...], sales: [...], exportedAt }
//
//  - 対象は 商品マスター_原価管理 の komechalle 列が TRUE の商品だけ
//  - 売上の商品名は、フロントの resolvedSales と同じ順番
//    (売上個別修正 → 商品名エイリアス)で解決してから返す
//  - シートの作成・変更はしない(読み取りのみ)。getAll_() は重いので使わない
// =============================================================

function komechalleExport_(since) {
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(since || "")) ? String(since) : "";
  const products = getProducts_().filter(function (p) { return p.komechalle; });
  const ids = {};
  products.forEach(function (p) { ids[p.id] = true; });

  const overrides = getSaleOverrides_();
  const aliases = getProductAliases_();
  const sales = getSales_()
    .map(function (s) { return resolveSaleForExport_(s, overrides, aliases); })
    .filter(function (s) { return ids[s.productId] && (!from || s.date >= from); })
    .map(function (s) {
      return { id: s.id, date: s.date, productId: s.productId, qty: s.qty, amount: s.amount, channel: s.channel };
    });

  return {
    products: products.map(function (p) {
      return { id: p.id, name: p.name, price: p.price, category: p.category, active: p.active };
    }),
    sales: sales,
    exportedAt: Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd'T'HH:mm:ssXXX"),
  };
}

// src/App.jsx の resolvedSales と同じ順番: 売上個別修正(saleId単位) → 商品名エイリアス(rawName一括)
function resolveSaleForExport_(sale, overrides, aliases) {
  const o = overrides[sale.id];
  if (o && o.productId) return Object.assign({}, sale, { productId: o.productId, qty: Number(o.qty) || 0 });
  const alias = aliases[sale.productId];
  if (alias) return Object.assign({}, sale, { productId: alias });
  return sale;
}
