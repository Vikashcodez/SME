import { cx } from "../../utils/format";

export function ProgressBar({ value = 0, max = 100, colorClassName = "bg-emerald-500", trackClassName = "bg-slate-100", height = "h-1.5", className }) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));
  return (
    <div className={cx("w-full rounded-full overflow-hidden", height, trackClassName, className)}>
      <div className={cx("h-full rounded-full transition-all duration-500", colorClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function LabeledProgressRow({ label, value, max, colorClassName, valueLabel }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-700 tabular-nums">{valueLabel !== undefined ? valueLabel : value}</span>
      </div>
      <ProgressBar value={value} max={max} colorClassName={colorClassName} />
    </div>
  );
}
