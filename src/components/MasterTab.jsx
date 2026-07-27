import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, PlusCircle } from "lucide-react";
import { yen, pct, RAW, PACK, UNITS } from "../lib/constants";

export default function MasterTab({
  productDraft,
  draftCost,
  saveProductDraft,
  cancelProductDraft,
  updateDraftField,
  updateDraftServings,
  addDraftIngredientRow,
  updateDraftIngredientRow,
  removeDraftIngredientRow,
  addDraftBreakdownRow,
  updateDraftBreakdownRow,
  removeDraftBreakdownRow,
  pendingProductSwitch,
  confirmDiscardAndSwitchProduct,
  cancelPendingProductSwitch,
  requestOpenProduct,
  requestCreateProduct,
  kindMode,
  setKindMode,
  productQuery,
  setProductQuery,
  comboOpen,
  setComboOpen,
  comboMatches,
  exactMatchExists,
  updateProduct,
  commitProductRename,
  costRatioDraft,
  handleCostRatioChange,
  setEditingRatio,
  rawMaterials,
  packMaterials,
  materials,
  materialMap,
  singleProducts,
  productCosts,
  products,
  productListOpen,
  setProductListOpen,
  renamingId,
  setRenamingId,
  setProducts,
  materialForm,
  setMaterialForm,
  addMaterial,
  materialListOpen,
  setMaterialListOpen,
  updateMaterial,
  commitMaterialRename,
  removeMaterial,
  rebateForm,
  setRebateForm,
  addRebateClient,
  rebateListOpen,
  setRebateListOpen,
  rebateClients,
  updateRebateClient,
  removeRebateClient,
  expenseRates,
  expenseRateForm,
  setExpenseRateForm,
  addExpenseRate,
  removeExpenseRate,
  expenseRateListOpen,
  setExpenseRateListOpen,
  updateExpenseRate,
  squareSyncFromSquare,
  squareSyncConfirmOpen,
  setSquareSyncConfirmOpen,
  confirmSquareSyncToggle,
  squareSyncLog,
  squareSyncing,
  runSyncCatalogFromSquare,
}) {
  return (
    <>
      <section className="bg-white rounded-lg border border-stone-200 p-4">
          <div className="flex flex-col gap-3 mb-1">
            <div>
              <div className="text-xs text-stone-500 mb-1">区分(検索・新規登録の対象)</div>
              <div className="flex gap-1 bg-stone-100 rounded-md p-1 w-fit text-xs">
                {[
                  { value: "single", label: "単品" },
                  { value: "set", label: "セット" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setKindMode(opt.value)}
                    className={`px-3 py-1 rounded ${
                      kindMode === opt.value ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs text-stone-500 mb-1">商品を検索・選択</label>
              <input
                className="border rounded px-2 py-1 text-sm w-full max-w-xs"
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setComboOpen(true);
                }}
                onFocus={() => setComboOpen(true)}
                onBlur={() => setTimeout(() => setComboOpen(false), 150)}
                placeholder="商品名の一部を入力"
                autoComplete="off"
              />
              {comboOpen && productQuery.trim() && (
                <ul className="absolute z-10 mt-1 w-60 bg-white border border-stone-200 rounded shadow-md max-h-48 overflow-y-auto text-xs">
                  {comboMatches.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="w-full text-left px-2 py-1.5 hover:bg-amber-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => requestOpenProduct(p)}
                      >
                        {p.name}
                        <span className="text-stone-400 ml-1">({yen(p.price)})</span>
                      </button>
                    </li>
                  ))}
                  {!exactMatchExists && (
                    <li className="border-t border-stone-100">
                      <button
                        type="button"
                        className="w-full text-left px-2 py-1.5 hover:bg-amber-50 text-amber-700 flex items-center gap-1"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => requestCreateProduct(productQuery)}
                      >
                        <PlusCircle size={12} />「{productQuery}」を{kindMode === "set" ? "セット" : "単品"}として新規登録
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {productDraft && (
          <>
          <div id="product-edit-form" className="flex flex-col gap-3 mb-1 mt-3 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-stone-500">編集中の商品{productDraft.isNew ? "(新規)" : ""}</div>
                <div className="text-sm font-semibold">{productDraft.name}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={cancelProductDraft}
                  className="px-3 py-1.5 text-xs rounded border border-stone-300 text-stone-600 hover:bg-stone-50"
                >
                  キャンセル
                </button>
                <button onClick={saveProductDraft} className="px-3 py-1.5 text-xs rounded bg-amber-700 text-white hover:bg-amber-800">
                  保存
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs text-stone-500 mb-1">区分</div>
              <div className="flex gap-1 bg-stone-100 rounded-md p-1 w-fit text-xs">
                {[
                  { value: "single", label: "単品" },
                  { value: "set", label: "セット" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateDraftField("kind", opt.value)}
                    className={`px-3 py-1 rounded ${
                      (productDraft.kind || "single") === opt.value ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-stone-500 mb-1">価格(円)</label>
              <input
                type="number"
                className="border rounded px-2 py-1 text-sm w-28"
                value={productDraft.price}
                onChange={(e) => updateDraftField("price", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-stone-500 mb-1">原価率(%)で自動計算</label>
              <input
                type="number"
                step="0.1"
                className="border rounded px-2 py-1 text-sm w-28"
                value={costRatioDraft}
                onFocus={() => setEditingRatio(true)}
                onChange={(e) => handleCostRatioChange(e.target.value)}
                onBlur={() => setEditingRatio(false)}
                placeholder="例: 30"
              />
              <p className="text-[10px] text-stone-400 mt-0.5">価格は50円単位で切り上げ</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-stone-100 rounded-md p-3">
              <div>
                <div className="text-stone-500">製造原価計</div>
                <div className="tabular-nums font-medium">{yen(draftCost?.製造原価計)}</div>
              </div>
              <div>
                <div className="text-stone-500">製造原価単価(÷分割数)</div>
                <div className="tabular-nums font-medium">{yen(draftCost?.製造原価単価)}</div>
              </div>
              <div>
                <div className="text-stone-500">包材費計</div>
                <div className="tabular-nums font-medium">{yen(draftCost?.梱包材費計)}</div>
              </div>
              <div>
                <div className="text-stone-500">原価(1個あたり)</div>
                <div className="tabular-nums font-semibold">{yen(draftCost?.原価)}</div>
              </div>
              <div>
                <div className="text-stone-500">原価率</div>
                <div className="tabular-nums font-semibold">{pct(draftCost?.原価率)}</div>
              </div>
              <div>
                <div className="text-stone-500">限界利益率</div>
                <div className="tabular-nums font-semibold">{pct(draftCost?.限界利益率)}</div>
              </div>
            </div>

            {(productDraft.kind || "single") !== "set" && (
              <div className="flex items-center gap-2 text-xs">
                <label className="text-stone-500">分割数(何個分作れるか)</label>
                <input
                  type="number"
                  min={1}
                  className="border rounded px-2 py-1 w-16"
                  value={productDraft.servings}
                  onChange={(e) => updateDraftServings(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value === "" || Number(e.target.value) < 1) updateDraftServings("1");
                  }}
                />
              </div>
            )}
          </div>

          {/* 材料リスト(単品のみ) */}
          {(productDraft.kind || "single") !== "set" && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium">材料</h3>
                <button
                  onClick={() => addDraftIngredientRow("ingredients")}
                  className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"
                >
                  <Plus size={12} /> 材料を追加
                </button>
              </div>
              <div className="space-y-1">
                {productDraft.ingredients.map((row) => {
                  const mat = materialMap[row.materialId];
                  return (
                    <div key={row.id} className="flex items-center gap-2 text-xs">
                      <select
                        className="border rounded px-2 py-1 flex-1"
                        value={row.materialId}
                        onChange={(e) => updateDraftIngredientRow("ingredients", row.id, "materialId", e.target.value)}
                      >
                        {rawMaterials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-20"
                        value={row.amount}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateDraftIngredientRow("ingredients", row.id, "amount", e.target.value)}
                      />
                      <span className="text-stone-500 w-6">{mat?.unit || "g"}</span>
                      <span className="w-20 text-right tabular-nums text-stone-500">{yen((mat?.unitPrice || 0) * row.amount)}</span>
                      <button onClick={() => removeDraftIngredientRow("ingredients", row.id)}>
                        <Trash2 size={12} className="text-stone-400 hover:text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* セット内訳(セットのみ) */}
          {productDraft.kind === "set" && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium">セット内訳</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => addDraftBreakdownRow("component")}
                    className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"
                  >
                    <Plus size={12} /> 構成商品を追加
                  </button>
                  <button
                    onClick={() => addDraftBreakdownRow("material")}
                    className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"
                  >
                    <Plus size={12} /> 梱包・資材を追加
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-stone-400 mb-2">
                構成商品は「数量×原価」、梱包・資材は数量に関わらず単価そのままで計算されます(外箱など)。
              </p>
              <div className="space-y-1">
                {productDraft.breakdown.map((row) => {
                  const unitCost = row.kind === "component" ? productCosts[row.refId]?.原価 || 0 : materialMap[row.refId]?.unitPrice || 0;
                  const lineCost = row.kind === "component" ? unitCost * (Number(row.qty) || 0) : unitCost;
                  return (
                    <div key={row.id} className="flex items-center gap-2 text-xs">
                      <span
                        className={`shrink-0 w-16 text-center rounded px-1 py-0.5 ${
                          row.kind === "component" ? "bg-amber-50 text-amber-700" : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {row.kind === "component" ? "構成商品" : "梱包・資材"}
                      </span>
                      <select
                        className="border rounded px-2 py-1 flex-1"
                        value={row.refId || ""}
                        onChange={(e) => updateDraftBreakdownRow(row.id, "refId", e.target.value)}
                      >
                        {row.kind === "component"
                          ? singleProducts
                              .filter((p) => p.id !== productDraft.id)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))
                          : materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                      </select>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-16"
                        value={row.qty}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateDraftBreakdownRow(row.id, "qty", e.target.value)}
                      />
                      <span className="w-24 text-right tabular-nums text-stone-500">{yen(lineCost)}</span>
                      <button onClick={() => removeDraftBreakdownRow(row.id)}>
                        <Trash2 size={12} className="text-stone-400 hover:text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 包材リスト(単品のみ。セットの梱包・資材はセット内訳で管理) */}
          {productDraft.kind !== "set" && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium">包材</h3>
                <button
                  onClick={() => addDraftIngredientRow("packaging")}
                  className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"
                >
                  <Plus size={12} /> 包材を追加
                </button>
              </div>
              <div className="space-y-1">
                {productDraft.packaging.map((row) => {
                  const mat = materialMap[row.materialId];
                  return (
                    <div key={row.id} className="flex items-center gap-2 text-xs">
                      <select
                        className="border rounded px-2 py-1 flex-1"
                        value={row.materialId}
                        onChange={(e) => updateDraftIngredientRow("packaging", row.id, "materialId", e.target.value)}
                      >
                        {packMaterials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-20"
                        value={row.amount}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateDraftIngredientRow("packaging", row.id, "amount", e.target.value)}
                      />
                      <span className="text-stone-500 w-6">{mat?.unit || "個"}</span>
                      <span className="w-20 text-right tabular-nums text-stone-500">{yen((mat?.unitPrice || 0) * row.amount)}</span>
                      <button onClick={() => removeDraftIngredientRow("packaging", row.id)}>
                        <Trash2 size={12} className="text-stone-400 hover:text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </>
          )}
        </section>

      {/* 商品マスター一覧 */}
      <section className="bg-white rounded-lg border border-stone-200 p-4">
        <h2 className="font-semibold mb-1">商品マスター(単品)</h2>
        <p className="text-xs text-stone-500 mb-3">
          新規登録は上の検索欄から行います。商品名はレシピ・売上から参照されるキーなので、変更は鉛筆アイコンからのみ行えます。
        </p>

        <button
          onClick={() => setProductListOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-medium mb-2"
        >
          {productListOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          登録済み一覧({products.length}件)
        </button>

        {productListOpen && (
          <div className="overflow-x-auto">
            <table className="min-w-full whitespace-nowrap text-xs">
              <thead>
                <tr className="text-left text-stone-500 border-b">
                  <th className="py-1 pr-2">商品名</th>
                  <th className="py-1 pr-2">区分</th>
                  <th className="py-1 pr-2">価格</th>
                  <th className="py-1 pr-2">材料費(按分後)</th>
                  <th className="py-1 pr-2">包材費</th>
                  <th className="py-1 pr-2">原価</th>
                  <th className="py-1 pr-2">原価率</th>
                  <th className="py-1 pr-2">限界利益</th>
                  <th className="py-1 pr-2">限界利益率</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const c = productCosts[p.id];
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-stone-100 cursor-pointer ${productDraft?.id === p.id ? "bg-amber-50" : ""}`}
                      onClick={() => requestOpenProduct(p)}
                    >
                      <td className="py-1 pr-2 font-medium">
                        <div className="flex items-center gap-1">
                          {renamingId === p.id ? (
                            <input
                              autoFocus
                              className="border rounded px-1 py-0.5 text-xs w-28"
                              value={p.name}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateProduct(p.id, "name", e.target.value)}
                              onBlur={() => {
                                commitProductRename(p.id);
                                setRenamingId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  commitProductRename(p.id);
                                  setRenamingId(null);
                                }
                              }}
                            />
                          ) : (
                            <span>{p.name}</span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingId(renamingId === p.id ? null : p.id);
                            }}
                            title="商品名を変更"
                          >
                            <Pencil size={11} className="text-stone-300 hover:text-amber-700" />
                          </button>
                          {productDraft?.id === p.id && <ChevronDown size={12} className="text-amber-700" />}
                        </div>
                      </td>
                      <td className="py-1 pr-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.kind === "set" ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-600"}`}>
                          {p.kind === "set" ? "セット" : "単品"}
                        </span>
                      </td>
                      <td className="py-1 pr-2 tabular-nums">{yen(p.price)}</td>
                      <td className="py-1 pr-2 tabular-nums text-stone-500">{yen(c?.材料費)}</td>
                      <td className="py-1 pr-2 tabular-nums text-stone-500">{yen(c?.梱包材費)}</td>
                      <td className="py-1 pr-2 tabular-nums font-medium">{yen(c?.原価)}</td>
                      <td className="py-1 pr-2 tabular-nums text-stone-500">{pct(c?.原価率)}</td>
                      <td className="py-1 pr-2 tabular-nums">{yen(c?.限界利益)}</td>
                      <td className={`py-1 pr-2 tabular-nums font-semibold ${c?.限界利益率 >= 0.5 ? "text-emerald-700" : "text-amber-700"}`}>
                        {pct(c?.限界利益率)}
                      </td>
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProducts((prev) => prev.filter((x) => x.id !== p.id));
                          }}
                        >
                          <Trash2 size={13} className="text-stone-400 hover:text-red-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 材料・包材マスタ */}
      <section className="bg-white rounded-lg border border-stone-200 p-4">
        <h2 className="font-semibold mb-3">材料・包材マスタ</h2>
        <div className="flex flex-wrap gap-2 items-end mb-3 text-sm">
          <div>
            <label className="block text-xs text-stone-500 mb-1">材料名</label>
            <input
              className="border rounded px-2 py-1 w-32"
              value={materialForm.name}
              onChange={(e) => setMaterialForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="薄力粉"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">区分</label>
            <select
              className="border rounded px-2 py-1"
              value={materialForm.category}
              onChange={(e) => setMaterialForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value={RAW}>{RAW}</option>
              <option value={PACK}>{PACK}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">単位</label>
            <select
              className="border rounded px-2 py-1"
              value={materialForm.unit}
              onChange={(e) => setMaterialForm((f) => ({ ...f, unit: e.target.value }))}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">仕入単価</label>
            <input
              type="number"
              step="0.01"
              className="border rounded px-2 py-1 w-24"
              value={materialForm.unitPrice}
              onChange={(e) => setMaterialForm((f) => ({ ...f, unitPrice: e.target.value }))}
            />
          </div>
          <button onClick={addMaterial} className="flex items-center gap-1 bg-amber-700 text-white rounded px-3 py-1.5 hover:bg-amber-800">
            <Plus size={14} /> 追加
          </button>
        </div>

        <button
          onClick={() => setMaterialListOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-medium"
        >
          {materialListOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          登録済み一覧({materials.length}件)
        </button>

        {materialListOpen && (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-stone-500 border-b">
                  <th className="py-1 pr-2">材料名</th>
                  <th className="py-1 pr-2">区分</th>
                  <th className="py-1 pr-2">単位</th>
                  <th className="py-1 pr-2">仕入単価</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id} className="border-b border-stone-100">
                    <td className="py-1 pr-2">
                      <input
                        className="border rounded px-1 py-0.5 w-28"
                        value={m.name}
                        onChange={(e) => updateMaterial(m.id, "name", e.target.value)}
                        onBlur={() => commitMaterialRename(m.id)}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <select
                        className="border rounded px-1 py-0.5"
                        value={m.category}
                        onChange={(e) => updateMaterial(m.id, "category", e.target.value)}
                      >
                        <option value={RAW}>{RAW}</option>
                        <option value={PACK}>{PACK}</option>
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <select className="border rounded px-1 py-0.5" value={m.unit} onChange={(e) => updateMaterial(m.id, "unit", e.target.value)}>
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <span>¥</span>
                        <input
                          type="number"
                          step="0.01"
                          className="border rounded px-1 py-0.5 w-20"
                          value={m.unitPrice}
                          onChange={(e) => updateMaterial(m.id, "unitPrice", e.target.value)}
                        />
                        <span className="text-stone-400">/ {m.unit}</span>
                      </div>
                    </td>
                    <td>
                      <button onClick={() => removeMaterial(m.id)}>
                        <Trash2 size={13} className="text-stone-400 hover:text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 販売先(委託先)マスタ */}
      <section className="bg-white rounded-lg border border-stone-200 p-4">
        <h2 className="font-semibold mb-3">販売先(委託先)マスタ</h2>
        <div className="flex flex-wrap gap-2 items-end mb-3 text-sm">
          <div>
            <label className="block text-xs text-stone-500 mb-1">販売先</label>
            <input
              className="border rounded px-2 py-1 w-32"
              value={rebateForm.name}
              onChange={(e) => setRebateForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="□□商店"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">リベート率(%)</label>
            <input
              type="number"
              step="0.1"
              className="border rounded px-2 py-1 w-20"
              value={rebateForm.rate}
              onChange={(e) => setRebateForm((f) => ({ ...f, rate: e.target.value }))}
              placeholder="15"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">備考</label>
            <input
              className="border rounded px-2 py-1 w-40"
              value={rebateForm.memo}
              onChange={(e) => setRebateForm((f) => ({ ...f, memo: e.target.value }))}
              placeholder="任意"
            />
          </div>
          <button onClick={addRebateClient} className="flex items-center gap-1 bg-amber-700 text-white rounded px-3 py-1.5 hover:bg-amber-800">
            <Plus size={14} /> 追加
          </button>
        </div>

        <button
          onClick={() => setRebateListOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-medium"
        >
          {rebateListOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          登録済み一覧({rebateClients.length}件)
        </button>

        {rebateListOpen && (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-stone-500 border-b">
                  <th className="py-1 pr-2">販売先</th>
                  <th className="py-1 pr-2">リベート率</th>
                  <th className="py-1 pr-2">備考</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rebateClients.map((c) => (
                  <tr key={c.id} className="border-b border-stone-100">
                    <td className="py-1 pr-2">
                      <input className="border rounded px-1 py-0.5 w-28" value={c.name} onChange={(e) => updateRebateClient(c.id, "name", e.target.value)} />
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          className="border rounded px-1 py-0.5 w-16"
                          value={Math.round(c.rate * 1000) / 10}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateRebateClient(c.id, "rate", e.target.value)}
                        />
                        <span className="text-stone-400">%</span>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        className="border rounded px-1 py-0.5 w-40"
                        value={c.memo || ""}
                        onChange={(e) => updateRebateClient(c.id, "memo", e.target.value)}
                        placeholder="任意"
                      />
                    </td>
                    <td>
                      <button onClick={() => removeRebateClient(c.id)}>
                        <Trash2 size={13} className="text-stone-400 hover:text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 経費マスタ(時間単価) */}
      <section className="bg-white rounded-lg border border-stone-200 p-4">
        <h2 className="font-semibold mb-1">経費マスタ(時間単価)</h2>
        <p className="text-xs text-stone-500 mb-3">
          時間単価で管理する項目です(店舗利用料・人件費など)。入力タブで時間を入れると自動で金額を計算します。項目は自由に追加できます。
        </p>

        <div className="flex flex-wrap gap-2 items-end mb-3 text-sm">
          <div>
            <label className="block text-xs text-stone-500 mb-1">項目名</label>
            <input
              className="border rounded px-2 py-1 w-40"
              value={expenseRateForm.name}
              onChange={(e) => setExpenseRateForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="臨時スタッフ人件費"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">時間単価(円/時)</label>
            <input
              type="number"
              className="border rounded px-2 py-1 w-24"
              value={expenseRateForm.rate}
              onChange={(e) => setExpenseRateForm((f) => ({ ...f, rate: e.target.value }))}
            />
          </div>
          <button onClick={addExpenseRate} className="flex items-center gap-1 bg-amber-700 text-white rounded px-3 py-1.5 hover:bg-amber-800">
            <Plus size={14} /> 追加
          </button>
        </div>

        <button
          onClick={() => setExpenseRateListOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-medium"
        >
          {expenseRateListOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          登録済み一覧({Object.keys(expenseRates).length}件)
        </button>

        {expenseRateListOpen && (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-stone-500 border-b">
                  <th className="py-1 pr-2">項目</th>
                  <th className="py-1 pr-2">時間単価(円/時)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(expenseRates).map((item) => (
                  <tr key={item} className="border-b border-stone-100">
                    <td className="py-1 pr-2">{item}</td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <span>¥</span>
                        <input
                          type="number"
                          className="border rounded px-1 py-0.5 w-24"
                          value={expenseRates[item] || 0}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateExpenseRate(item, e.target.value)}
                        />
                        <span className="text-stone-400">/ 時間</span>
                      </div>
                    </td>
                    <td>
                      <button onClick={() => removeExpenseRate(item)}>
                        <Trash2 size={13} className="text-stone-400 hover:text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Square連携(商品マスタの正の切り替え) */}
      <section className="bg-white rounded-lg border border-stone-200 p-4">
        <h2 className="font-semibold mb-1">Square連携</h2>
        <p className="text-xs text-stone-500 mb-3">
          商品マスタ(商品名・価格)をどちらが正として扱うかを切り替えます。切り替えは現場運用に直結するため、確認ダイアログが出ます。
        </p>
        <div className="flex items-center justify-between border border-stone-200 rounded-md p-3">
          <div>
            <div className="text-sm font-medium">{squareSyncFromSquare ? "Square → アプリ(現在の運用)" : "アプリ → Square"}</div>
            <div className="text-xs text-stone-500 mt-0.5">
              {squareSyncFromSquare
                ? "商品名・価格はSquare側が正。アプリのレシピ・原価計算は参考表示のみで、価格には反映されません。"
                : "商品名・価格はアプリ側が正。ただし現時点ではSquare Catalogへの自動反映(フェーズ2)は未実装のため、実際の書き込みは行われません。"}
            </div>
          </div>
          <button
            onClick={() => setSquareSyncConfirmOpen(true)}
            className={`relative w-14 h-7 rounded-full transition shrink-0 ml-4 ${squareSyncFromSquare ? "bg-stone-300" : "bg-amber-700"}`}
            aria-label="Square連携モード切り替え"
          >
            <span
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition ${squareSyncFromSquare ? "left-0.5" : "left-7"}`}
            />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between border border-stone-200 rounded-md p-3">
          <div>
            <div className="text-sm font-medium">今すぐ同期(Square → アプリ)</div>
            <div className="text-xs text-stone-500 mt-0.5">
              既存の「商品マスター」シート(Square由来)の商品名・価格を、アプリの商品マスターに一方向で反映します。
            </div>
          </div>
          <button
            onClick={runSyncCatalogFromSquare}
            disabled={squareSyncing}
            className="shrink-0 ml-4 bg-amber-700 text-white rounded px-3 py-1.5 text-sm hover:bg-amber-800 disabled:opacity-50"
          >
            {squareSyncing ? "同期中…" : "今すぐ同期"}
          </button>
        </div>

        {squareSyncLog.length > 0 && (
          <div className="mt-3 text-xs text-stone-500 space-y-0.5">
            {squareSyncLog.slice(0, 5).map((l, i) => (
              <div key={i}>
                {l.timestamp} — {l.type} — {l.status} {l.message ? `(${l.message})` : ""}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* フェールセーフ確認ダイアログ */}
      {squareSyncConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-semibold text-sm mb-2">確認</h3>
            <p className="text-sm text-stone-700 mb-1">Squareとの商品マスタの連動が変わります。本当に実行しますか?</p>
            <p className="text-xs text-stone-500 mb-4">
              切り替え後: {squareSyncFromSquare ? "アプリ → Square(アプリの価格がSquareに反映されます)" : "Square → アプリ(Squareの価格が正に戻ります)"}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSquareSyncConfirmOpen(false)}
                className="px-3 py-1.5 text-sm rounded border border-stone-300 text-stone-600 hover:bg-stone-50"
              >
                キャンセル
              </button>
              <button onClick={confirmSquareSyncToggle} className="px-3 py-1.5 text-sm rounded bg-amber-700 text-white hover:bg-amber-800">
                実行する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 商品編集の未保存確認ダイアログ */}
      {pendingProductSwitch && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-semibold text-sm mb-2">確認</h3>
            <p className="text-sm text-stone-700 mb-4">編集中の内容が保存されていません。保存せずに移動しますか?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelPendingProductSwitch}
                className="px-3 py-1.5 text-sm rounded border border-stone-300 text-stone-600 hover:bg-stone-50"
              >
                キャンセル
              </button>
              <button onClick={confirmDiscardAndSwitchProduct} className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700">
                破棄して移動
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
