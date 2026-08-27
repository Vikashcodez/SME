import { cx } from "../../utils/format";

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  className,
  disabled,
  ...props
}) {
  const base = "inline-flex items-center justify-center font-semibold rounded-xl transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-[#0D9488] hover:bg-[#0F766E] text-white shadow-xs active:bg-[#115E59]",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200 shadow-xs hover:text-slate-900",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs active:bg-rose-800",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:bg-emerald-800",
  };

  const sizes = {
    xs: "px-2 py-1 text-xs gap-1",
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-3.5 py-2 text-sm gap-2",
    lg: "px-4 py-2.5 text-base gap-2.5",
  };

  return (
    <button
      className={cx(base, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon className={cx(size === "xs" ? "h-3 w-3" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />}
      {children}
      {IconRight && <IconRight className={cx(size === "xs" ? "h-3 w-3" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />}
    </button>
  );
}

export function IconButton({ icon: Icon, label, variant = "secondary", size = "md", className, ...props }) {
  const sizes = {
    sm: "p-1.5 rounded-lg",
    md: "p-2 rounded-xl",
    lg: "p-2.5 rounded-xl",
  };

  const variants = {
    primary: "bg-[#0D9488] hover:bg-[#0F766E] text-white shadow-xs",
    secondary: "bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 ring-1 ring-inset ring-slate-200 shadow-xs",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100",
  };

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cx("inline-flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:opacity-50", sizes[size], variants[variant], className)}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default Button;
