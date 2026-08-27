import { ArrowRight } from "lucide-react";
import { cx, fmtNum } from "../../utils/format";
import { statusTone, getWorkflowTargets } from "../../utils/status";

const TONE_BAR = {
  positive: "bg-emerald-500",
  warning: "bg-amber-500",
  negative: "bg-rose-500",
  neutral: "bg-slate-300",
  info: "bg-sky-500",
};
const TONE_TEXT = {
  positive: "text-emerald-700",
  warning: "text-amber-700",
  negative: "text-rose-700",
  neutral: "text-slate-500",
  info: "text-sky-700",
};

export function StatusPipeline({ statusField, rows, accent }) {
  if (!statusField || !statusField.options || !statusField.options.length) return null;
  const targets = getWorkflowTargets(statusField.options);
  const stages = [
    { key: "draft", label: targets.draft },
    { key: "submitted", label: targets.submitted },
    { key: "approved", label: targets.approved },
  ].filter((s) => s.label);

  if (stages.length < 2) return null;

  const total = rows.length || 1;
  const counts = stages.map((s) => rows.filter((r) => r.status === s.label).length);
  const rejectedLabel = targets.rejected;
  const rejectedCount = rejectedLabel ? rows.filter((r) => r.status === rejectedLabel).length : 0;

  return (
    <div className={cx("rounded-2xl border p-4 sm:p-5 bg-white shadow-card", accent?.border || "border-slate-200/70")}>
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Workflow Pipeline</span>
        {rejectedLabel && rejectedCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> {fmtNum(rejectedCount)} {rejectedLabel}
          </span>
        )}
      </div>
      <div className="flex items-stretch gap-1.5 sm:gap-2">
        {stages.map((s, i) => {
          const tone = statusTone(s.label);
          const pct = Math.round((counts[i] / total) * 100);
          return (
            <div key={s.key} className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <span className="text-xs font-medium text-slate-500 truncate">{s.label}</span>
                  <span className={cx("text-sm font-bold tabular-nums", TONE_TEXT[tone])}>{fmtNum(counts[i])}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={cx("h-full rounded-full transition-all", TONE_BAR[tone])} style={{ width: `${Math.max(pct, counts[i] > 0 ? 4 : 0)}%` }} />
                </div>
              </div>
              {i < stages.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-300 flex-shrink-0 hidden sm:block" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
