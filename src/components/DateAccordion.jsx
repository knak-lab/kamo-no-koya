import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

// 年→月→日の3階層アコーディオン。デフォルトは全て閉じた状態。
// items: 日付を持つ任意のオブジェクト配列。getDate(item)で"YYYY-MM-DD"を取り出す。
// renderDay(dayItems, date): 日を開いたときに表示する中身を返す render prop。
export default function DateAccordion({ items, getDate, renderDay, sortDesc = true, emptyText = "データがありません" }) {
  const tree = {};
  items.forEach((item) => {
    const date = getDate(item);
    if (!date) return;
    const [y, m] = date.split("-");
    tree[y] = tree[y] || {};
    tree[y][m] = tree[y][m] || {};
    tree[y][m][date] = tree[y][m][date] || [];
    tree[y][m][date].push(item);
  });

  // 直近(最新)の年・月はクリックせずに見える状態で初期表示する(表示順の設定=sortDescに関わらず、常に最新)
  const latestYear = Object.keys(tree).sort().at(-1);
  const latestMonth = latestYear ? Object.keys(tree[latestYear]).sort().at(-1) : null;

  const [openYears, setOpenYears] = useState(() => (latestYear ? { [latestYear]: true } : {}));
  const [openMonths, setOpenMonths] = useState(() =>
    latestYear && latestMonth ? { [`${latestYear}-${latestMonth}`]: true } : {}
  );
  const [openDays, setOpenDays] = useState({});
  const toggleYear = (y) => setOpenYears((prev) => ({ ...prev, [y]: !prev[y] }));
  const toggleMonth = (key) => setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleDay = (date) => setOpenDays((prev) => ({ ...prev, [date]: !prev[date] }));

  const sortKeys = (keys) => keys.sort((a, b) => (sortDesc ? b.localeCompare(a) : a.localeCompare(b)));
  const years = sortKeys(Object.keys(tree));

  if (years.length === 0) return <p className="text-xs text-stone-400">{emptyText}</p>;

  return (
    <div className="text-xs space-y-1">
      {years.map((year) => {
        const months = tree[year];
        const yearCount = Object.values(months).reduce(
          (a, days) => a + Object.values(days).reduce((a2, arr) => a2 + arr.length, 0),
          0
        );
        return (
          <div key={year} className="border border-stone-200/80 rounded-xl">
            <button
              onClick={() => toggleYear(year)}
              className="w-full flex items-center gap-1 px-2 py-1.5 text-left font-medium hover:bg-stone-50"
            >
              {openYears[year] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {year}年({yearCount}件)
            </button>
            {openYears[year] && (
              <div className="pl-4 pb-1 space-y-1">
                {sortKeys(Object.keys(months)).map((month) => {
                  const days = months[month];
                  const monthKey = `${year}-${month}`;
                  const monthCount = Object.values(days).reduce((a, arr) => a + arr.length, 0);
                  return (
                    <div key={monthKey}>
                      <button
                        onClick={() => toggleMonth(monthKey)}
                        className="w-full flex items-center gap-1 px-2 py-1 text-left hover:bg-stone-50"
                      >
                        {openMonths[monthKey] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        {month}月({monthCount}件)
                      </button>
                      {openMonths[monthKey] && (
                        <div className="pl-4 space-y-0.5">
                          {sortKeys(Object.keys(days)).map((date) => (
                            <div key={date} className="border-b border-stone-100">
                              <button
                                onClick={() => toggleDay(date)}
                                className="w-full flex items-center gap-1 px-2 py-1 text-left hover:bg-stone-50"
                              >
                                {openDays[date] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                <span className="font-medium">{date}</span>
                                <span className="text-stone-400">({days[date].length}件)</span>
                              </button>
                              {openDays[date] && <div className="pl-2 pb-2">{renderDay(days[date], date)}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
