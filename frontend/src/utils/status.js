export const STATUS_COLORS = {
  positive: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20 border border-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20 border border-amber-200",
  negative: "bg-rose-50 text-rose-800 ring-1 ring-rose-600/20 border border-rose-200",
  neutral: "bg-slate-100 text-slate-700 ring-1 ring-slate-300 border border-slate-200",
  info: "bg-teal-50 text-teal-800 ring-1 ring-teal-600/20 border border-teal-200",
};

export const STATUS_DOT_COLORS = {
  positive: "bg-emerald-600",
  warning: "bg-amber-600",
  negative: "bg-rose-600",
  neutral: "bg-slate-500",
  info: "bg-teal-600",
};

const POSITIVE_WORDS = ["active", "approved", "completed", "delivered", "paid", "closed", "confirmed", "released", "cleared", "reconciled", "filed", "compliant", "verified", "success", "accepted", "passed", "pass", "available", "in stock", "resolved", "current", "on time"];
const WARNING_WORDS = ["draft", "pending", "scheduled", "open", "in progress", "assigned", "initiated", "issued", "partially", "under", "renewal due", "conditional", "on leave", "overdue soon", "low stock"];
const NEGATIVE_WORDS = ["rejected", "cancelled", "canceled", "expired", "suspended", "blacklisted", "terminated", "overdue", "fail", "failed", "breakdown", "non-compliant", "frozen", "written off", "discontinued", "out of stock", "stopped"];

export function statusTone(value) {
  const v = String(value || "").toLowerCase();
  if (NEGATIVE_WORDS.some((w) => v.includes(w))) return "negative";
  if (WARNING_WORDS.some((w) => v.includes(w))) return "warning";
  if (POSITIVE_WORDS.some((w) => v.includes(w))) return "positive";
  return "neutral";
}

export function getWorkflowTargets(options) {
  const find = (kws) => options.find((o) => kws.some((k) => o.toLowerCase().includes(k)));
  return {
    draft: find(["draft"]),
    submitted: find(["pending approval", "pending", "submitted", "awaiting", "under review"]),
    approved: find(["approved", "accepted", "confirmed", "completed", "cleared", "released", "verified", "compliant", "passed"]) || options.find((o) => o.toLowerCase() === "active"),
    rejected: find(["rejected", "declined", "cancelled", "canceled", "failed"]),
  };
}
