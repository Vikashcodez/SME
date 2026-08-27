import { useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { getReverseFkIndex, recordLink } from "../utils/crossLink";

export function RelatedRecords({ entityKey, record, entities }) {
  const { data } = useAppData();
  const navigate = useNavigate();
  const entity = entities[entityKey];
  const reverseIndex = getReverseFkIndex();
  const referencers = reverseIndex[entityKey] || [];

  const groups = referencers
    .map(({ entityKey: fromKey, fieldKey }) => {
      const fromEntity = entities[fromKey];
      if (!fromEntity || fromEntity.isLineItemOf) return null;
      const rows = (data[fromKey] || []).filter((r) => r[fieldKey] === record[entity.idFieldKey]);
      if (rows.length === 0) return null;
      return { fromEntity, fromKey, rows };
    })
    .filter(Boolean);

  if (groups.length === 0) return null;

  return (
    <div className="border border-slate-200/70 rounded-2xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 flex items-center gap-1.5">
        <Link2 className="h-3.5 w-3.5" /> Related Records
      </div>
      <div className="divide-y divide-slate-100">
        {groups.map(({ fromEntity, fromKey, rows }) => (
          <div key={fromKey} className="px-4 py-3">
            <p className="text-xs font-medium text-slate-400 mb-1.5">
              {fromEntity.name} <span className="text-slate-300">({rows.length})</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {rows.slice(0, 8).map((r) => (
                <button
                  key={r.__rowId}
                  onClick={() => navigate(recordLink(fromKey, r[fromEntity.idFieldKey]))}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-xs font-medium px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {r[fromEntity.labelFieldKey] || r[fromEntity.idFieldKey]}
                </button>
              ))}
              {rows.length > 8 && <span className="text-xs text-slate-400 self-center">+{rows.length - 8} more</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
