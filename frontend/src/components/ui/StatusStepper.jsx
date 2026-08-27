import { Check, X } from "lucide-react";
import { cx } from "../../utils/format";
import { statusTone, getWorkflowTargets } from "../../utils/status";

export function StatusStepper({ options, statusField, currentStatus }) {
  const opts = options || statusField?.options;
  if (!opts || opts.length < 2) return null;
  const targets = getWorkflowTargets(opts);
  const isRejected = currentStatus === targets.rejected;

  const steps = [targets.draft, targets.submitted, targets.approved].filter(Boolean);
  if (steps.length < 2) return null;

  const currentIdx = steps.indexOf(currentStatus);

  return (
    <div className="flex items-center w-full">
      {steps.map((label, i) => {
        const done = !isRejected && currentIdx >= 0 && i < currentIdx;
        const active = !isRejected && i === currentIdx;
        const failed = isRejected && i === steps.length - 1;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 min-w-[64px]">
              <div
                className={cx(
                  "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ring-4 transition-all",
                  done && "bg-emerald-600 text-white ring-emerald-50",
                  active && !failed && "bg-[#0D9488] text-white ring-teal-50",
                  !done && !active && "bg-slate-100 text-slate-400 ring-white",
                  isRejected && i === currentIdx && "bg-rose-600 text-white ring-rose-50"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : isRejected && i === currentIdx ? <X className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cx("text-[11px] font-medium text-center leading-tight", active || done ? "text-slate-900 font-bold" : "text-slate-500")}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cx("h-0.5 flex-1 mx-1 rounded-full", done ? "bg-emerald-500" : "bg-slate-200")} />
            )}
          </div>
        );
      })}
      {isRejected && (
        <span className={cx("ml-3 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200")}>
          <X className="h-3 w-3" /> {currentStatus}
        </span>
      )}
    </div>
  );
}

export default StatusStepper;
