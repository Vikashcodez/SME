import { useState } from "react";
import { 
  Info, Database, Layers, FileCode, CheckCircle2, 
  ArrowRight, Key, Hash, HelpCircle, Copy, Check, ExternalLink,
  ShieldCheck, Activity, Boxes
} from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { cx, fmtNum } from "../utils/format";
import { toast } from "react-hot-toast";

function generateOperationalDescription(screen, entity) {
  if (!screen && !entity) return "Standard ERP record management and operational data processing.";
  const title = screen?.title || entity?.name || "Record";
  const kind = entity?.kind || screen?.kind || "master";
  const module = screen?.module || "Global Operations";

  if (kind === "master") {
    return `Golden master data directory for ${title}. This screen maintains foundational records, unique business identifiers, regulatory tax attributes, and enterprise-wide reference keys across ${module}.`;
  }
  if (kind === "transaction") {
    return `Operational transaction console for ${title}. Tracks line-item execution, double-entry values, multi-stage approval statuses, and downstream accounting/inventory postings in ${module}.`;
  }
  return `Enterprise operational workspace for ${title} under ${module}. Supports search, dense tabular review, multi-criteria filtering, CSV/Excel import-export, and granular field editing.`;
}

export function ScreenInfoModal({ open, onClose, screen, entity, entities = {}, module = "Global" }) {
  const [activeTab, setActiveTab] = useState("fields"); 
  const [copied, setCopied] = useState(false);

  if (!open || (!screen && !entity)) return null;

  const currentEntity = entity || (screen?.entityKeys?.[0] ? entities[screen.entityKeys[0]] : null);
  const fields = currentEntity?.fields || [];
  const lineItemEntity = currentEntity?.lineItemsKey ? entities[currentEntity.lineItemsKey] : null;
  const operationalDesc = generateOperationalDescription(screen, currentEntity);

  const sampleJson = {
    [currentEntity?.idFieldKey || "id"]: `${currentEntity?.key?.slice(0, 4)?.toUpperCase() || "REC"}-0001`,
    ...fields.slice(0, 8).reduce((acc, f) => {
      if (f.role === "hidden_audit" || f.key === currentEntity?.idFieldKey) return acc;
      acc[f.key] = f.ui === "currency" || f.ui === "integer" || f.ui === "decimal" 
        ? 100 
        : f.ui === "boolean" 
        ? true 
        : f.ui === "date" 
        ? "2026-08-25" 
        : f.options?.[0] || `Sample ${f.name}`;
      return acc;
    }, {})
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(sampleJson, null, 2));
    setCopied(true);
    toast.success("Sample JSON schema payload copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      icon={Info}
      title={screen?.title || currentEntity?.name || "Screen Information"}
      subtitle={`${screen?.code || currentEntity?.key || "ERP"} · ${screen?.module || module}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-mono text-slate-500">
            {fields.length} schema fields · {currentEntity?.kind || "master"}
          </span>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 text-slate-900">
        
        <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-teal-600 text-white flex-shrink-0 mt-0.5">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#0D9488]">Operational Purpose & Workflow</p>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed">{operationalDesc}</p>
          </div>
        </div>

        
        <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
          {[
            { id: "fields", label: `Field Dictionary (${fields.length})`, icon: Database },
            { id: "workflow", label: "Workflow & Rules", icon: HelpCircle },
            { id: "relations", label: "Entities & Relations", icon: Layers },
            { id: "json", label: "JSON Schema Payload", icon: FileCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cx(
                  "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
                  isActive
                    ? "bg-[#0D9488] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        
        {activeTab === "fields" && (
          <div className="space-y-3">
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <div className="max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Field Label</th>
                      <th className="py-2.5 px-3">JSON Key</th>
                      <th className="py-2.5 px-3">Data Type</th>
                      <th className="py-2.5 px-3 text-center">Required</th>
                      <th className="py-2.5 px-3">Options / FK Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fields.map((f, i) => (
                      <tr key={f.key + i} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {f.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#0D9488] font-bold">
                          {f.key}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono">
                            {f.ui || "text"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {f.required ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Mandatory
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Optional</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate text-[11px]">
                          {f.fkTarget ? (
                            <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                              → {f.fkTarget}
                            </span>
                          ) : f.options?.length ? (
                            <span className="text-slate-500 truncate block" title={f.options.join(", ")}>
                              {f.options.join(", ")}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        
        {activeTab === "workflow" && (
          <div className="space-y-4 text-xs text-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#0D9488]" /> Record Lifecycle
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  {currentEntity?.kind === "transaction" 
                    ? "Transaction records transition from Draft → Confirmed → In Progress → Completed / Invoiced. Line items dynamically rollup gross amounts, tax calculations, and net totals."
                    : "Master records serve as foundational golden data. They support active/inactive toggling, unique business partner IDs, and cascade lookups in downstream orders and vouchers."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-[#0D9488]" /> Primary Identification
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  Primary Key field: <code className="font-mono font-bold text-[#0D9488] bg-white px-1.5 py-0.5 rounded border border-slate-200">{currentEntity?.idFieldKey}</code>. 
                  Auto-formatted with business prefix standards on creation.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900">Supported Operational Capabilities</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  "Full-Text Search", "Dense Table View", "List Cards View",
                  "CSV / Excel Export", "Universal CSV Import", "Record Duplication",
                  "Double-Entry Audit", "Multi-Tenant Scoping"
                ].map((cap, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-slate-700 font-medium bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        
        {activeTab === "relations" && (
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900">Managed Entities on this Screen</h4>
              <div className="space-y-2">
                {(screen?.entityKeys || [currentEntity?.key]).map((ek, i) => {
                  const ent = entities[ek] || currentEntity;
                  if (!ent) return null;
                  return (
                    <div key={ek + i} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-[#0F766E]">
                          <Boxes className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{ent.name}</p>
                          <p className="font-mono text-[11px] text-slate-500">Key: {ent.key} · ID: {ent.idFieldKey}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
                        {ent.fields?.length || 0} fields
                      </span>
                    </div>
                  );
                })}
              </div>

              {lineItemEntity && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="font-bold text-slate-700 mb-1">Child Line Items Table:</p>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{lineItemEntity.name}</p>
                      <p className="font-mono text-[11px] text-slate-500">Entity: {lineItemEntity.key}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                      Nested Line Items Grid
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        
        {activeTab === "json" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Standard REST API / Storage Payload Format</span>
              <button
                onClick={handleCopyJson}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                <span>{copied ? "Copied" : "Copy Payload"}</span>
              </button>
            </div>
            <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[300px]">
              {JSON.stringify(sampleJson, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ScreenInfoModal;
