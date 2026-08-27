import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Eye, Pencil, Trash2, Copy, ChevronRight } from "lucide-react";
import { cx, fmtMoney2, fmtDate } from "../../utils/format";
import { EmptyState } from "../ui/EmptyState";
import { StatusBadge } from "../ui/Badge";
import { IconButton } from "../ui/Button";
import { CellValue } from "./CellValue";
import { RowActionsMenu } from "./RowActionsMenu";
import { useUIPreferences } from "../../context/UIPreferencesContext";
import { avatarPalette, initialsFor, pickHeroField, pickSecondaryFields } from "../../utils/listDisplay";

export function pickDisplayColumns(entity) {
  const cols = [];
  const seen = new Set();
  const add = (f) => {
    if (f && !seen.has(f.key)) {
      seen.add(f.key);
      cols.push(f);
    }
  };

  const byKey = {};
  entity.fields.forEach((f) => (byKey[f.key] = f));
  add(byKey[entity.idFieldKey]);
  if (entity.labelFieldKey !== entity.idFieldKey) add(byKey[entity.labelFieldKey]);

  const statusField = entity.fields.find((f) => f.key === "status");
  const scored = entity.fields
    .filter((f) => !seen.has(f.key) && f.role !== "hidden_audit" && f.role !== "readonly_audit" && f.role !== "approval" && f.key !== "isActive")
    .map((f) => {
      let score = 0;
      if (f.ui === "fk") score += 5;
      if (f.ui === "date") score += 4;
      if (f.ui === "currency") score += 4;
      if (f.ui === "select") score += 3;
      if (f.ui === "text" || f.ui === "email" || f.ui === "phone") score += 2;
      if (f.ui === "decimal" || f.ui === "integer" || f.ui === "percent") score += 2;
      if (f.ui === "boolean") score += 1;
      if (f.ui === "textarea") score -= 3;
      return { f, score };
    })
    .sort((a, b) => b.score - a.score);

  scored.forEach(({ f }) => {
    if (cols.length < 6) add(f);
  });
  if (statusField && !seen.has("status") && cols.length < 7) add(statusField);
  else if (statusField && cols.length >= 6) {
    cols.splice(6, cols.length - 6);
    add(statusField);
  }
  return cols.slice(0, 7);
}

function useSortedRows(rows, sortKey, sortDir) {
  return useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const res = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? res : -res;
    });
    return copy;
  }, [rows, sortKey, sortDir]);
}

function RowActions({ row, onView, onEdit, onDelete, onDuplicate, quickActions }) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <IconButton icon={Eye} label="View details" size="sm" onClick={() => onView(row)} />
      <IconButton icon={Pencil} label="Edit record" size="sm" onClick={() => onEdit(row)} />
      <RowActionsMenu row={row} onDuplicate={() => onDuplicate && onDuplicate(row)} onDelete={() => onDelete(row)} quickActions={quickActions} />
    </div>
  );
}

function ListView({ entity, rows, onView, onEdit, onDelete, onDuplicate, quickActions }) {
  const heroField = pickHeroField(entity);
  const secondaryFields = pickSecondaryFields(entity);
  const statusField = entity.fields.find((f) => f.key === "status");

  return (
    <div className="divide-y divide-slate-100">
      {rows.map((row) => {
        const label = row[entity.labelFieldKey] || row[entity.idFieldKey];
        const heroValue = heroField ? row[heroField.key] : null;

        return (
          <div
            key={row.__rowId}
            onClick={() => onView(row)}
            className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50/80 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                {initialsFor(label)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 group-hover:text-[#0D9488] transition-colors truncate">
                  {label || "—"}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="font-mono text-[11px] text-[#0F766E] font-medium">{row[entity.idFieldKey]}</span>
                  {secondaryFields.map((sf) => (
                    <span key={sf.key} className="hidden sm:inline truncate max-w-[140px]">
                      · <CellValue field={sf} value={row[sf.key]} />
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {statusField && row.status && <StatusBadge value={row.status} />}
              {heroValue !== null && heroValue !== undefined && heroValue !== "" && (
                <div className="text-right hidden md:block">
                  <span className="text-sm font-bold font-mono text-slate-900">{fmtMoney2(heroValue)}</span>
                </div>
              )}
              <RowActions row={row} onView={onView} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} quickActions={quickActions} />
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#0D9488] flex-shrink-0 hidden sm:block transition-colors" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TableView({ entity, rows, entities, seed, onView, onEdit, onDelete, onDuplicate, quickActions, sortKey, sortDir, onToggleSort, accent }) {
  const { density } = useUIPreferences();
  const columns = useMemo(() => pickDisplayColumns(entity), [entity]);
  const cellPad = density === "compact" ? "px-3.5 py-2" : "px-3.5 py-3";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur">
          <tr className="border-b border-slate-200">
            {columns.map((c, idx) => (
              <th
                key={c.key}
                onClick={() => onToggleSort(c.key)}
                className={cx(cellPad, "text-left font-semibold text-xs uppercase tracking-wider cursor-pointer select-none whitespace-nowrap text-slate-600 hover:text-[#0D9488] transition-colors", idx === 0 && "pl-4 sm:pl-5")}
              >
                <span className="inline-flex items-center gap-1.5">
                  {c.name}
                  {sortKey === c.key ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-[#0D9488]" /> : <ArrowDown className="h-3.5 w-3.5 text-[#0D9488]" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                </span>
              </th>
            ))}
            <th className={cx(cellPad, "text-right text-xs font-semibold uppercase tracking-wider pr-4 sm:pr-5 text-slate-600")}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.__rowId} onClick={() => onView(row)} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
              {columns.map((c, idx) => {
                const isLabelCol = c.key === entity.labelFieldKey && entity.labelFieldKey !== entity.idFieldKey;
                if (isLabelCol) {
                  const label = row[c.key];
                  const secondary = entity.fields.find((f) => f.key !== entity.idFieldKey && f.key !== entity.labelFieldKey && f.ui === "fk");
                  return (
                    <td key={c.key} className={cx(cellPad, "whitespace-nowrap pl-4 sm:pl-5")}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {initialsFor(label)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 group-hover:text-[#0D9488] transition-colors truncate max-w-[220px]">{label || "—"}</p>
                          {secondary && row[secondary.key] ? (
                            <p className="text-xs text-slate-500 truncate max-w-[220px]">
                              <CellValue field={secondary} value={row[secondary.key]} entities={entities} seed={seed} />
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  );
                }
                return (
                  <td key={c.key} className={cx(cellPad, "whitespace-nowrap text-slate-800")}>
                    <CellValue field={c} value={row[c.key]} entities={entities} seed={seed} />
                  </td>
                );
              })}
              <td className={cx(cellPad, "pr-4 sm:pr-5")}>
                <RowActions row={row} onView={onView} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} quickActions={quickActions} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DataTable({ entity, rows, entities, seed, onView, onEdit, onDelete, onDuplicate, quickActions, accent }) {
  const [sortKey, setSortKey] = useState(entity.idFieldKey);
  const [sortDir, setSortDir] = useState("desc");
  const { viewMode } = useUIPreferences();
  const sorted = useSortedRows(rows, sortKey, sortDir);
  const onToggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  if (rows.length === 0) {
    return <EmptyState title={`No ${entity.name} records found`} message="Try adjusting your search or filters, or create a new record to get started." />;
  }

  if (viewMode === "table") {
    return <TableView entity={entity} rows={sorted} entities={entities} seed={seed} onView={onView} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} quickActions={quickActions} sortKey={sortKey} sortDir={sortDir} onToggleSort={onToggleSort} accent={accent} />;
  }
  return <ListView entity={entity} rows={sorted} onView={onView} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} quickActions={quickActions} />;
}

export default DataTable;
