import { ChevronRight } from "lucide-react";
import { cx } from "../../utils/format";

export function ListRowPattern({
  icon: Icon,
  title,
  subtitle,
  meta,
  badge,
  action,
  active = false,
  onClick,
  className,
}) {
  return (
    <div
      onClick={onClick}
      className={cx(
        "group flex items-center justify-between p-4 sm:p-4.5 rounded-xl transition-all cursor-pointer select-none",
        active
          ? "bg-teal-50/80 text-[#0F766E] border-l-2 border-[#0D9488] shadow-xs"
          : "hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-transparent hover:border-slate-200/80",
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {Icon && (
          <div
            className={cx(
              "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs",
              active
                ? "bg-teal-100/70 text-[#0D9488]"
                : "bg-slate-100 text-slate-500 group-hover:bg-teal-50 group-hover:text-[#0D9488]"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className={cx(
                "text-sm font-bold truncate transition-colors",
                active ? "text-[#0F766E]" : "text-slate-900 group-hover:text-[#0D9488]"
              )}
            >
              {title}
            </h4>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 truncate font-medium">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {meta && <div className="text-right">{meta}</div>}
        {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
        <ChevronRight
          className={cx(
            "h-4 w-4 transition-transform group-hover:translate-x-0.5",
            active ? "text-[#0D9488]" : "text-slate-400 group-hover:text-[#0D9488]"
          )}
        />
      </div>
    </div>
  );
}

export default ListRowPattern;
