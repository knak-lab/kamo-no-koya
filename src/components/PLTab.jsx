import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { yen } from "../lib/constants";

export default function PLTab({ monthlyRows }) {
  return (
    <section className="bg-white rounded-lg border border-stone-200 p-4 space-y-4">
      <div>
        <h2 className="font-semibold">PL(損益計算書) — 実際の入出金ベース</h2>
        <p className="text-xs text-stone-500 mt-1">標準原価ではなく、実際に仕入れた原材料・資材の金額を使います。</p>
      </div>

      {monthlyRows.map((m) => {
        const diff = m.営業利益_財務 - (m.fBudget.profitBudget || 0);
        const 売上総利益 = m.売上_実績 - m.原材料仕入_実績;
        return (
          <div key={m.yearMonth} className="border border-stone-200 rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold">{m.yearMonth}</span>
              <span className={`flex items-center gap-1 text-sm font-medium ${diff >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {diff >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                予実差 {yen(diff)}
              </span>
            </div>

            {/* 損益計算書(縦積み) */}
            <div className="font-mono text-sm">
              <div className="flex justify-between py-1">
                <span>売上高</span>
                <span className="tabular-nums">{yen(m.売上_実績)}</span>
              </div>
              <div className="flex justify-between py-1 text-stone-600">
                <span>売上原価(原材料・資材仕入)</span>
                <span className="tabular-nums">▲{yen(m.原材料仕入_実績)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-t border-stone-300 font-semibold">
                <span>売上総利益</span>
                <span className="tabular-nums">{yen(売上総利益)}</span>
              </div>
              <div className="flex justify-between py-1 text-stone-600">
                <span>販売費及び一般管理費</span>
                <span className="tabular-nums">▲{yen(m.その他経費_実績)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-t border-stone-300 font-semibold text-base">
                <span>営業利益</span>
                <span className={`tabular-nums ${m.営業利益_財務 >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {yen(m.営業利益_財務)}
                </span>
              </div>
            </div>

            {/* 参考: 原価差異 */}
            <div className="mt-3 flex items-center gap-1 text-xs text-stone-500 bg-stone-50 rounded px-2 py-1.5">
              <Info size={11} className="shrink-0" />
              <span>
                (参考)原価差異(原材料仕入実績 − 標準原価) ={" "}
                <span className={`font-medium ${m.原価差異 >= 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {m.原価差異 >= 0 ? "+" : ""}
                  {yen(m.原価差異)}
                </span>
              </span>
            </div>

          </div>
        );
      })}

      {monthlyRows.length > 0 && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyRows.map((m) => ({ name: m.yearMonth, サマリ: m.営業利益_管理, PL: m.営業利益_財務 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => yen(v)} />
              <Legend />
              <Bar dataKey="サマリ" fill="#b45309" radius={[3, 3, 0, 0]} />
              <Bar dataKey="PL" fill="#57534e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
