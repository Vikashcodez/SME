import { cx } from "../../utils/format";

const GRADIENTS = {
  blue: "from-blue-500 to-blue-600",
  purple: "from-violet-500 to-purple-600",
  emerald: "from-emerald-500 to-teal-600",
  amber: "from-amber-500 to-orange-600",
  rose: "from-rose-500 to-pink-600",
  indigo: "from-indigo-500 to-blue-600",
};

export function GradientStatCard({ icon: Icon, label, value, tone = "blue", className }) {
  return (
    <div className={cx("rounded-2xl p-5 flex items-center justify-between text-white shadow-card bg-gradient-to-br", GRADIENTS[tone] || GRADIENTS.blue, className)}>
      <div className="min-w-0">
        <p className="text-xs font-medium text-white/80 truncate">{label}</p>
        <p className="text-2xl font-bold mt-1.5 tabular-nums truncate">{value}</p>
      </div>
      {Icon && (
        <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 ml-3">
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
      )}
    </div>
  );
}
