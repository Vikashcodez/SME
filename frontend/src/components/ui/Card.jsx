import { cx } from "../../utils/format";

export function Card({ children, className, padded = false }) {
  return (
    <div className={cx("bg-white rounded-2xl border border-slate-200 shadow-card text-slate-900", padded && "p-5", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }) {
  return <div className={cx("px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 text-slate-900", className)}>{children}</div>;
}

export function CardEyebrow({ children, className }) {
  return (
    <p className={cx("text-[11px] font-bold uppercase tracking-[0.14em] text-[#0D9488]", className)}>{children}</p>
  );
}

export default Card;
