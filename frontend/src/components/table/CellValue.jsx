import { useNavigate } from "react-router-dom";
import { Check, X, ArrowUpRight } from "lucide-react";
import { fmtMoney2, fmtNum, fmtDate, fmtDateTime } from "../../utils/format";
import { StatusBadge } from "../ui/Badge";
import { recordLink } from "../../utils/crossLink";

export function CellValue({ field, value, entities, seed }) {
  const navigate = useNavigate();
  if (value === null || value === undefined || value === "") return <span className="text-slate-400">—</span>;

  if (field.ui === "fk") {
    const targetEntity = entities ? entities[field.fkTarget] : null;
    const rows = (seed && field.fkTarget) ? seed[field.fkTarget] || [] : [];
    const row = targetEntity ? rows.find((r) => r[targetEntity.idFieldKey] === value) : null;
    const label = row && targetEntity ? row[targetEntity.labelFieldKey] : value;
    const href = recordLink(field.fkTarget, value);
    if (!href) return <span className="text-slate-800">{label}</span>;
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(href);
        }}
        className="inline-flex items-center gap-0.5 text-[#0D9488] hover:text-[#0F766E] font-semibold hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] rounded transition-colors"
        title={targetEntity ? `Open ${targetEntity.name}` : undefined}
      >
        {label}
        <ArrowUpRight className="h-3 w-3 opacity-70" />
      </button>
    );
  }

  if (field.ui === "select" || field.key === "status") return <StatusBadge value={value} />;
  if (field.ui === "currency") return <span className="font-mono font-bold text-slate-900 tabular-nums">{fmtMoney2(value)}</span>;
  if (field.ui === "percent") return <span className="font-mono tabular-nums text-slate-800 font-medium">{value}%</span>;
  if (field.ui === "decimal" || field.ui === "integer") return <span className="font-mono tabular-nums text-slate-800 font-medium">{fmtNum(value)}</span>;
  if (field.ui === "date") return <span className="text-slate-600">{fmtDate(value)}</span>;
  if (field.ui === "datetime") return <span className="text-slate-600">{fmtDateTime(value)}</span>;
  if (field.ui === "boolean")
    return value ? (
      <span className="inline-flex h-5 w-5 rounded-full bg-emerald-50 border border-emerald-200 items-center justify-center">
        <Check className="h-3 w-3 text-emerald-600" strokeWidth={3} />
      </span>
    ) : (
      <span className="inline-flex h-5 w-5 rounded-full bg-slate-100 border border-slate-200 items-center justify-center">
        <X className="h-3 w-3 text-slate-400" strokeWidth={3} />
      </span>
    );
  if (field.ui === "id") return <span className="font-mono text-xs text-[#0F766E] font-medium">{value}</span>;
  return (
    <span style={{ maxWidth: 240 }} className="text-slate-800 truncate block">
      {String(value)}
    </span>
  );
}

export default CellValue;
