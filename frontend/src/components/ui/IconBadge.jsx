import { cx } from "../../utils/format";

const SIZES = {
  sm: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4" },
  md: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5" },
  lg: { box: "h-12 w-12 rounded-xl", icon: "h-6 w-6" },
  xl: { box: "h-14 w-14 rounded-2xl", icon: "h-7 w-7" },
};

export function IconBadge({ icon: Icon, accent, size = "md", variant = "solid", className }) {
  const s = SIZES[size] || SIZES.md;
  const softBg = accent?.softBg || "bg-emerald-50";
  const softText = accent?.softText || "text-emerald-600";
  const solidBg = accent?.solidBg || "bg-emerald-500";
  const gradient = accent?.gradient || "from-emerald-400 to-emerald-600";

  if (variant === "gradient") {
    return (
      <div className={cx(s.box, `bg-gradient-to-br ${gradient}`, "flex items-center justify-center flex-shrink-0 text-white shadow-sm", className)}>
        <Icon className={s.icon} strokeWidth={2.25} />
      </div>
    );
  }
  if (variant === "solid") {
    return (
      <div className={cx(s.box, solidBg, "flex items-center justify-center flex-shrink-0 text-white shadow-sm", className)}>
        <Icon className={s.icon} strokeWidth={2.25} />
      </div>
    );
  }
  return (
    <div className={cx(s.box, softBg, softText, "flex items-center justify-center flex-shrink-0", className)}>
      <Icon className={s.icon} strokeWidth={2.25} />
    </div>
  );
}
