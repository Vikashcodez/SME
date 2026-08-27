import { cx } from "../../utils/format";

export function FieldShell({ label, required, conditional, error, full, description, children }) {
  return (
    <div className={cx("flex flex-col gap-1.5", full ? "col-span-2" : "col-span-2 sm:col-span-1")}>
      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
        <span className="flex items-center gap-1">
          {label}
          {required && <span className="text-rose-600 font-bold ml-0.5">*</span>}
        </span>
        {conditional ? (
          <span className="text-[9px] text-[#0F766E] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-mono uppercase font-bold">
            Conditional
          </span>
        ) : !required ? (
          <span className="text-[10px] text-slate-400 font-mono font-normal normal-case">
            Optional
          </span>
        ) : null}
      </label>
      {children}
      {description && !error && <p className="text-[11px] text-slate-500 leading-relaxed">{description}</p>}
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
}

export default FieldShell;
