import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, Command, ArrowRight, Boxes, FileText, Building2, 
  Sparkles, PlusCircle, Layers, Database, ExternalLink, Key, 
  CheckCircle2, Clock, Activity, FileSpreadsheet, Shield, X,
  LayoutDashboard, Truck, Factory, CheckSquare, Users, Route, Landmark, ShieldCheck,
  Store, FileCheck, BarChart3, Share2, Compass, ShoppingCart
} from "lucide-react";
import { SCHEMA } from "../../data/schema";
import { useCompany } from "../../context/CompanyContext";
import { cx } from "../../utils/format";

function getScreenPurpose(screen, entities) {
  if (!screen) return "Browse and manage enterprise operational records.";
  const title = screen.title || "Screen";
  const mod = screen.module || "";
  const ek = screen.entityKeys?.[0];
  const ent = ek ? entities[ek] : null;

  if (screen.kind === "master" || ent?.kind === "master") {
    return `Maintains golden records, enterprise topology, unique identifiers, and standard rate parameters for ${title} under ${mod}.`;
  }
  if (screen.kind === "transaction" || ent?.kind === "transaction") {
    return `Executes double-entry postings, line-item valuations, approval workflows, and status tracking for ${title} under ${mod}.`;
  }
  return `Comprehensive operational data workspace for ${title}. Supports searching, filtering, import/export, and schema validation.`;
}

export function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all"); 
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { companiesList, switchCompany } = useCompany();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveCategory("all");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const screensArray = useMemo(() => {
    return Array.isArray(SCHEMA?.screens) ? SCHEMA.screens : Object.values(SCHEMA?.screens || {});
  }, []);

  const entitiesObj = useMemo(() => {
    return SCHEMA?.entities || {};
  }, []);

  const entitiesArray = useMemo(() => {
    return Object.entries(entitiesObj).map(([k, v]) => ({ key: k, ...v }));
  }, [entitiesObj]);

  const modulesList = useMemo(() => [
    { id: "dashboard", title: "Executive Dashboard", subtitle: "KPIs, Telemetry & Approvals", path: "/app/dashboard?tab=overview", icon: LayoutDashboard },
    { id: "masters", title: "Master Data Hub", subtitle: "Topology, Golden Records & Catalogs", path: "/app/masters?tab=company", icon: Building2 },
    { id: "access", title: "User & Access Management", subtitle: "RBAC Matrix, Users & Security Controls", path: "/app/access?tab=matrix", icon: Key },
    { id: "sales", title: "Sales, Customer & Service Management", subtitle: "Pipeline, Orders, Proposals & Returns", path: "/app/sales?tab=orders", icon: ShoppingCart },
    { id: "procurement", title: "Procurement, Sourcing & Trading", subtitle: "Costing Matrix, Trading, RFx & Contracts", path: "/app/procurement?tab=orders", icon: Truck },
    { id: "inventory", title: "Inventory & Warehouse", subtitle: "Bay Matrix, Picking, Expiry & Cycle Counts", path: "/app/inventory?tab=stock", icon: Boxes },
    { id: "manufacturing", title: "Manufacturing Execution & Engineering", subtitle: "BOM Explosion, Work Orders & ECN/ECO", path: "/app/manufacturing?tab=bom", icon: Factory },
    { id: "quality", title: "Quality Assurance & Calibration", subtitle: "Metrology, NCR, Calibration & SOPs", path: "/app/quality?tab=inspections", icon: CheckSquare },
    { id: "logistics", title: "Logistics & Transport", subtitle: "Schedules, Carrier OTIF & Fleet Maintenance", path: "/app/logistics?tab=schedules", icon: Compass },
    { id: "projects", title: "Project, Program & Service Billing", subtitle: "Portfolio, WBS, EVM & Construction/EPC", path: "/app/projects?tab=portfolio", icon: Route },
    { id: "retail", title: "Retail, POS & Digital Commerce", subtitle: "Point-of-Sale, Omnichannel & Loyalty", path: "/app/retail?tab=pos", icon: Store },
    { id: "assets", title: "Asset Management", subtitle: "Machinery, PM Orders, Leases & Lifecycle", path: "/app/assets?tab=registry", icon: Building2 },
    { id: "hr", title: "HR, Payroll & Talent Development", subtitle: "Employees, Biometrics, LMS & ESS Portal", path: "/app/hr?tab=employees", icon: Users },
    { id: "accounts", title: "Financial Accounts, Treasury & Planning", subtitle: "Vouchers, Statements, FP&A & Treasury", path: "/app/accounts/voucher-entry", icon: Landmark },
    { id: "taxation", title: "Taxation & GST/VAT Compliance", subtitle: "GSTR-1, 3B, E-Invoicing & Global Tax Engine", path: "/app/taxation?tab=gstr1", icon: ShieldCheck },
    { id: "compliance", title: "Global Trade, Compliance & Consolidation", subtitle: "Incident Logs, SDS, Consolidation & Audits", path: "/app/compliance?tab=ehs", icon: Shield },
    { id: "documents", title: "Document, Workflow & Contract Management", subtitle: "DMS, Approval Workflows & E-Signatures", path: "/app/documents?tab=dms", icon: FileCheck },
    { id: "bi", title: "Business Intelligence & Reporting", subtitle: "Report Builder, Cross-Analytics & Distribution", path: "/app/bi?tab=builder", icon: BarChart3 },
    { id: "ai", title: "AI Assistant & Operations", subtitle: "Copilot, OCR Parser, Demand Forecasting", path: "/app/ai?tab=copilot", icon: Sparkles },
    { id: "integrations", title: "API & Integration Hub", subtitle: "Bank API, Connectors, Third-Party & Webhooks", path: "/app/integrations?tab=banking", icon: Share2 },
  ], []);

  
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    let hits = [];

    
    if (!q) {
      if (activeCategory === "all" || activeCategory === "actions") {
        hits.push(
          { type: "action", id: "act-dash", title: "Executive Dashboard", subtitle: "Main KPI & Operations Radar", icon: LayoutDashboard, path: "/app/dashboard?tab=overview" },
          { type: "action", id: "act-voucher", title: "Tally Voucher Entry (F4-F9)", subtitle: "Double-entry Accounting Console", icon: Landmark, path: "/app/accounts/voucher-entry" },
          { type: "action", id: "act-so", title: "Sales Order Execution Pipeline", subtitle: "Screen SAL2 · Order-to-Cash", icon: FileText, path: "/app/screen/SAL2", screenCode: "SAL2" },
          { type: "action", id: "act-inv", title: "E-Invoice & Signed QR Dispatch", subtitle: "Screen TAX3 · GSTN IRN Generator", icon: ShieldCheck, path: "/app/taxation?tab=einvoice" },
          { type: "action", id: "act-po", title: "PO Line Costing Matrix", subtitle: "Screen PUR2 · Landed Costing", icon: Truck, path: "/app/procurement?tab=orders", screenCode: "PUR2" },
          { type: "action", id: "act-bom", title: "Multi-Level BOM Engineering", subtitle: "Screen MFG1 · Nested Component Tree", icon: Factory, path: "/app/manufacturing?tab=bom" },
        );
      }
      if (activeCategory === "screens" || activeCategory === "all") {
        screensArray.slice(0, 15).forEach((s) => {
          hits.push({
            type: "screen",
            id: `scr-${s.code}`,
            screenCode: s.code,
            title: `${s.title} (${s.code})`,
            rawTitle: s.title,
            subtitle: `${s.code} · ${s.module}`,
            module: s.module,
            kind: s.kind || "master",
            entityKeys: s.entityKeys || [],
            icon: Boxes,
            path: `/app/screen/${s.code}`,
          });
        });
      }
      if (activeCategory === "modules") {
        modulesList.forEach((m) => {
          hits.push({
            type: "module",
            id: `mod-${m.id}`,
            title: m.title,
            subtitle: m.subtitle,
            icon: m.icon,
            path: m.path,
          });
        });
      }
      if (activeCategory === "entities") {
        entitiesArray.slice(0, 20).forEach((e) => {
          hits.push({
            type: "entity",
            id: `ent-${e.key}`,
            entityKey: e.key,
            title: e.name,
            subtitle: `Entity: ${e.key} · ${e.fields?.length || 0} fields · ${e.kind || "master"}`,
            fields: e.fields || [],
            kind: e.kind || "master",
            icon: Database,
            path: `/app/screen/${screensArray.find((s) => s.entityKeys?.includes(e.key))?.code || "CMD1"}`,
          });
        });
      }
      return hits;
    }

    
    if (activeCategory === "all" || activeCategory === "screens") {
      screensArray.forEach((s) => {
        const codeMatch = s.code?.toLowerCase().includes(q);
        const titleMatch = s.title?.toLowerCase().includes(q);
        const modMatch = s.module?.toLowerCase().includes(q);
        const entityMatch = (s.entityKeys || []).some((k) => k.toLowerCase().includes(q));

        if (codeMatch || titleMatch || modMatch || entityMatch) {
          hits.push({
            type: "screen",
            id: `scr-${s.code}`,
            screenCode: s.code,
            title: `${s.title} (${s.code})`,
            rawTitle: s.title,
            subtitle: `${s.code} · ${s.module}`,
            module: s.module,
            kind: s.kind || "master",
            entityKeys: s.entityKeys || [],
            icon: Boxes,
            path: `/app/screen/${s.code}`,
            priority: codeMatch ? 1 : titleMatch ? 2 : 3,
          });
        }
      });
    }

    
    if (activeCategory === "all" || activeCategory === "entities") {
      entitiesArray.forEach((e) => {
        const keyMatch = e.key.toLowerCase().includes(q);
        const nameMatch = e.name?.toLowerCase().includes(q);
        const fieldMatch = (e.fields || []).some((f) => f.name?.toLowerCase().includes(q) || f.key?.toLowerCase().includes(q));

        if (keyMatch || nameMatch || fieldMatch) {
          const mappedScreen = screensArray.find((s) => s.entityKeys?.includes(e.key));
          hits.push({
            type: "entity",
            id: `ent-${e.key}`,
            entityKey: e.key,
            title: e.name,
            subtitle: `Entity: ${e.key} · ${e.fields?.length || 0} fields · ${e.kind || "master"}`,
            fields: e.fields || [],
            kind: e.kind || "master",
            icon: Database,
            path: mappedScreen ? `/app/screen/${mappedScreen.code}` : "/app/dashboard",
            screenCode: mappedScreen?.code,
          });
        }
      });
    }

    
    if (activeCategory === "all" || activeCategory === "modules") {
      modulesList.forEach((m) => {
        if (m.title.toLowerCase().includes(q) || m.subtitle.toLowerCase().includes(q)) {
          hits.push({
            type: "module",
            id: `mod-${m.id}`,
            title: m.title,
            subtitle: m.subtitle,
            icon: m.icon,
            path: m.path,
          });
        }
      });
    }

    
    if (activeCategory === "all") {
      (companiesList || []).forEach((c) => {
        if (c.company_name?.toLowerCase().includes(q) || c.company_code?.toLowerCase().includes(q)) {
          hits.push({
            type: "company",
            id: `comp-${c.company_code}`,
            title: `Switch Company: ${c.company_name}`,
            subtitle: `Tenant Code: ${c.company_code} · ${c.company_type || "Company"}`,
            icon: Building2,
            action: () => {
              switchCompany(c.company_code);
              navigate("/app/dashboard");
            },
          });
        }
      });
    }

    
    return hits.slice(0, 35);
  }, [query, activeCategory, screensArray, entitiesArray, modulesList, companiesList, switchCompany, navigate]);

  const activeItem = results[selectedIndex] || results[0];

  const handleSelect = (item) => {
    if (!item) return;
    onClose();
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (results.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % (results.length || 1));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  
  let inspectorData = null;
  if (activeItem) {
    if (activeItem.type === "screen") {
      const scr = screensArray.find((s) => s.code === activeItem.screenCode);
      const entity = scr?.entityKeys?.[0] ? entitiesObj[scr.entityKeys[0]] : null;
      inspectorData = {
        code: scr?.code || activeItem.screenCode,
        title: scr?.title || activeItem.rawTitle,
        module: scr?.module || activeItem.module,
        kind: scr?.kind || entity?.kind || "master",
        entitiesCount: (scr?.entityKeys || []).length,
        entityKeys: scr?.entityKeys || [],
        primaryEntity: entity,
        fields: entity?.fields || [],
        purpose: getScreenPurpose(scr, entitiesObj),
      };
    } else if (activeItem.type === "entity") {
      const entity = entitiesObj[activeItem.entityKey];
      const mappedScreen = screensArray.find((s) => s.entityKeys?.includes(activeItem.entityKey));
      inspectorData = {
        code: mappedScreen?.code || activeItem.entityKey,
        title: entity?.name || activeItem.title,
        module: mappedScreen?.module || "Global Master Domain",
        kind: entity?.kind || "master",
        entitiesCount: 1,
        entityKeys: [activeItem.entityKey],
        primaryEntity: entity,
        fields: entity?.fields || [],
        purpose: `Entity database table managing ${entity?.name || activeItem.title}. Supports structured schemas, validations, foreign key relations, and REST endpoints.`,
      };
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4 md:p-10 flex items-start justify-center">
      
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 overflow-hidden animate-modalIn flex flex-col max-h-[85vh]">
        
        <div className="flex items-center px-4 sm:px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <Search className="h-5 w-5 text-[#0D9488] mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search 374 screens, 490 entities, ERP modules (e.g. PFG01, FIN01, SCM04, Sales Order)..."
            className="flex-1 bg-transparent border-0 text-slate-900 placeholder:text-slate-400 text-sm sm:text-base focus:outline-none focus:ring-0 font-medium"
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-1 text-slate-400 hover:text-slate-600 mr-2">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-lg">
            ESC
          </kbd>
        </div>

        
        <div className="px-4 sm:px-6 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto flex-shrink-0">
          {[
            { id: "all", label: "All Items" },
            { id: "screens", label: "Screens (374)" },
            { id: "entities", label: "Entities (490)" },
            { id: "modules", label: "16 Modules" },
            { id: "actions", label: "Actions & Tools" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSelectedIndex(0);
              }}
              className={cx(
                "px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                activeCategory === cat.id
                  ? "bg-[#0D9488] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200">
          
          <div className="w-full md:w-3/5 overflow-y-auto p-3 space-y-1 max-h-[50vh] md:max-h-none scrollbar-thin">
            {results.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                <Boxes className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">No matching screens or entities found</p>
                <p className="text-xs text-slate-400 mt-1">Try searching by screen code (e.g. FIN01, PFG01) or entity name.</p>
              </div>
            ) : (
              results.map((item, idx) => {
                const Icon = item.icon || Boxes;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id + idx}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cx(
                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left text-xs transition-all cursor-pointer",
                      isSelected
                        ? "bg-teal-50/90 text-[#0F766E] font-semibold border-l-4 border-[#0D9488] shadow-xs"
                        : "text-slate-700 hover:bg-slate-100/70"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cx(
                        "p-2 rounded-xl flex-shrink-0 transition-colors",
                        isSelected ? "bg-[#0D9488] text-white" : "bg-slate-100 text-slate-500 border border-slate-200"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold truncate text-slate-900">{item.title}</p>
                          {item.screenCode && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[#0D9488] border border-slate-200 font-mono text-[10px] font-bold">
                              {item.screenCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                      </div>
                    </div>
                    <ArrowRight className={cx("h-4 w-4 flex-shrink-0 transition-opacity", isSelected ? "opacity-100 text-[#0D9488]" : "opacity-0")} />
                  </button>
                );
              })
            )}
          </div>

          
          <div className="w-full md:w-2/5 p-4 bg-slate-50/50 overflow-y-auto hidden md:flex flex-col justify-between text-xs space-y-4">
            {inspectorData ? (
              <div className="space-y-4">
                
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-50 text-[#0F766E] border border-teal-200 uppercase">
                      {inspectorData.code}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                      {inspectorData.kind}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-2">{inspectorData.title}</h3>
                  <p className="text-[11px] text-[#0D9488] font-bold mt-0.5">{inspectorData.module}</p>
                </div>

                
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Activity className="h-3 w-3 text-[#0D9488]" /> Operational Purpose
                  </p>
                  <p className="text-slate-700 leading-relaxed text-[11px]">{inspectorData.purpose}</p>
                </div>

                
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Database className="h-3 w-3 text-[#0D9488]" /> Entities & Key Fields ({inspectorData.fields.length})
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {inspectorData.fields.slice(0, 6).map((f) => (
                      <div key={f.key} className="flex items-center justify-between text-[11px] py-0.5">
                        <span className="text-slate-700 truncate font-medium">{f.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1 rounded border border-slate-200">{f.ui || "text"}</span>
                      </div>
                    ))}
                    {inspectorData.fields.length > 6 && (
                      <p className="text-[10px] text-slate-400 font-mono pt-1">+{inspectorData.fields.length - 6} more fields</p>
                    )}
                  </div>
                </div>

                
                <button
                  onClick={() => handleSelect(activeItem)}
                  className="w-full py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Open Screen</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 text-slate-400">
                <Command className="h-8 w-8 text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">ERP Global Search</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Select any screen or entity to view its operational guide, data model, and quick actions.</p>
              </div>
            )}
          </div>
        </div>

        
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono flex-shrink-0">
          <div className="flex items-center gap-3">
            <span><kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">↑</kbd> <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">↓</kbd> Navigate</span>
            <span><kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">↵</kbd> Select</span>
          </div>
          <span className="hidden sm:inline-block font-semibold text-[#0D9488]">Chandra Precision ERP Enterprise Suite</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
