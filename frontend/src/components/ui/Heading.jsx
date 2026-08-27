import { cx } from "../../utils/format";

export function PageHeading({ children, subtitle, className }) {
  return (
    <div className={className}>
      <h1 className="text-xl font-bold text-slate-900 tracking-tight">{children}</h1>
      {subtitle && <p className="text-xs text-[#0D9488] font-bold uppercase tracking-wider mt-0.5">{subtitle}</p>}
    </div>
  );
}

export function SectionHeading({ children, className, icon: Icon }) {
  return (
    <h3 className={cx("text-sm font-bold text-slate-900 flex items-center gap-2", className)}>
      {Icon && <Icon className="h-4 w-4 text-[#0D9488]" strokeWidth={2} />}
      {children}
    </h3>
  );
}

export function FormSectionHeading({ children, subtitle, icon: Icon }) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && (
        <div className="h-8 w-8 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-200 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
      )}
      <div className="min-w-0 pt-0.5">
        <h4 className="text-sm font-bold text-slate-900">{children}</h4>
        {subtitle && <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Eyebrow({ children, className }) {
  return <p className={cx("text-[11px] font-bold uppercase tracking-[0.14em] text-[#0D9488]", className)}>{children}</p>;
}

export default PageHeading;
