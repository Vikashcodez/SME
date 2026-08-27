import { cx } from "../../utils/format";

export function PageHeader({ icon, title, subtitle, meta, accent, actions, className }) {
  const Icon = icon;
  return (
    <div className={cx("bg-white rounded-2xl border border-slate-200 shadow-card p-5 sm:p-6 text-slate-900", className)}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {icon && (
            <div className="h-11 w-11 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
          )}
          <div className="min-w-0 pt-0.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-[#0D9488] font-bold uppercase tracking-[0.1em] mt-1 leading-snug">{subtitle}</p>}
            {meta && <p className="text-xs text-slate-500 mt-1.5 font-medium">{meta}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:justify-end">{actions}</div>}
      </div>
    </div>
  );
}

export function ReportHeader({ eyebrow, title, subtitle, accent, controls, className }) {
  return (
    <div className={cx("bg-white rounded-2xl border border-slate-200 shadow-card p-5 sm:p-6 text-slate-900", className)}>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0D9488] mb-1.5">{eyebrow}</p>}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-[#0D9488] font-medium uppercase tracking-[0.1em] mt-1">{subtitle}</p>}
        </div>
        {controls && <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">{controls}</div>}
      </div>
    </div>
  );
}

export default PageHeader;
