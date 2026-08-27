import { cx } from "../../utils/format";
import { STATUS_COLORS, STATUS_DOT_COLORS, statusTone } from "../../utils/status";

export function StatusBadge({ value }) {
  if (value === null || value === undefined || value === "") return <span className="text-slate-400">—</span>;
  const tone = statusTone(value);
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap", STATUS_COLORS[tone])}>
      <span className={cx("h-1.5 w-1.5 rounded-full flex-shrink-0", STATUS_DOT_COLORS[tone])} />
      {value}
    </span>
  );
}

export function Badge({ children, tone = "neutral", icon: Icon, className }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap", STATUS_COLORS[tone], className)}>
      {Icon && <Icon className="h-3 w-3" strokeWidth={2.5} />}
      {children}
    </span>
  );
}

export function DotBadge({ children, tone = "neutral", className }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap", className)}>
      <span className={cx("h-1.5 w-1.5 rounded-full flex-shrink-0", STATUS_DOT_COLORS[tone])} />
      {children}
    </span>
  );
}
