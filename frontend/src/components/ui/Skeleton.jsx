import { cx } from "../../utils/format";

export function Skeleton({ className }) {
  return (
    <div
      className={cx(
        "bg-slate-200/80 rounded animate-pulse",
        className
      )}
    />
  );
}

export function TableSkeleton({ columns = 5, rows = 6 }) {
  return (
    <div className="w-full space-y-3 p-4">
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center justify-between gap-4 py-3 border-b border-slate-50">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={cx("h-4", c === 0 ? "w-32" : "w-20")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}

export default Skeleton;
