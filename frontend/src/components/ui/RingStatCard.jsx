import { cx } from "../../utils/format";
import { IconBadge } from "./IconBadge";
import { ProgressRing } from "./ProgressRing";

export function RingStatCard({ icon, label, value, max, accent, caption, topBorder = false, ringColorOverride }) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.round((value / safeMax) * 100);
  const ringColor = ringColorOverride || accent?.barFill || "#10B981";
  return (
    <div className={cx("bg-white rounded-2xl border border-slate-200/70 shadow-card p-5 relative overflow-hidden", topBorder && "pt-6")}>
      {topBorder && <div className={cx("absolute top-0 left-0 right-0 h-1", accent?.solidBg || "bg-emerald-500")} />}
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <IconBadge icon={icon} accent={accent} size="sm" variant="soft" />
      </div>
      <div className="flex items-center gap-4">
        <ProgressRing value={value} max={max} size={64} strokeWidth={6} color={ringColor} />
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">
            {value}
            <span className="text-sm font-medium text-slate-400">/{max}</span>
          </p>
          <p className="text-sm font-semibold mt-1.5 tabular-nums" style={{ color: ringColor }}>{pct}%</p>
        </div>
      </div>
      {caption && <p className="text-xs text-slate-400 mt-3">{caption}</p>}
    </div>
  );
}

export function SimpleRingCard({ icon, label, value, displayValue, accent, caption, topBorderColor }) {
  const ringColor = accent?.barFill || "#10B981";
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-5 relative overflow-hidden">
      {topBorderColor && <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: topBorderColor }} />}
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {icon && <IconBadge icon={icon} accent={accent} size="sm" variant="soft" />}
      </div>
      <div className="flex items-center gap-4">
        <ProgressRing value={value} max={100} size={64} strokeWidth={6} color={ringColor} />
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{displayValue !== undefined ? displayValue : value}</p>
        </div>
      </div>
      {caption && <p className="text-xs text-slate-400 mt-3">{caption}</p>}
    </div>
  );
}
