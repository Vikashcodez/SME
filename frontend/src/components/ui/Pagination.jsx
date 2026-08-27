import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { IconButton } from "./Button";

const DEFAULT_SIZES = [10, 25, 50, 100];

export function Pagination({ page, pageCount, onPage, total, pageSize, onPageSizeChange, pageSizeOptions = DEFAULT_SIZES, itemLabel = "entries" }) {
  const safePageCount = Math.max(pageCount, 1);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-t border-slate-100 bg-white rounded-b-2xl">
      <p className="text-xs text-slate-500">
        Showing <span className="font-medium text-slate-700 tabular-nums">{start}</span>
        {"\u2013"}
        <span className="font-medium text-slate-700 tabular-nums">{end}</span> of{" "}
        <span className="font-medium text-slate-700 tabular-nums">{total}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-4">
        {safePageCount > 1 && (
          <div className="flex items-center gap-0.5">
            <IconButton icon={ChevronsLeft} label="First" onClick={() => onPage(1)} className={page === 1 ? "opacity-30 pointer-events-none" : ""} />
            <IconButton icon={ChevronLeft} label="Previous" onClick={() => onPage(Math.max(1, page - 1))} className={page === 1 ? "opacity-30 pointer-events-none" : ""} />
            <span className="text-xs text-slate-600 px-2 font-medium tabular-nums">{page} / {safePageCount}</span>
            <IconButton icon={ChevronRight} label="Next" onClick={() => onPage(Math.min(safePageCount, page + 1))} className={page === safePageCount ? "opacity-30 pointer-events-none" : ""} />
            <IconButton icon={ChevronsRight} label="Last" onClick={() => onPage(safePageCount)} className={page === safePageCount ? "opacity-30 pointer-events-none" : ""} />
          </div>
        )}
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Show:
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border-0 ring-1 ring-inset ring-slate-200 bg-white pl-2 pr-6 py-1 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
