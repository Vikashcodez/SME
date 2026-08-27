import { cx } from "../../utils/format";
import { TrendingUp, TrendingDown } from "lucide-react";

export function StatCard({ label, value, caption, trend, trendValue, icon, accent, className }) {
  const Icon = icon;
  return (
    <div className={cx("bg-white rounded-2xl border border-slate-200 shadow-card p-5 flex flex-col justify-between gap-3 text-slate-900", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        {icon && (
          <div className="h-8 w-8 rounded-lg bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold tracking-tight text-slate-900 font-mono">{value}</p>
        {(caption || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span className={cx("inline-flex items-center gap-0.5 text-xs font-bold font-mono", trend === "up" ? "text-emerald-700" : trend === "down" ? "text-rose-700" : "text-slate-600")}>
                {trend === "up" && <TrendingUp className="h-3.5 w-3.5" />}
                {trend === "down" && <TrendingDown className="h-3.5 w-3.5" />}
                {trendValue}
              </span>
            )}
            {caption && <span className="text-xs text-slate-500">{caption}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;
