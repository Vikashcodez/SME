import { Link } from "react-router-dom";
import { shortModuleName } from "../../utils/moduleAccents";
import { cx } from "../../utils/format";

export function Breadcrumb({ moduleName, screenTitle, screenCode, extra }) {
  return (
    <div className="min-w-0">
      {moduleName && moduleName !== "Global" && (
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0D9488] mb-0.5 truncate">
          {shortModuleName(moduleName)}
        </p>
      )}
      <div className="flex items-center gap-2 min-w-0">
        {extra ? (
          <Link
            to={`/app/screen/${screenCode}`}
            className="text-[17px] font-bold text-slate-900 hover:text-[#0D9488] truncate transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] rounded leading-tight"
          >
            {screenTitle}
          </Link>
        ) : (
          <h1 className="text-[17px] font-bold text-slate-900 truncate leading-tight">{screenTitle}</h1>
        )}
        {extra && (
          <span className={cx("text-[11px] font-mono font-bold text-[#0F766E] bg-teal-50 ring-1 ring-inset ring-teal-200 rounded-md px-2 py-0.5 flex-shrink-0 truncate max-w-[180px]")}>
            {extra}
          </span>
        )}
      </div>
    </div>
  );
}

export default Breadcrumb;
