import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Banknote, Receipt, TrendingUp, TrendingDown,
  ArrowRight, LayoutDashboard, Truck, Building2,
  Users, Factory, AlertTriangle, CheckCircle, XCircle, Clock,
  Calendar, Filter, Bell, ShoppingCart, Boxes, ShieldCheck,
  Check, X, ChevronRight, Eye, RefreshCw, Send, AlertCircle, Sparkles, Activity,
  Layers, Gauge, CheckSquare, Zap, FileText, ArrowUpRight, Cpu, Wrench
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend
} from "recharts";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { masterService } from "../services/masterService";
import { fmtMoney, cx } from "../utils/format";
import { toast } from "react-hot-toast";

export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const { data } = useAppData();
  const { user } = useAuth();
  const navigate = useNavigate();

  
  const activeTab = searchParams.get("tab") || "overview";

  const [dateRange, setDateRange] = useState("ytd");
  const [showRevenue, setShowRevenue] = useState(true);
  const [showExpense, setShowExpense] = useState(true);
  const [loading, setLoading] = useState(false);

  
  const [metrics, setMetrics] = useState({
    kpis: {
      totalSales: 4850000,
      totalPurchases: 3310000,
      cashInBank: 2450000,
      totalReceivables: 600000,
      totalPayables: 420000,
      inventoryValue: 1280000,
    },
    monthlyTrend: [
      { month: "Apr", revenue: 38.5, expense: 29.2 },
      { month: "May", revenue: 42.1, expense: 31.0 },
      { month: "Jun", revenue: 45.8, expense: 32.4 },
      { month: "Jul", revenue: 51.2, expense: 34.8 },
      { month: "Aug", revenue: 48.5, expense: 33.1 },
      { month: "Sep", revenue: 55.0, expense: 36.0 },
    ],
    productionStatus: {
      inQueue: 4,
      inProgress: 6,
      completedToday: 2,
      totalWorkOrders: 12,
    },
    topProducts: [],
    topCustomers: [],
    workCenters: [],
  });

  
  const [approvals, setApprovals] = useState([
    { id: "APP-01", type: "Purchase Order", ref: "PO-2026-0042", requester: "Suresh Patil (Procurement)", amount: 84500, date: "2026-08-23", status: "Pending", desc: "Raw Material Steel Bars SS316", urgency: "High" },
    { id: "APP-02", type: "Leave Request", ref: "LV-EMP003", requester: "Ramesh Shinde (CNC Shop)", amount: null, date: "2026-08-24", status: "Pending", desc: "3 Days Medical Leave", urgency: "Normal" },
    { id: "APP-03", type: "Expense Claim", ref: "EXP-088", requester: "Pooja Kulkarni (Sales)", amount: 14200, date: "2026-08-22", status: "Pending", desc: "Client Visit Travel Reimbursement", urgency: "Normal" },
    { id: "APP-04", type: "Special Discount", ref: "SO-2026-0089", requester: "Vikas Deshmukh (Sales Lead)", amount: 25000, date: "2026-08-24", status: "Pending", desc: "5% Additional Volume Discount", urgency: "High" },
  ]);

  
  const [overdueInvoices, setOverdueInvoices] = useState([
    { id: "INV-2026-0012", customer: "Tata Motors Precision Div", amount: 320000, daysOverdue: 18, dueDate: "2026-08-06", risk: "Medium" },
    { id: "INV-2026-0019", customer: "Bharat Forge Component Unit", amount: 185000, daysOverdue: 34, dueDate: "2026-07-21", risk: "High" },
    { id: "INV-2026-0025", customer: "Thermax Energy Systems", amount: 95000, daysOverdue: 8, dueDate: "2026-08-16", risk: "Low" },
  ]);

  
  const [lowStockItems, setLowStockItems] = useState([
    { id: "PRD-RAW-001", code: "RAW-SS316-50", name: "Stainless Steel Round Bar SS316 50mm", currentStock: 12, reorderLevel: 50, uom: "KGS", warehouse: "Main Raw Material Store", leadTime: "3 Days" },
    { id: "PRD-RAW-002", code: "RAW-EN8-30", name: "Medium Carbon Steel Rod EN8 30mm", currentStock: 8, reorderLevel: 40, uom: "PCS", warehouse: "Pune Plant 1 Store", leadTime: "2 Days" },
    { id: "PRD-TOOL-003", code: "TOOL-CNMG-12", name: "CNC Carbide Turning Inserts CNMG", currentStock: 4, reorderLevel: 25, uom: "BOX", warehouse: "Tooling Crib", leadTime: "1 Day" },
  ]);

  
  const [activityFeed, setActivityFeed] = useState([
    { id: 1, mod: "Sales", icon: ShoppingCart, title: "Sales Order SO-2026-0034 Confirmed", sub: "Tata Motors Precision Div · ₹4,80,000", time: "10 mins ago", color: "text-blue-600 bg-blue-50 border-blue-200" },
    { id: 2, mod: "Manufacturing", icon: Factory, title: "Work Order WO-2026-0018 Completed", sub: "150 PCS Precision CNC Shaft · Line 1", time: "25 mins ago", color: "text-amber-600 bg-amber-50 border-amber-200" },
    { id: 3, mod: "Quality", icon: ShieldCheck, title: "Incoming Inspection Lot #44 Passed", sub: "Zero defects tagged · Vendor SAIL", time: "1 hour ago", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { id: 4, mod: "Finance", icon: Receipt, title: "GSTR-1 Outward Supply Invoices Filed", sub: "38 E-Invoices verified with NIC IRN", time: "2 hours ago", color: "text-purple-600 bg-purple-50 border-purple-200" },
    { id: 5, mod: "Procurement", icon: Truck, title: "PO-2026-0039 Goods Received (GRN)", sub: "1,000 KGS Steel Bars · Bay B Bin 01", time: "3 hours ago", color: "text-teal-600 bg-teal-50 border-teal-200" },
  ]);

  
  const machineCells = [
    { name: "CNC Turning Cell 1 (Mazak QT250)", load: 92, operator: "Santosh Mane", part: "Transmission Shaft 45mm", status: "Running", temp: "42°C", rpm: 2800, oee: "89.2%" },
    { name: "CNC Turning Cell 2 (Doosan Puma)", load: 84, operator: "Deepak Shinde", part: "Flange Bushing EN8", status: "Running", temp: "38°C", rpm: 2400, oee: "86.5%" },
    { name: "4-Axis VMC Center (Haas VF-2)", load: 78, operator: "Vikas Kadam", part: "Rotor Housing Unit", status: "Running", temp: "45°C", rpm: 6200, oee: "84.1%" },
    { name: "Cylindrical Grinding Cell", load: 0, operator: "Maintenance", part: "Tool Offsets Calibration", status: "Setup", temp: "28°C", rpm: 0, oee: "72.0%" },
  ];

  const fetchLiveDashboard = async () => {
    setLoading(true);
    try {
      const [kpiRes, prodRes, invRes, auditRes] = await Promise.allSettled([
        masterService.getDashboardMetrics(),
        masterService.getProducts(),
        masterService.getSalesInvoices(),
        masterService.getAuditTrail(),
      ]);

      if (kpiRes.status === "fulfilled" && kpiRes.value.data?.success) {
        setMetrics(kpiRes.value.data.data);
      }

      if (prodRes.status === "fulfilled" && prodRes.value.data?.success) {
        const prods = prodRes.value.data.data || [];
        const low = prods.filter(p => Number(p.current_stock) <= Number(p.reorder_level));
        if (low.length > 0) {
          setLowStockItems(low.map(p => ({
            id: p.product_id,
            code: p.product_code,
            name: p.product_name,
            currentStock: Number(p.current_stock || 0),
            reorderLevel: Number(p.reorder_level || 50),
            uom: p.uom_name || "PCS",
            warehouse: "Pune Plant 1 Store",
            leadTime: "3 Days"
          })));
        }
      }

      if (invRes.status === "fulfilled" && invRes.value.data?.success) {
        const invoices = invRes.value.data.data || [];
        const unpaid = invoices.filter(inv => Number(inv.balance_amount || inv.grand_total || 0) > 0);
        if (unpaid.length > 0) {
          setOverdueInvoices(unpaid.slice(0, 5).map(inv => ({
            id: inv.invoice_number || `INV-${inv.invoice_id}`,
            customer: inv.customer_name || "Commercial Customer",
            amount: Number(inv.balance_amount || inv.grand_total || 0),
            daysOverdue: 14,
            dueDate: inv.due_date || inv.invoice_date || "2026-09-01",
            risk: "Medium"
          })));
        }
      }

      if (auditRes.status === "fulfilled" && auditRes.value.data?.success) {
        const logs = auditRes.value.data.data || [];
        if (logs.length > 0) {
          setActivityFeed(logs.slice(0, 5).map((l, idx) => ({
            id: l.log_id || idx,
            mod: l.table_name || "Audit",
            icon: ShieldCheck,
            title: `${l.action} on ${l.table_name} (#${l.record_id})`,
            sub: `By ${l.changed_by} · State verified`,
            time: new Date(l.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            color: "text-teal-600 bg-teal-50 border-teal-200"
          })));
        }
      }
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveDashboard();
  }, []);

  const handleApprove = (id, ref) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    toast.success(`Approved ${ref}`);
  };

  const handleReject = (id, ref) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    toast.error(`Rejected ${ref}`);
  };

  const sectionTitles = {
    overview: {
      tag: "Executive Control Center",
      title: "Overview & Financial KPIs",
      sub: "Real-time revenue metrics, liquidity, cash flow dynamics, and financial targets.",
    },
    operations: {
      tag: "Shop Floor Telemetry",
      title: "Shop Floor & Production Snapshot",
      sub: "Active CNC cells, spindle load telemetry, work-in-progress, and safety buffers.",
    },
    approvals: {
      tag: "Governance & Risk",
      title: "Approvals & Risk Alerts Center",
      sub: "Pending authorizations, overdue customer receivables, and cashflow risk alerts.",
    },
    livefeed: {
      tag: "Telemetry Stream",
      title: "Live Operations Telemetry Feed",
      sub: "Real-time industrial IoT and transaction audit log stream across enterprise modules.",
    },
    kpiswitcher: {
      tag: "Industry Intelligence",
      title: "Cross-Industry KPI Switcher",
      sub: "Dynamic multi-sector performance radar tailored for Manufacturing, Professional Services, Wholesale Trading, and Retail Commerce.",
    },
  };

  const [selectedIndustry, setSelectedIndustry] = useState("manufacturing"); 

  const currentHeader = sectionTitles[activeTab] || sectionTitles.overview;

  const kpis = metrics.kpis || {};
  const totalSalesVal = kpis.totalSales || 4850000;
  const totalPurchasesVal = kpis.totalPurchases || 3310000;
  const netOperatingVal = totalSalesVal - totalPurchasesVal;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <LayoutDashboard className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs text-[#0D9488] font-bold uppercase tracking-[0.14em]">
                {currentHeader.tag}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                {currentHeader.title}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {currentHeader.sub}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLiveDashboard}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={cx("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh Live Data
            </button>
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry
            </span>
          </div>
        </div>
      </div>

      
      {activeTab === "overview" && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Sales Invoiced</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900 tracking-tight">₹{Number(totalSalesVal || 0).toLocaleString()}</p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold font-mono">
                <span>Direct DB Value</span> <span className="text-slate-400 font-normal">from Sales Invoices</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Purchases</span>
                <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                  <TrendingDown className="h-4 w-4" />
                </span>
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900 tracking-tight">₹{Number(totalPurchasesVal || 0).toLocaleString()}</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                <span className="text-slate-700 font-bold">Purchase Orders</span> <span>recorded</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Net Operating Margin</span>
                <span className="p-2 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-100">
                  <Zap className="h-4 w-4" />
                </span>
              </div>
              <p className="text-2xl font-bold font-mono text-[#0D9488] tracking-tight">₹{Number(netOperatingVal || 0).toLocaleString()}</p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold font-mono">
                <span>{totalSalesVal > 0 ? ((netOperatingVal / totalSalesVal) * 100).toFixed(1) : 0}%</span> <span className="text-slate-400 font-normal">Operating spread</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pending Authorizations</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900 tracking-tight">{approvals.length} Actions</p>
              <div className="flex items-center gap-1.5 text-xs text-amber-700 font-bold font-mono">
                <span>{approvals.filter(a => a.urgency === 'High').length} High Urgency</span> <span className="text-slate-400 font-normal">in queue</span>
              </div>
            </div>
          </div>

          
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Financial Cash Flow & Operating Dynamics</h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">FY 2026-27 Revenue Inflow vs Material & Operating Expenses (₹ Lakhs)</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRevenue(!showRevenue)}
                  className={cx(
                    "px-3 py-1 rounded-lg text-xs font-bold font-mono border transition-all cursor-pointer",
                    showRevenue ? "bg-teal-50 text-[#0F766E] border-teal-200" : "bg-slate-50 text-slate-400 border-slate-200"
                  )}
                >
                  ● Revenue
                </button>
                <button
                  onClick={() => setShowExpense(!showExpense)}
                  className={cx(
                    "px-3 py-1 rounded-lg text-xs font-bold font-mono border transition-all cursor-pointer",
                    showExpense ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-50 text-slate-400 border-slate-200"
                  )}
                >
                  ● Expenses
                </button>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.monthlyTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <RTooltip
                    contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", fontSize: "12px" }}
                    formatter={(val) => [`₹${typeof val === 'number' ? val.toLocaleString() : val}`, ""]}
                  />
                  {showRevenue && (
                    <Area type="monotone" dataKey="revenue" stroke="#0D9488" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" name="Revenue" />
                  )}
                  {showExpense && (
                    <Area type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#expGrad)" name="Expense" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      
      {activeTab === "operations" && (
        <div className="space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">CNC Machine Cells Live Spindle Load & Telemetry</h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Real-time IoT Telemetry across Pune Bhosari Plant 1</p>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-200">
                Avg Plant OEE: 86.4%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {machineCells.map((mc, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cx("h-2.5 w-2.5 rounded-full", mc.status === "Running" ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                      <h3 className="text-xs font-bold text-slate-900">{mc.name}</h3>
                    </div>
                    <span className={cx("text-[10px] font-bold px-2 py-0.5 rounded-full border", mc.status === "Running" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200")}>
                      {mc.status}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-500">Spindle Load:</span>
                      <span className="font-bold text-slate-900">{mc.load}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={cx("h-full rounded-full transition-all duration-500", mc.load > 85 ? "bg-rose-500" : "bg-[#0D9488]")}
                        style={{ width: `${mc.load}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs font-mono text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Temperature</span>
                      <span className="font-bold text-slate-800">{mc.temp}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Speed</span>
                      <span className="font-bold text-slate-800">{mc.rpm} RPM</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Cell OEE</span>
                      <span className="font-bold text-[#0D9488]">{mc.oee}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Critical Raw Material Buffer Alerts</h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Automated Reorder Thresholds & Tooling Crib Shortages</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Item Code / Description</th>
                    <th className="py-2.5 px-4">Warehouse Location</th>
                    <th className="py-2.5 px-4 font-mono text-right">Current Stock</th>
                    <th className="py-2.5 px-4 font-mono text-right">Safety Buffer</th>
                    <th className="py-2.5 px-4">Lead Time</th>
                    <th className="py-2.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[#0D9488] text-[11px] block">{item.code}</span>
                        <span className="font-bold text-slate-900">{item.name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.warehouse}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">{item.currentStock} {item.uom}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{item.reorderLevel} {item.uom}</td>
                      <td className="py-3 px-4 text-slate-600">{item.leadTime}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toast.success(`Automated PO draft created for ${item.code}`)}
                          className="px-2.5 py-1 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                        >
                          Draft PO
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      
      {activeTab === "approvals" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Pending Executive Authorizations</h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">PO Authorizations, Leave Requests, and Special Discounts</p>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                {approvals.length} Pending
              </span>
            </div>

            <div className="space-y-3">
              {approvals.map((app) => (
                <div key={app.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#0D9488]">{app.ref}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200">{app.type}</span>
                      {app.urgency === "High" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">High Urgency</span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900">{app.desc}</p>
                    <p className="text-slate-500 font-mono text-[11px]">Requested by: {app.requester} · {app.date}</p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {app.amount && (
                      <span className="text-sm font-mono font-bold text-slate-900 mr-2">
                        ₹{Number(app.amount || 0).toLocaleString()}
                      </span>
                    )}
                    <button
                      onClick={() => handleApprove(app.id, app.ref)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(app.id, app.ref)}
                      className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Overdue Customer Receivables & Exposure</h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Commercial Collections Requiring Executive Follow-Up</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Invoice No</th>
                    <th className="py-2.5 px-4">Customer Account</th>
                    <th className="py-2.5 px-4 font-mono text-right">Outstanding (₹)</th>
                    <th className="py-2.5 px-4 font-mono">Due Date</th>
                    <th className="py-2.5 px-4 text-center">Overdue Days</th>
                    <th className="py-2.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overdueInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#0D9488]">{inv.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{inv.customer}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">₹{inv.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{inv.dueDate}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-700">{inv.daysOverdue} Days</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toast.success(`Payment reminder dispatch queued for ${inv.customer}`)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                        >
                          Send Notice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      
      
      {activeTab === "kpiswitcher" && (
        <div className="space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Industry Sector Profile</h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Toggle live dashboard perspectives with custom benchmark metrics</p>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                {[
                  { id: "manufacturing", label: "Manufacturing & Engineering", icon: Factory },
                  { id: "services", label: "Professional Services", icon: Users },
                  { id: "trading", label: "Wholesale & Distribution", icon: Truck },
                  { id: "retail", label: "Retail & E-Commerce", icon: ShoppingCart },
                ].map((ind) => {
                  const Icon = ind.icon;
                  const isSel = selectedIndustry === ind.id;
                  return (
                    <button
                      key={ind.id}
                      onClick={() => {
                        setSelectedIndustry(ind.id);
                        toast.success(`Dashboard reconfigured for ${ind.label}`);
                      }}
                      className={cx(
                        "px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                        isSel 
                          ? "bg-white text-[#0F766E] shadow-xs border border-slate-200" 
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <Icon className={cx("h-3.5 w-3.5", isSel ? "text-[#0D9488]" : "text-slate-400")} />
                      {ind.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          
          {selectedIndustry === "manufacturing" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overall Equipment Effectiveness</p>
                  <p className="text-2xl font-black text-slate-900">86.4%</p>
                  <p className="text-xs text-emerald-600 font-semibold">+2.1% vs target (85.0%)</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">First Pass Yield (FPY)</p>
                  <p className="text-2xl font-black text-slate-900">98.8%</p>
                  <p className="text-xs text-emerald-600 font-semibold">Zero critical dimensional defects</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Scrap Rate Value</p>
                  <p className="text-2xl font-black text-slate-900">{fmtMoney(42000)}</p>
                  <p className="text-xs text-emerald-600 font-semibold">0.86% of total material input</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mean Time to Repair (MTTR)</p>
                  <p className="text-2xl font-black text-slate-900">38 mins</p>
                  <p className="text-xs text-teal-600 font-semibold">Preventive PM on schedule</p>
                </div>
              </div>
            </div>
          )}

          {selectedIndustry === "services" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Billable Resource Utilization</p>
                  <p className="text-2xl font-black text-slate-900">82.5%</p>
                  <p className="text-xs text-emerald-600 font-semibold">+4.5% vs service benchmark</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Monthly Retainer Revenue</p>
                  <p className="text-2xl font-black text-slate-900">{fmtMoney(2450000)}</p>
                  <p className="text-xs text-teal-600 font-semibold">18 active SLA client accounts</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Effective Hourly Realization</p>
                  <p className="text-2xl font-black text-slate-900">₹2,850/hr</p>
                  <p className="text-xs text-emerald-600 font-semibold">T&M contracts blended average</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Project Margin Variance</p>
                  <p className="text-2xl font-black text-slate-900">+18.4%</p>
                  <p className="text-xs text-emerald-600 font-semibold">EVM Cost Performance Index: 1.12</p>
                </div>
              </div>
            </div>
          )}

          {selectedIndustry === "trading" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inventory Turnover Velocity</p>
                  <p className="text-2xl font-black text-slate-900">8.4x / Year</p>
                  <p className="text-xs text-emerald-600 font-semibold">Average days to sell: 43 days</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Landed Cost Variance</p>
                  <p className="text-2xl font-black text-slate-900">1.8%</p>
                  <p className="text-xs text-teal-600 font-semibold">Freight & customs accurately absorbed</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Back-to-Back Order Margin</p>
                  <p className="text-2xl font-black text-slate-900">14.2%</p>
                  <p className="text-xs text-emerald-600 font-semibold">Drop-shipping zero holding risk</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Supplier OTIF Fulfillment</p>
                  <p className="text-2xl font-black text-slate-900">97.8%</p>
                  <p className="text-xs text-emerald-600 font-semibold">Lead time SLA compliant</p>
                </div>
              </div>
            </div>
          )}

          {selectedIndustry === "retail" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Same-Store Sales Growth</p>
                  <p className="text-2xl font-black text-slate-900">+14.8% YoY</p>
                  <p className="text-xs text-emerald-600 font-semibold">3 outlets operating</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Basket Value (ABV)</p>
                  <p className="text-2xl font-black text-slate-900">{fmtMoney(3850)}</p>
                  <p className="text-xs text-teal-600 font-semibold">2.8 units per transaction</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Omnichannel Sync Latency</p>
                  <p className="text-2xl font-black text-slate-900">&lt; 15 sec</p>
                  <p className="text-xs text-emerald-600 font-semibold">Shopify & Amazon inventory live</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Loyalty Repeat Purchase</p>
                  <p className="text-2xl font-black text-slate-900">46.2%</p>
                  <p className="text-xs text-emerald-600 font-semibold">Gold Tier accounts retention high</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
