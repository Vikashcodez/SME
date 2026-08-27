import { AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";
import { cx } from "../../utils/format";

const VARIANTS = {
  warning: { wrap: "bg-amber-50 ring-amber-200", icon: "text-amber-600", text: "text-amber-900", Icon: AlertTriangle },
  info: { wrap: "bg-sky-50 ring-sky-200", icon: "text-sky-600", text: "text-sky-900", Icon: Info },
  success: { wrap: "bg-emerald-50 ring-emerald-200", icon: "text-emerald-600", text: "text-emerald-900", Icon: CheckCircle2 },
  error: { wrap: "bg-rose-50 ring-rose-200", icon: "text-rose-600", text: "text-rose-900", Icon: XCircle },
};

export function Alert({ variant = "warning", children, action }) {
  const v = VARIANTS[variant];
  const { Icon } = v;
  return (
    <div className={cx("flex items-center gap-3 rounded-2xl px-4 py-3 ring-1", v.wrap)}>
      <Icon className={cx("h-5 w-5 flex-shrink-0", v.icon)} strokeWidth={2} />
      <p className={cx("text-sm flex-1 leading-snug", v.text)}>{children}</p>
      {action}
    </div>
  );
}
