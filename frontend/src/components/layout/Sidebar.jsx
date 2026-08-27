import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Building, CreditCard, ShieldCheck, ShoppingCart,
  Truck, Boxes, Factory, CheckSquare, Users, Compass,
  ChevronDown, ChevronRight, UserCog, ShieldAlert,
  Route as RouteIcon, Sparkles, Store, FileCheck, BarChart3, Share2
} from "lucide-react";
import { cx } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";

const MODULE_NAV = [
  
  {
    id: "dashboard",
    title: "Executive Dashboard",
    icon: LayoutDashboard,
    path: "/app/dashboard?tab=overview",
    subItems: [
      { title: "Overview & Financial KPIs", path: "/app/dashboard?tab=overview" },
      { title: "Shop Floor & Production Snapshot", path: "/app/dashboard?tab=operations" },
      { title: "Approvals & Risk Alerts Center", path: "/app/dashboard?tab=approvals" },
      { title: "Live Operations Telemetry Feed", path: "/app/dashboard?tab=livefeed" },
      { title: "Cross-Industry KPI Switcher", path: "/app/dashboard?tab=kpiswitcher" },
    ]
  },

  
  {
    id: "masters",
    title: "Master Data Hub",
    icon: Building,
    path: "/app/masters?tab=company",
    subItems: [
      { title: "Company Profile, Plants & Branches", path: "/app/masters?tab=company" },
      { title: "Business Partner Golden Records", path: "/app/masters?tab=partners" },
      { title: "Product & Item Catalog", path: "/app/masters?tab=products" },
      { title: "Price Lists & UOM Rate Cards", path: "/app/masters?tab=pricelists" },
      { title: "Document Number Series", path: "/app/masters?tab=series" },
      { title: "Chart of Accounts Templates", path: "/app/masters?tab=coarules" },
      { title: "Multi-Language & Localization Framework", path: "/app/masters?tab=localization" },
      { title: "Country-Specific Statutory Templates", path: "/app/masters?tab=statutorytemplates" },
    ]
  },

  
  {
    id: "access",
    title: "User & Access Management",
    icon: UserCog,
    path: "/app/access?tab=matrix",
    subItems: [
      { title: "Role-Based Access (RBAC) Matrix", path: "/app/access?tab=matrix" },
      { title: "User Identity & MFA Directory", path: "/app/access?tab=users" },
      { title: "Cryptographic Security Audit Trail", path: "/app/access?tab=audit" },
      { title: "Session & Device Management", path: "/app/access?tab=sessions" },
      { title: "Data Privacy & GDPR/Local Data Protection Controls", path: "/app/access?tab=privacy" },
    ]
  },

  
  {
    id: "sales",
    title: "Sales, Customer & Service Management",
    icon: ShoppingCart,
    path: "/app/sales?tab=orders",
    subItems: [
      { title: "Sales Order Execution Pipeline", path: "/app/sales?tab=orders" },
      { title: "Customer Directory & Credit Health", path: "/app/sales?tab=customers" },
      { title: "Inward Collections & Receipts", path: "/app/sales?tab=payments" },
      { title: "CRM Opportunities & Service Hub", path: "/app/sales?tab=crm" },
      { title: "Quotation & Proposal Builder", path: "/app/sales?tab=quotations" },
      { title: "Returns, Refunds & Credit Note Management", path: "/app/sales?tab=returns" },
    ]
  },

  
  {
    id: "procurement",
    title: "Procurement, Sourcing & Trading",
    icon: Truck,
    path: "/app/procurement?tab=orders",
    subItems: [
      { title: "PO Line Costing Matrix", path: "/app/procurement?tab=orders" },
      { title: "Supplier Scorecards & ESG Ratings", path: "/app/procurement?tab=suppliers" },
      { title: "Multi-Vendor RFx Bid Comparison", path: "/app/procurement?tab=rfx" },
      { title: "Supply Contracts & VMI Consignments", path: "/app/procurement?tab=contracts" },
      { title: "Trading & Distribution", path: "/app/procurement?tab=trading" },
      { title: "Import/Export Documentation", path: "/app/procurement?tab=trade-docs" },
    ]
  },

  
  {
    id: "inventory",
    title: "Inventory & Warehouse",
    icon: Boxes,
    path: "/app/inventory?tab=stock",
    subItems: [
      { title: "Perpetual Stock Balances & Buffers", path: "/app/inventory?tab=stock" },
      { title: "2D Warehouse Bay & Racking Matrix", path: "/app/inventory?tab=layout" },
      { title: "Floor Tablet Picking Console", path: "/app/inventory?tab=picking" },
      { title: "Heat Lot Traceability & Genealogies", path: "/app/inventory?tab=batch" },
      { title: "Batch/Serial/Expiry Tracking", path: "/app/inventory?tab=expiry" },
      { title: "Cycle Counting & Stock Audit", path: "/app/inventory?tab=cyclecount" },
    ]
  },

  
  {
    id: "manufacturing",
    title: "Manufacturing Execution & Engineering",
    icon: Factory,
    path: "/app/manufacturing?tab=bom",
    subItems: [
      { title: "Multi-Level BOM Engineering", path: "/app/manufacturing?tab=bom" },
      { title: "Work Order Schedules & Routing", path: "/app/manufacturing?tab=workorders" },
      { title: "Work Centers & OEE Load Telemetry", path: "/app/manufacturing?tab=capacity" },
      { title: "Engineering Change Management (ECN/ECO)", path: "/app/manufacturing?tab=ecn" },
      { title: "Standard Costing & Variance Analysis", path: "/app/manufacturing?tab=variance" },
      { title: "Shop Floor Data Collection", path: "/app/manufacturing?tab=shopfloor" },
    ]
  },

  
  {
    id: "quality",
    title: "Quality Assurance & Calibration",
    icon: CheckSquare,
    path: "/app/quality?tab=inspections",
    subItems: [
      { title: "Digital QC Metrology Checklist", path: "/app/quality?tab=inspections" },
      { title: "Defect Matrix & Rejection Pareto", path: "/app/quality?tab=defects" },
      { title: "IATF NCR & 8D CAPA Action Plans", path: "/app/quality?tab=ncr" },
      { title: "SOP Document Control Hub", path: "/app/quality?tab=sop" },
      { title: "Calibration Management", path: "/app/quality?tab=calibration" },
      { title: "Supplier Quality Audits", path: "/app/quality?tab=supplier-audits" },
    ]
  },

  
  {
    id: "logistics",
    title: "Logistics & Transport",
    icon: Compass,
    path: "/app/logistics?tab=schedules",
    subItems: [
      { title: "Daily Dispatch Schedules & E-Way Bills", path: "/app/logistics?tab=schedules" },
      { title: "Carrier Live Tracking & OTIF Scores", path: "/app/logistics?tab=tracking" },
      { title: "Fleet Telematics & Mileage Logs", path: "/app/logistics?tab=fleet" },
      { title: "Freight Audit & 3-Way Settlement", path: "/app/logistics?tab=freight" },
      { title: "Fleet Maintenance Scheduling", path: "/app/logistics?tab=maintenance" },
    ]
  },

  
  {
    id: "projects",
    title: "Project, Program & Service Billing",
    icon: RouteIcon,
    path: "/app/projects?tab=portfolio",
    subItems: [
      { title: "Project Portfolio & WBS Workspaces", path: "/app/projects?tab=portfolio" },
      { title: "Deliverable Milestones & Timesheets", path: "/app/projects?tab=resources" },
      { title: "EVM Cost Control & Risk Register", path: "/app/projects?tab=budget" },
      { title: "Service/Project Billing", path: "/app/projects?tab=billing" },
      { title: "Construction/EPC", path: "/app/projects?tab=epc" },
      { title: "Resource & Capacity Planning", path: "/app/projects?tab=capacity" },
    ]
  },

  
  {
    id: "retail",
    title: "Retail, POS & Digital Commerce",
    icon: Store,
    path: "/app/retail?tab=pos",
    subItems: [
      { title: "Point-of-Sale", path: "/app/retail?tab=pos" },
      { title: "Store Management", path: "/app/retail?tab=stores" },
      { title: "Omnichannel Inventory", path: "/app/retail?tab=omnichannel" },
      { title: "Subscription & Recurring Billing", path: "/app/retail?tab=subscriptions" },
      { title: "E-commerce/Marketplace Integration", path: "/app/retail?tab=ecommerce" },
      { title: "Loyalty & Promotions Engine", path: "/app/retail?tab=loyalty" },
    ]
  },

  
  {
    id: "assets",
    title: "Asset Management",
    icon: Building,
    path: "/app/assets?tab=registry",
    subItems: [
      { title: "Capital Equipment & Machine Registry", path: "/app/assets?tab=registry" },
      { title: "Preventive & Breakdown Maintenance", path: "/app/assets?tab=maintenance" },
      { title: "Real Estate Leases & Asset Insurance", path: "/app/assets?tab=realestate" },
      { title: "Fixed Asset Lifecycle", path: "/app/assets?tab=lifecycle" },
    ]
  },

  
  {
    id: "hr",
    title: "HR, Payroll & Talent Development",
    icon: Users,
    path: "/app/hr?tab=employees",
    subItems: [
      { title: "Personnel Directory & Shift Rosters", path: "/app/hr?tab=employees" },
      { title: "Daily Biometric Shift Attendance", path: "/app/hr?tab=attendance" },
      { title: "Monthly Payroll & Statutory Breakdown", path: "/app/hr?tab=payroll" },
      { title: "Job Requisitions & 360 Appraisals", path: "/app/hr?tab=talent" },
      { title: "Training & Skills Matrix / LMS", path: "/app/hr?tab=training" },
      { title: "Employee Self-Service Portal", path: "/app/hr?tab=portal" },
    ]
  },

  
  {
    id: "accounts",
    title: "Financial Accounts, Treasury & Planning",
    icon: CreditCard,
    path: "/app/accounts/voucher-entry",
    subItems: [
      { title: "Voucher Entry Console (F4-F9)", path: "/app/accounts/voucher-entry" },
      { title: "Day Book & Transaction Journal", path: "/app/accounts/day-book" },
      { title: "Trial Balance & Ledger Accounts", path: "/app/accounts/trial-balance" },
      { title: "Profit & Loss Statement", path: "/app/accounts/profit-loss" },
      { title: "Balance Sheet Summary", path: "/app/accounts/balance-sheet" },
      { title: "Banking, BRS & Loan Schedules", path: "/app/accounts/banking" },
      { title: "Budgeting & FP&A", path: "/app/accounts/budgeting" },
      { title: "Treasury & Cash Flow Forecasting", path: "/app/accounts/treasury" },
      { title: "Fixed Asset Depreciation (WDV/SLM)", path: "/app/accounts/depreciation" },
      { title: "Multi-Currency & Forex Revaluation", path: "/app/accounts/forex" },
      { title: "Cost Center & Profit Center Accounting", path: "/app/accounts/cost-centers" },
    ]
  },

  
  {
    id: "taxation",
    title: "Taxation & GST/VAT Compliance",
    icon: ShieldCheck,
    path: "/app/taxation?tab=gstr1",
    subItems: [
      { title: "GSTR-1 Outward Supplies & Returns", path: "/app/taxation?tab=gstr1" },
      { title: "GSTR-3B Summary & Tax Settlement", path: "/app/taxation?tab=gstr3b" },
      { title: "E-Invoicing & Signed QR Dispatch", path: "/app/taxation?tab=einvoice" },
      { title: "HSN/SAC Rates & Tax Master", path: "/app/taxation?tab=hsn" },
      { title: "ITC Reconciliation & TDS", path: "/app/taxation?tab=itc" },
      { title: "Statutory Compliance Calendar", path: "/app/taxation?tab=audit" },
      { title: "Global Tax Engine", path: "/app/taxation?tab=globaltax" },
    ]
  },

  
  {
    id: "compliance",
    title: "Global Trade, Compliance & Consolidation",
    icon: ShieldAlert,
    path: "/app/compliance?tab=mca",
    subItems: [
      { title: "MCA Rule 3(1) Audit Trail", path: "/app/compliance?tab=mca" },
      { title: "EHS Incident Logs & SDS Protocols", path: "/app/compliance?tab=ehs" },
      { title: "Global Trade Licenses & Screening", path: "/app/compliance?tab=trade" },
      { title: "Carbon Footprint & Statutory Audits", path: "/app/compliance?tab=audit" },
      { title: "Multi-Company & Multi-Entity Consolidation", path: "/app/compliance?tab=consolidation" },
      { title: "Regulatory Filing Calendar", path: "/app/compliance?tab=calendar" },
    ]
  },

  
  {
    id: "documents",
    title: "Document, Workflow & Contract Management",
    icon: FileCheck,
    path: "/app/documents?tab=dms",
    subItems: [
      { title: "Document Management System (DMS)", path: "/app/documents?tab=dms" },
      { title: "Configurable Workflow & Approval Engine", path: "/app/documents?tab=workflows" },
      { title: "Contract Lifecycle Management", path: "/app/documents?tab=contracts" },
      { title: "E-Signature Integration", path: "/app/documents?tab=esign" },
    ]
  },

  
  {
    id: "bi",
    title: "Business Intelligence & Reporting",
    icon: BarChart3,
    path: "/app/bi?tab=builder",
    subItems: [
      { title: "Custom Report Builder", path: "/app/bi?tab=builder" },
      { title: "Cross-Module Analytics", path: "/app/bi?tab=analytics" },
      { title: "Scheduled Report Distribution", path: "/app/bi?tab=distribution" },
    ]
  },

  
  {
    id: "ai",
    title: "AI Assistant & Operations",
    icon: Sparkles,
    path: "/app/ai?tab=copilot",
    subItems: [
      { title: "Neural Operations Copilot", path: "/app/ai?tab=copilot" },
      { title: "Vendor Bill OCR Deep Parser", path: "/app/ai?tab=ocr" },
      { title: "Strategic Enterprise Insights", path: "/app/ai?tab=insights" },
      { title: "Predictive Demand & Inventory Forecasting", path: "/app/ai?tab=forecasting" },
    ]
  },

  
  {
    id: "integrations",
    title: "API & Integration Hub",
    icon: Share2,
    path: "/app/integrations?tab=banking",
    subItems: [
      { title: "Bank Integrations", path: "/app/integrations?tab=banking" },
      { title: "E-commerce/Marketplace Connectors", path: "/app/integrations?tab=connectors" },
      { title: "Third-Party System Integrations", path: "/app/integrations?tab=thirdparty" },
      { title: "Webhook & Event Streaming Framework", path: "/app/integrations?tab=webhooks" },
    ]
  }
];

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const location = useLocation();
  const { isSuperAdmin } = useAuth();
  const [openModuleId, setOpenModuleId] = useState(() => {
    const currentPath = location.pathname;
    const matched = MODULE_NAV.find((m) => currentPath.startsWith(m.path.split("?")[0]));
    return matched ? matched.id : "dashboard";
  });

  useEffect(() => {
    const currentPath = location.pathname;
    const matched = MODULE_NAV.find((m) => currentPath === m.path.split("?")[0] || currentPath.startsWith(m.path.split("?")[0] + "/"));
    if (matched) {
      setOpenModuleId(matched.id);
    }
  }, [location.pathname]);

  const toggleModule = (id) => {
    setOpenModuleId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      
      <aside
        className={cx(
          "flex flex-col border-r border-slate-200 bg-white transition-all duration-300 z-50",
          "fixed inset-y-0 left-0 lg:static",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 bg-white flex-shrink-0">
          <Link to="/app/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-slate-900 border border-slate-800 text-white flex items-center justify-center flex-shrink-0 shadow-sm font-black text-sm">
              CP
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight text-slate-900 truncate">Chandra Precision</p>
                <p className="text-[10px] text-[#0D9488] font-bold uppercase tracking-wider">Enterprise ERP</p>
              </div>
            )}
          </Link>
        </div>

        
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-200">
          {MODULE_NAV.map((mod) => {
            const Icon = mod.icon;
            const hasSub = mod.subItems && mod.subItems.length > 0;
            const isOpen = openModuleId === mod.id;
            const currentFullUrl = location.pathname + (location.search || "");
            const modBasePath = mod.path.split("?")[0];
            const isActive = location.pathname === modBasePath || location.pathname.startsWith(modBasePath + "/");

            return (
              <div key={mod.id} className="space-y-0.5">
                {hasSub && !collapsed ? (
                  <div
                    className={cx(
                      "w-full flex items-center justify-between rounded-xl text-xs font-semibold transition-all group",
                      isActive
                        ? "bg-teal-50/80 text-[#0F766E] shadow-xs border-l-2 border-[#0D9488]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Link
                      to={mod.path}
                      onClick={() => {
                        setOpenModuleId(mod.id);
                        onCloseMobile?.();
                      }}
                      className="flex-1 flex items-center gap-2.5 px-3 py-2 min-w-0 text-left cursor-pointer"
                      title={mod.title}
                    >
                      <Icon className={cx("h-4 w-4 flex-shrink-0", isActive ? "text-[#0D9488]" : "text-slate-500")} />
                      <span className="truncate">{mod.title}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleModule(mod.id);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg mr-1 cursor-pointer transition-colors"
                      title={isOpen ? "Collapse submenu" : "Expand submenu"}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <Link
                    to={mod.path}
                    onClick={onCloseMobile}
                    className={cx(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                      isActive
                        ? "bg-teal-50/80 text-[#0F766E] shadow-xs border-l-2 border-[#0D9488]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                    title={mod.title}
                  >
                    <Icon className={cx("h-4 w-4 flex-shrink-0", isActive ? "text-[#0D9488]" : "text-slate-500")} />
                    {!collapsed && <span className="truncate">{mod.title}</span>}
                  </Link>
                )}

                
                {hasSub && isOpen && !collapsed && (
                  <div className="pl-6 pr-1 space-y-0.5 border-l border-slate-200 ml-4 py-1">
                    {mod.subItems.map((sub, sIdx) => {
                      const isSubActive =
                        currentFullUrl === sub.path ||
                        (location.pathname === modBasePath && !location.search && sub.path.includes("tab="));
                      return (
                        <Link
                          key={sIdx}
                          to={sub.path}
                          onClick={onCloseMobile}
                          className={cx(
                            "block px-2.5 py-1.5 rounded-lg text-xs transition-colors truncate",
                            isSubActive
                              ? "bg-teal-50 text-[#0F766E] font-bold"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium"
                          )}
                        >
                          {sub.title}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
