import DateAccordion from "./DateAccordion";
import { TrendingUp, TrendingDown, Wallet, Percent, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { yen, METRIC_LABEL, COLOR_POSITIVE, COLOR_NEGATIVE } from "../lib/constants";

function StatTile({ icon: Icon, label, value, sub, tone }) {
  const toneClass = tone === "bad" ? "text-red-600" : tone === "good" ? "text-emerald-700" : "text-stone-900";
  return (
    <div className="rounded-2xl border border-stone-200/70 bg-stone-50/60 p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs text-stone-500">
        <Icon size={14} className="text-amber-700" />
        {label}
      </div>
      <div className={`text-xl font-semibold tabular-nums tracking-tight ${toneClass}`}>{value}</div>
      {sub && <div className="text-[11px] text-stone-400">{sub}</div>}
    </div>
  );
}

export default function SummaryTab({
  summaryPeriod,
  setSummaryPeriod,
  summaryMetric,
  setSummaryMetric,
  summaryChannel,
  setSummaryChannel,
  summaryYearMonth,
  setSummaryYearMonth,
  salesChannels,
  monthlyChartData,
  dailyChartData,
  customerPeriod,
  setCustomerPeriod,
  customerChannel,
  setCustomerChannel,
  customerYearMonth,
  setCustomerYearMonth,
  customerChartData,
  productSalesRanking,
  dailyRows,
  channelMap,
  rebateMap,
  sales,
  productMap,
  allYearMonths,
  mgmtBudgets,
}) {
  const isMonth = summaryPeriod === "month";
  const chartData = isMonth ? monthlyChartData : dailyChartData;
  const showTarget = isMonth && summaryChannel === "all";

  // 直近で実績のある月のKPIを4枚のタイルで一目でわかるようにする
  const latestYm = [...allYearMonths].reverse().find((ym) => dailyRows.some((d) => d.yearMonth === ym && d.売上_日次 > 0));
  const kpiRows = latestYm ? dailyRows.filter((d) => d.yearMonth === latestYm) : [];
  const kpiSales = kpiRows.reduce((a, d) => a + d.売上_日次, 0);
  const kpiProfit = kpiRows.reduce((a, d) => a + d.営業利益_管理_日次, 0);
  const kpiGross = kpiRows.reduce((a, d) => a + d.粗利_日次, 0);
  const kpiCustomers = kpiRows.reduce((a, d) => a + d.客数, 0);
  const kpiGrossRatio = kpiSales > 0 ? kpiGross / kpiSales : 0;
  const budget = latestYm ? mgmtBudgets?.[latestYm] : null;
  const salesDiff = budget?.salesBudget ? kpiSales - budget.salesBudget : null;
  const profitDiff = budget?.profitBudget ? kpiProfit - budget.profitBudget : null;

  return (
    <>
      {/* 直近実績サマリ */}
      {latestYm && (
        <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight">直近実績({latestYm})</h2>
            <span className="text-[11px] text-stone-400">売上が発生している最新月</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile
              icon={Wallet}
              label="売上"
              value={yen(kpiSales)}
              sub={salesDiff !== null ? `予算比 ${salesDiff >= 0 ? "+" : ""}${yen(salesDiff)}` : undefined}
              tone={salesDiff !== null ? (salesDiff >= 0 ? "good" : "bad") : undefined}
            />
            <StatTile
              icon={kpiProfit >= 0 ? TrendingUp : TrendingDown}
              label="営業利益(管理)"
              value={yen(kpiProfit)}
              sub={profitDiff !== null ? `予算比 ${profitDiff >= 0 ? "+" : ""}${yen(profitDiff)}` : undefined}
              tone={kpiProfit >= 0 ? "good" : "bad"}
            />
            <StatTile
              icon={Percent}
              label="粗利率"
              value={`${(kpiGrossRatio * 100).toFixed(1)}%`}
              sub={budget?.grossMarginRatio ? `目標 ${budget.grossMarginRatio.toFixed(1)}%` : undefined}
            />
            <StatTile icon={Users} label="客数" value={`${kpiCustomers}人`} />
          </div>
        </section>
      )}

      {/* 予実 */}
      <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
        <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-3">予実</h2>
        <div className="flex flex-wrap gap-4 mb-3">
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit text-xs">
            {["month", "day"].map((p) => (
              <button
                key={p}
                onClick={() => setSummaryPeriod(p)}
                className={`px-3 py-1 rounded ${summaryPeriod === p ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
              >
                {p === "month" ? "月次" : "日次"}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit text-xs">
            {["sales", "profit"].map((k) => (
              <button
                key={k}
                onClick={() => setSummaryMetric(k)}
                className={`px-3 py-1 rounded ${summaryMetric === k ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
              >
                {METRIC_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit text-xs flex-wrap">
            <button
              onClick={() => setSummaryChannel("all")}
              className={`px-3 py-1 rounded ${summaryChannel === "all" ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
            >
              全形態
            </button>
            {salesChannels.map((c) => (
              <button
                key={c.id}
                onClick={() => setSummaryChannel(c.id)}
                className={`px-3 py-1 rounded ${summaryChannel === c.id ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          {!isMonth && allYearMonths.length > 0 && (
            <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit text-xs flex-wrap">
              <button
                onClick={() => setSummaryYearMonth("all")}
                className={`px-3 py-1 rounded ${summaryYearMonth === "all" ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
              >
                全期間
              </button>
              {allYearMonths.map((ym) => (
                <button
                  key={ym}
                  onClick={() => setSummaryYearMonth(ym)}
                  className={`px-3 py-1 rounded ${summaryYearMonth === ym ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
                >
                  {ym}
                </button>
              ))}
            </div>
          )}
        </div>
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="name" tick={{ fontSize: isMonth ? 11 : 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                {summaryMetric === "sales" && (
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                )}
                <Tooltip formatter={(v, name) => (name.includes("粗利率") ? `${v}%` : yen(v))} />
                <Legend />
                {showTarget && <Bar yAxisId="left" dataKey="目標" fill="#d6d3d1" radius={[3, 3, 0, 0]} />}
                <Bar yAxisId="left" dataKey="実績" radius={[3, 3, 0, 0]}>
                  {chartData.map((row, i) => (
                    <Cell key={i} fill={row.実績 >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE} />
                  ))}
                </Bar>
                {summaryMetric === "sales" && (
                  <Line yAxisId="right" type="monotone" dataKey="実績粗利率" stroke="#86efac" strokeWidth={2} dot={{ r: 3 }} />
                )}
                {summaryMetric === "sales" && showTarget && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="目標粗利率"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-stone-400">データがありません</p>
        )}
      </section>

      {/* 客数と客単価 */}
      <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
        <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-3">客数と客単価</h2>
        <div className="flex flex-wrap gap-4 mb-3">
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit text-xs">
            {["month", "day"].map((p) => (
              <button
                key={p}
                onClick={() => setCustomerPeriod(p)}
                className={`px-3 py-1 rounded ${customerPeriod === p ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
              >
                {p === "month" ? "月次" : "日次"}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit text-xs flex-wrap">
            <button
              onClick={() => setCustomerChannel("all")}
              className={`px-3 py-1 rounded ${customerChannel === "all" ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
            >
              全形態
            </button>
            {salesChannels.map((c) => (
              <button
                key={c.id}
                onClick={() => setCustomerChannel(c.id)}
                className={`px-3 py-1 rounded ${customerChannel === c.id ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          {customerPeriod === "day" && allYearMonths.length > 0 && (
            <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit text-xs flex-wrap">
              <button
                onClick={() => setCustomerYearMonth("all")}
                className={`px-3 py-1 rounded ${customerYearMonth === "all" ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
              >
                全期間
              </button>
              {allYearMonths.map((ym) => (
                <button
                  key={ym}
                  onClick={() => setCustomerYearMonth(ym)}
                  className={`px-3 py-1 rounded ${customerYearMonth === ym ? "bg-white shadow text-amber-800 font-medium" : "text-stone-500"}`}
                >
                  {ym}
                </button>
              ))}
            </div>
          )}
        </div>
        {customerChartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={customerChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="name" tick={{ fontSize: customerPeriod === "month" ? 11 : 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: "客数", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  label={{ value: "客単価", angle: 90, position: "insideRight", fontSize: 11 }}
                />
                <Tooltip formatter={(v, name) => (name === "客単価" ? yen(v) : v)} />
                <Legend />
                <Bar yAxisId="left" dataKey="客数" fill="#d6d3d1" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="客単価" stroke="#b45309" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-stone-400">データがありません</p>
        )}
      </section>

      {/* 商品別売上(上位10) */}
      <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
        <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-3">商品別売上(上位10)</h2>
        {productSalesRanking.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productSalesRanking}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => yen(v)} />
                <Bar dataKey="売上" fill="#b45309" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-stone-400">データがありません</p>
        )}
      </section>

      {/* 日次売上明細(日次集計・月次予算入力) */}
      <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
        <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-1">日次売上明細</h2>
        <p className="text-xs text-stone-500 mb-3">
          販売形態・委託先は「入力」タブの日次設定で選びます。ここは自動計算の結果表示のみです。年・月・日をクリックして開閉できます。
        </p>

        <div className="mb-4 bg-stone-100 rounded px-3 py-2 text-xs font-mono">
          営業利益(管理) = 売上_実績 − 原価_実績(標準) − その他経費_実績
        </div>

        <DateAccordion
          items={dailyRows}
          getDate={(d) => d.date}
          renderDay={([d]) => {
            const channel = channelMap[d.channelId];
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-stone-50 rounded p-2">
                <div>
                  <div className="text-stone-500">販売形態</div>
                  <div>{channel?.name || "(未選択)"}</div>
                </div>
                <div>
                  <div className="text-stone-500">委託先</div>
                  <div>{rebateMap[d.clientId]?.name || "(未選択)"}</div>
                </div>
                <div>
                  <div className="text-stone-500">客数</div>
                  <div className="tabular-nums">{d.客数}</div>
                </div>
                <div>
                  <div className="text-stone-500">客単価</div>
                  <div className="tabular-nums">{yen(d.客単価)}</div>
                </div>
                <div>
                  <div className="text-stone-500">売上(値引前)</div>
                  <div className="tabular-nums">{yen(d.値引前)}</div>
                </div>
                <div>
                  <div className="text-stone-500">リベート</div>
                  <div className="tabular-nums text-red-600">{d.リベート ? `-${yen(d.リベート)}` : "-"}</div>
                </div>
                <div>
                  <div className="text-stone-500">売上(日次)</div>
                  <div className="tabular-nums font-medium">{yen(d.売上_日次)}</div>
                </div>
                <div>
                  <div className="text-stone-500">原価(標準)</div>
                  <div className="tabular-nums text-stone-500">{yen(d.原価標準_日次)}</div>
                </div>
                <div>
                  <div className="text-stone-500">粗利</div>
                  <div className="tabular-nums">{yen(d.粗利_日次)}</div>
                </div>
                <div>
                  <div className="text-stone-500">その他経費</div>
                  <div className="tabular-nums text-stone-500">{yen(d.その他経費_日次)}</div>
                </div>
                <div>
                  <div className="text-stone-500">営業利益(管理)</div>
                  <div className={`tabular-nums font-semibold ${d.営業利益_管理_日次 >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {yen(d.営業利益_管理_日次)}
                  </div>
                </div>
              </div>
            );
          }}
        />

        <p className="text-xs text-stone-500 mt-3">
          月次の目標(売上・粗利率・利益)は「入力」タブの「目標」セクションで編集できます。
        </p>
      </section>

      {/* 売上明細(Square由来・読み取り専用) */}
      <section className="bg-white rounded-2xl border border-stone-200/70 shadow-sm shadow-stone-300/30 p-5">
        <h2 className="font-semibold text-[15px] text-stone-800 tracking-tight mb-1">売上明細</h2>
        <p className="text-xs text-stone-500 mb-3">
          Squareから同期された売上を1件ずつ表示します(読み取り専用)。年・月・日をクリックして開閉できます。
        </p>
        <DateAccordion
          items={sales}
          getDate={(s) => s.date}
          renderDay={(daySales) => (
            <div className="overflow-x-auto">
              <table className="min-w-full whitespace-nowrap text-xs">
                <thead>
                  <tr className="text-left text-stone-500 border-b">
                    <th className="py-1 pr-2">商品名</th>
                    <th className="py-1 pr-2">数量</th>
                    <th className="py-1 pr-2">金額</th>
                    <th className="py-1 pr-2">原価(単価)</th>
                    <th className="py-1 pr-2">原価(小計)</th>
                    <th className="py-1 pr-2">粗利</th>
                  </tr>
                </thead>
                <tbody>
                  {daySales.map((s) => (
                    <tr key={s.id} className="border-b border-stone-100">
                      <td className="py-1 pr-2">{productMap[s.productId]?.name || s.productId}</td>
                      <td className="py-1 pr-2 tabular-nums">{s.qty}</td>
                      <td className="py-1 pr-2 tabular-nums">{yen(s.amount)}</td>
                      <td className="py-1 pr-2 tabular-nums text-stone-500">{s.unitCostAtSale !== undefined ? yen(s.unitCostAtSale) : "-"}</td>
                      <td className="py-1 pr-2 tabular-nums text-stone-500">{s.costSubtotal !== undefined ? yen(s.costSubtotal) : "-"}</td>
                      <td className="py-1 pr-2 tabular-nums font-medium">
                        {s.costSubtotal !== undefined ? yen(s.amount - s.costSubtotal) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        />
      </section>
    </>
  );
}
