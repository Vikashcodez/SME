import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search, Plus, Download, Upload, CheckCircle2, XCircle, Pencil, Rows3, Rows2, LayoutList, Table2,
  ArrowRightLeft, AlertTriangle, RotateCcw, Boxes, ListTree, Info,
} from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useToast } from "./ui/Toast";
import { useUIPreferences } from "../context/UIPreferencesContext";
import { useBreadcrumbExtra } from "../context/BreadcrumbContext";
import { useRecordActions } from "../hooks/useRecordActions";
import { downloadCSV } from "../utils/csv";
import { cx, fmtNum, fmtMoney2 } from "../utils/format";
import { statusTone, getWorkflowTargets } from "../utils/status";
import { accentForModule, iconForModule } from "../utils/moduleAccents";
import { Card } from "./ui/Card";
import { Button, IconButton } from "./ui/Button";
import { Modal, ConfirmDialog } from "./ui/Modal";
import { Pagination } from "./ui/Pagination";
import { PageHeader } from "./ui/PageHeader";
import { StatCard } from "./ui/StatCard";
import { StatusPipeline } from "./ui/StatusPipeline";
import { EmptyState } from "./ui/EmptyState";
import { DataTable, pickDisplayColumns } from "./table/DataTable";
import { FilterPanel } from "./table/FilterPanel";
import { TableSkeleton, StatCardSkeleton } from "./ui/Skeleton";
import { RecordForm } from "./forms/RecordForm";
import { DetailView } from "./forms/DetailView";
import { RelatedRecords } from "./RelatedRecords";
import { UniversalImporterModal } from "./importer/UniversalImporterModal";
import { ScreenInfoModal } from "./ScreenInfoModal";
import { CONVERSION_RULES, runConversion } from "../utils/conversions";
import { recordLink } from "../utils/crossLink";

const savedViewsStore = {};

function describeEntity(entity) {
  const label = entity.name.toLowerCase();
  if (entity.kind === "master") return `Manage and maintain your ${label} records.`;
  if (entity.kind === "transaction") return `Track, process, and review ${label} activity.`;
  return `Browse and manage ${label} records.`;
}

function buildStatCards(entity, rows, statusField, accent) {
  const cards = [{
    key: "total",
    label: `Total ${entity.name}`,
    value: fmtNum(rows.length),
    caption: entity.kind === "master" ? "Records on file" : "All-time records",
    accent,
    statIcon: Boxes,
  }];

  const hasActiveFlag = entity.fields.some((f) => f.key === "isActive");
  const hasStatus = !!(statusField && statusField.options && statusField.options.length);

  if (hasActiveFlag) {
    const activeCount = rows.filter((r) => r.isActive !== false).length;
    cards.push({
      key: "active",
      label: "Active",
      value: fmtNum(activeCount),
      caption: `${fmtNum(rows.length - activeCount)} inactive`,
      accent: { softBg: "bg-emerald-50", softText: "text-emerald-600" },
      statIcon: CheckCircle2,
    });
  } else if (hasStatus) {
    const targets = getWorkflowTargets(statusField.options);
    const positive = targets.approved;
    if (positive) {
      const count = rows.filter((r) => r.status === positive).length;
      cards.push({
        key: "positive",
        label: positive,
        value: fmtNum(count),
        caption: rows.length ? `${Math.round((count / rows.length) * 100)}% of total` : "No records yet",
        accent: { softBg: "bg-emerald-50", softText: "text-emerald-600" },
        statIcon: CheckCircle2,
      });
    }
  }

  if (hasStatus) {
    const attentionCount = rows.filter((r) => {
      const t = statusTone(r.status);
      return t === "negative" || t === "warning";
    }).length;
    cards.push({
      key: "attention",
      label: "Needs Attention",
      value: fmtNum(attentionCount),
      caption: attentionCount > 0 ? "Review recommended" : "All clear",
      accent: attentionCount > 0 ? { softBg: "bg-amber-50", softText: "text-amber-600" } : { softBg: "bg-slate-100", softText: "text-slate-400" },
      statIcon: AlertTriangle,
    });
  } else if (entity.fields.some((f) => f.key === "createdAt")) {
    const now = new Date();
    const thisMonth = rows.filter((r) => {
      const d = new Date(r.createdAt);
      return !isNaN(d) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    cards.push({
      key: "recent",
      label: "Added This Month",
      value: fmtNum(thisMonth),
      caption: "Based on record creation date",
      accent: { softBg: "bg-sky-50", softText: "text-sky-600" },
      statIcon: ListTree,
    });
  }

  return cards;
}

export function EntityScreen({ entityKey, entities, standalone = true, module = "Global", screenTitle, screen }) {
  const ctx = useAppData();
  const entity = entities[entityKey];
  const rows = ctx.data[entityKey] || [];
  const { nextActions, toggleActive, statusField } = useRecordActions(entity);
  const toast = useToast();
  const { density, toggleDensity, viewMode, setViewMode } = useUIPreferences();
  const { setExtra } = useBreadcrumbExtra();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", activeOnly: false });
  const [savedViews, setSavedViews] = useState(() => savedViewsStore[entityKey] || []);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [importerOpen, setImporterOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [viewingRow, setViewingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);
  const [loading, setLoading] = useState(true);

  const accent = useMemo(() => accentForModule(module), [module]);
  const EntityIcon = useMemo(() => iconForModule(module), [module]);

  useEffect(() => {
    setLoading(true);
    setSearch("");
    setFilters({ status: "", activeOnly: false });
    setSavedViews(savedViewsStore[entityKey] || []);
    if (ctx?.refreshEntity) {
      ctx.refreshEntity(entityKey).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [entityKey]);

  useEffect(() => {
    return () => setExtra(null);
    
  }, [entityKey]);

  const openId = searchParams.get("open");
  useEffect(() => {
    if (!openId || loading) return;
    const target = rows.find((r) => r[entity.idFieldKey] === openId);
    if (target) {
      setViewingRow(target);
      setExtra(target[entity.idFieldKey]);
    }
    
  }, [openId, loading, rows.length]);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((row) => [entity.labelFieldKey, entity.idFieldKey].some((k) => String(row[k] || "").toLowerCase().includes(q)));
    }
    if (filters.status) r = r.filter((row) => row.status === filters.status);
    if (filters.activeOnly) r = r.filter((row) => row.isActive !== false);
    return r;
  }, [rows, search, filters, entity]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [search, filters, pageSize]);

  const statCards = useMemo(() => buildStatCards(entity, rows, statusField, accent), [entity, rows, statusField, accent]);

  const childEntity = entity.lineItemsKey ? entities[entity.lineItemsKey] : null;
  const getLineItems = (row) => {
    if (!childEntity || !row) return [];
    const parentFk = childEntity.fields.find((f) => f.fkTarget === entityKey);
    return (ctx.data[entity.lineItemsKey] || []).filter((it) => it[parentFk.key] === row[entity.idFieldKey]);
  };

  const openCreate = () => {
    setEditingRow(null);
    setFormOpen(true);
  };
  const openEdit = (row) => {
    setEditingRow(row);
    setFormOpen(true);
    setExtra(row[entity.idFieldKey]);
  };
  const openView = (row) => {
    setViewingRow(row);
    setExtra(row[entity.idFieldKey]);
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set("open", row[entity.idFieldKey]);
      return next;
    });
  };

  const handleSave = (values, lineItems) => {
    if (editingRow) {
      ctx.updateRecord(entityKey, editingRow.__rowId, values);
      if (childEntity) {
        const parentFk = childEntity.fields.find((f) => f.fkTarget === entityKey);
        ctx.dispatch({ type: "DELETE_MANY_BY_FK", entityKey: entity.lineItemsKey, fkKey: parentFk.key, fkValue: editingRow[entity.idFieldKey] });
        if (lineItems.length) {
          ctx.createManyRecords(entity.lineItemsKey, lineItems.map((it) => ({ ...it, [parentFk.key]: editingRow[entity.idFieldKey] })));
        }
      }
      toast(`${entity.name} updated successfully`);
    } else {
      const created = ctx.createRecord(entityKey, values);
      if (childEntity && lineItems.length) {
        const parentFk = childEntity.fields.find((f) => f.fkTarget === entityKey);
        ctx.createManyRecords(entity.lineItemsKey, lineItems.map((it) => ({ ...it, [parentFk.key]: created[entity.idFieldKey] })));
      }
      toast(`${entity.name} created successfully`);
    }
    setFormOpen(false);
    setEditingRow(null);
    setExtra(null);
  };

  const handleDelete = (row) => {
    ctx.deleteRecord(entityKey, row.__rowId, row[entity.idFieldKey]);
    if (childEntity) {
      const parentFk = childEntity.fields.find((f) => f.fkTarget === entityKey);
      ctx.dispatch({ type: "DELETE_MANY_BY_FK", entityKey: entity.lineItemsKey, fkKey: parentFk.key, fkValue: row[entity.idFieldKey] });
    }
    setDeletingRow(null);
    if (viewingRow && (viewingRow.__rowId === row.__rowId || viewingRow[entity.idFieldKey] === row[entity.idFieldKey])) {
      closeView();
    }
    toast(`${entity.name} deleted`);
  };

  const handleDuplicate = (row) => {
    const copy = { ...row };
    delete copy[entity.idFieldKey];
    delete copy.__rowId;
    if (copy[entity.labelFieldKey]) copy[entity.labelFieldKey] = `${copy[entity.labelFieldKey]} (Copy)`;
    const created = ctx.createRecord(entityKey, copy);
    toast(`Duplicated ${entity.name}`);
    openEdit(created);
  };

  const handleExport = () => {
    downloadCSV(filtered, `${entity.key}_export.csv`);
    toast(`Exported ${filtered.length} ${entity.name} records`);
  };

  const handleResetView = () => {
    setSearch("");
    setFilters({ status: "", activeOnly: false });
    setPage(1);
    toast("View reset");
  };

  const persistViews = (next) => {
    savedViewsStore[entityKey] = next;
    setSavedViews(next);
  };
  const handleSaveView = (name) => persistViews([...savedViews, { name, filters }]);
  const handleDeleteView = (idx) => persistViews(savedViews.filter((_, i) => i !== idx));

  const handleConvert = (rule) => {
    const created = runConversion(rule, viewingRow, entities, ctx);
    toast(`Created ${entities[rule.targetKey].name} ${created[entities[rule.targetKey].idFieldKey]}`);
    closeView();
    navigate(recordLink(rule.targetKey, created[entities[rule.targetKey].idFieldKey]));
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingRow(null);
    setExtra(null);
  };
  const closeView = () => {
    setViewingRow(null);
    setExtra(null);
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.delete("open");
      return next;
    });
  };

  const isFilteredEmpty = !loading && filtered.length === 0;
  const isTrulyEmpty = isFilteredEmpty && !search && !filters.status && !filters.activeOnly;

  const body = (
    <div className="flex flex-col gap-4 sm:gap-5">
      {standalone && (
        <PageHeader
          icon={EntityIcon}
          accent={accent}
          title={screenTitle || entity.name}
          subtitle={describeEntity(entity)}
          meta={`${entity.kind === "master" ? "Master Data" : "Transaction Record"} · ${rows.length} on file`}
          actions={
            <>
              <Button variant="secondary" size="sm" icon={Info} onClick={() => setInfoModalOpen(true)}>Docs & Schema</Button>
              <Button variant="secondary" size="sm" icon={Upload} onClick={() => setImporterOpen(true)}>Import Data</Button>
              <Button variant="secondary" size="sm" icon={Download} onClick={handleExport}>Export</Button>
              <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>New {entity.name}</Button>
            </>
          }
        />
      )}

      {standalone && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
            : statCards.map((c) => (
                <StatCard key={c.key} icon={c.statIcon} label={c.label} value={c.value} caption={c.caption} accent={c.accent} />
              ))}
        </div>
      )}

      
      {standalone && !loading && entity.kind === "transaction" && (
        <StatusPipeline statusField={statusField} rows={rows} accent={accent} />
      )}

      <Card className="p-3 sm:p-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0D9488]" />
              <label htmlFor={`search-${entityKey}`} className="sr-only">Search {entity.name}</label>
              <input
                id={`search-${entityKey}`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search by name or ID…`}
                className="w-full rounded-lg border-0 ring-1 ring-inset ring-slate-200 pl-8 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0D9488] bg-white transition-colors"
              />
            </div>
            <FilterPanel entity={entity} statusField={statusField} filters={filters} onChange={setFilters} savedViews={savedViews} onSaveView={handleSaveView} onDeleteView={handleDeleteView} />
            <div className="flex items-center rounded-lg ring-1 ring-inset ring-slate-200 overflow-hidden bg-slate-100 p-0.5">
              <button
                onClick={() => setViewMode("list")}
                title="List view"
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                className={cx("p-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] transition-colors", viewMode === "list" ? "bg-white text-[#0F766E] shadow-xs" : "text-slate-500 hover:text-slate-900")}
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                title="Table view"
                aria-label="Table view"
                aria-pressed={viewMode === "table"}
                className={cx("p-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] transition-colors", viewMode === "table" ? "bg-white text-[#0F766E] shadow-xs" : "text-slate-500 hover:text-slate-900")}
              >
                <Table2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {viewMode === "table" && (
              <div className="hidden md:flex items-center rounded-lg ring-1 ring-inset ring-slate-200 overflow-hidden bg-slate-100 p-0.5">
                <button
                  onClick={() => density !== "comfortable" && toggleDensity()}
                  title="Comfortable rows"
                  aria-label="Comfortable row density"
                  aria-pressed={density === "comfortable"}
                  className={cx("p-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] transition-colors", density === "comfortable" ? "bg-white text-[#0F766E] shadow-xs" : "text-slate-500 hover:text-slate-900")}
                >
                  <Rows2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => density !== "compact" && toggleDensity()}
                  title="Compact rows"
                  aria-label="Compact row density"
                  aria-pressed={density === "compact"}
                  className={cx("p-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] transition-colors", density === "compact" ? "bg-white text-[#0F766E] shadow-xs" : "text-slate-500 hover:text-slate-900")}
                >
                  <Rows3 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <IconButton icon={RotateCcw} label="Reset filters and search" onClick={handleResetView} />
            <span className="text-xs text-slate-500 whitespace-nowrap ml-auto sm:ml-0 font-mono">{fmtNum(filtered.length)} record{filtered.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton columns={Math.min(7, pickDisplayColumns(entity).length + 1)} />
        ) : isTrulyEmpty ? (
          <EmptyState
            icon={EntityIcon}
            title={`No ${entity.name} records found`}
            message="Get started by creating your first record."
            actionLabel={`Create First ${entity.name}`}
            onAction={openCreate}
          />
        ) : isFilteredEmpty ? (
          <EmptyState title="No matching records" message="Try adjusting your search or filters to find what you're looking for." />
        ) : (
          <DataTable
            entity={entity}
            rows={pageRows}
            entities={entities}
            seed={ctx.data}
            onView={openView}
            onEdit={openEdit}
            onDelete={setDeletingRow}
            onDuplicate={handleDuplicate}
            accent={accent}
            quickActions={(row) => (
              <>
                {nextActions(row).slice(0, 2).map((a, i) => (
                  <IconButton key={i} icon={a.icon} label={a.label} tone={a.tone} onClick={a.onClick} />
                ))}
                {entity.kind === "master" && entity.fields.some((f) => f.key === "isActive") && (
                  <IconButton icon={row.isActive === false ? CheckCircle2 : XCircle} label={row.isActive === false ? "Activate" : "Deactivate"} onClick={() => toggleActive(row)} />
                )}
              </>
            )}
          />
        )}
        {!loading && filtered.length > 0 && (
          <Pagination page={page} pageCount={pageCount} onPage={setPage} total={filtered.length} pageSize={pageSize} onPageSizeChange={setPageSize} itemLabel="entries" />
        )}
      </Card>
    </div>
  );

  return (
    <>
      {body}

      <Modal
        open={formOpen}
        onClose={closeForm}
        size={childEntity ? "full" : "xl"}
        icon={EntityIcon}
        accent={accent}
        title={editingRow ? `Edit ${entity.name}` : `New ${entity.name}`}
        subtitle={editingRow ? editingRow[entity.idFieldKey] : null}
      >
        <RecordForm entity={entity} entities={entities} seed={ctx.data} record={editingRow} initialLineItems={getLineItems(editingRow)} onSave={handleSave} onCancel={closeForm} />
      </Modal>

      <Modal
        open={!!viewingRow}
        onClose={closeView}
        size="xl"
        icon={EntityIcon}
        accent={accent}
        title={entity.name}
        subtitle={viewingRow ? viewingRow[entity.idFieldKey] : ""}
        footer={
          viewingRow && (
            <>
              {(CONVERSION_RULES[entityKey] || []).map((rule, i) => (
                <Button key={i} variant="secondary" icon={ArrowRightLeft} onClick={() => handleConvert(rule)}>{rule.label}</Button>
              ))}
              <Button variant="secondary" onClick={closeView}>Close</Button>
              <Button variant="primary" icon={Pencil} onClick={() => { const r = viewingRow; closeView(); openEdit(r); }}>Edit</Button>
            </>
          )
        }
      >
        {viewingRow && (
          <div className="flex flex-col gap-5">
            <DetailView entity={entity} record={viewingRow} entities={entities} seed={ctx.data} />
            {childEntity && getLineItems(viewingRow).length > 0 && (
              <div className="border border-slate-200/70 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">{childEntity.name}</div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {getLineItems(viewingRow).map((it) => {
                      const prod = (ctx.data.productMaster || []).find((p) => p.productID === it.productID);
                      return (
                        <tr key={it.__rowId}>
                          <td className="px-3.5 py-2.5">{prod ? prod.productName : it.productID}</td>
                          <td className="px-3.5 py-2.5 text-slate-500">Qty {fmtNum(it.quantity)}</td>
                          <td className="px-3.5 py-2.5 text-slate-500">@ {fmtMoney2(it.rate)}</td>
                          <td className="px-3.5 py-2.5 text-right font-semibold">{fmtMoney2(it.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <RelatedRecords entityKey={entityKey} record={viewingRow} entities={entities} />
          </div>
        )}
      </Modal>

      <UniversalImporterModal
        open={importerOpen}
        onClose={() => setImporterOpen(false)}
        entity={entity}
        onImportSuccess={(newRows) => {
          if (newRows && newRows.length > 0) {
            ctx?.createManyRecords(entityKey, newRows);
          }
        }}
      />

      <ScreenInfoModal
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        screen={screen}
        entity={entity}
        entities={entities}
        module={module}
      />

      <ConfirmDialog
        open={!!deletingRow}
        onClose={() => setDeletingRow(null)}
        onConfirm={() => handleDelete(deletingRow)}
        title={`Delete ${entity.name}?`}
        confirmLabel="Delete"
        message={`This will permanently remove ${deletingRow ? deletingRow[entity.labelFieldKey] || deletingRow[entity.idFieldKey] : "this record"} from the system. This cannot be undone.`}
      />
    </>
  );
}

export function MultiEntityScreen({ screen, entities }) {
  const ctx = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const keys = (screen.entityKeys || []).filter((k) => entities[k] && !entities[k].isLineItemOf);
  const requestedEntity = searchParams.get("entity");
  const requestedIdx = requestedEntity ? keys.indexOf(requestedEntity) : -1;
  const [active, setActive] = useState(requestedIdx >= 0 ? requestedIdx : 0);

  useEffect(() => {
    const idx = requestedEntity ? keys.indexOf(requestedEntity) : -1;
    setActive(idx >= 0 ? idx : 0);
  }, [screen.code, requestedEntity, keys]);

  const activeKey = keys[active] || keys[0] || (screen.entityKeys && screen.entityKeys[0]);
  if (!activeKey || !entities[activeKey]) return null;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {keys.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#0D9488] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              {screen.code}
            </span>
            <span className="text-xs font-bold text-slate-800">
              {screen.title}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              ({keys.length} Sub-Entities)
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {keys.map((k, idx) => {
              const ent = entities[k];
              const count = (ctx.data[k] || []).length;
              const isSelected = active === idx;
              return (
                <button
                  key={k}
                  onClick={() => {
                    setActive(idx);
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("entity", k);
                      return next;
                    });
                  }}
                  className={cx(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
                    isSelected
                      ? "bg-[#0D9488] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  )}
                >
                  <span>{ent?.name || k}</span>
                  <span className={cx(
                    "px-1.5 py-0.5 rounded-md text-[10px] font-mono",
                    isSelected ? "bg-teal-700/60 text-white" : "bg-white text-slate-500 border border-slate-200"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <EntityScreen
        key={activeKey}
        entityKey={activeKey}
        entities={entities}
        module={screen.module}
        screenTitle={keys.length > 1 ? `${entities[activeKey]?.name} (${screen.code})` : screen.title}
        screen={screen}
      />
    </div>
  );
}
