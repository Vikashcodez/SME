import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  BarChart3, LineChart, PieChart, Download, 
  Send, RefreshCw, Plus, Filter, Calendar, 
  Table, Sparkles, CheckCircle2, Mail, MessageSquare, 
  Layers, Clock, ArrowUpRight, TrendingUp, Check, X
} from "lucide-react";
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend 
} from "recharts";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";
import { Button } from "../../../components/ui/Button";

export function BiHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "builder";

  
  const [selectedEntity, setSelectedEntity] = useState("Sales & Invoicing");
  const [selectedGroupBy, setSelectedGroupBy] = useState("Customer Region");
  const [selectedMetric, setSelectedMetric] = useState("Gross Taxable Revenue");
  const [datePeriod, setDatePeriod] = useState("FY 2026-27 (YTD)");

  const reportPreviewData = [
    { dimension: "Maharashtra (Pune & Mumbai)", metricValue: 24500000, volumeCount: 142, marginPct: "24.5%" },
    { dimension: "Karnataka (Bengaluru Tech Corridor)", metricValue: 12800000, volumeCount: 88, marginPct: "26.2%" },
    { dimension: "Gujarat (Ahmedabad & Surat)", metricValue: 9200000, volumeCount: 64, marginPct: "21.8%" },
    { dimension: "Tamil Nadu (Chennai Auto Cluster)", metricValue: 7400000, volumeCount: 52, marginPct: "23.4%" },
  ];

  
  const crossModuleTrend = [
    { month: "Apr", salesRev: 38.5, prodOutput: 36.2, scrapCost: 1.2, otifPct: 96.5 },
    { month: "May", salesRev: 42.1, prodOutput: 40.8, scrapCost: 0.9, otifPct: 97.2 },
    { month: "Jun", salesRev: 45.8, prodOutput: 44.5, scrapCost: 1.1, otifPct: 95.8 },
    { month: "Jul", salesRev: 51.2, prodOutput: 49.0, scrapCost: 0.8, otifPct: 98.4 },
    { month: "Aug", salesRev: 48.5, prodOutput: 47.6, scrapCost: 0.7, otifPct: 98.9 },
    { month: "Sep", salesRev: 55.0, prodOutput: 53.2, scrapCost: 0.6, otifPct: 99.2 },
  ];

  
  const [schedules, setSchedules] = useState([
    { id: "SCH-01", name: "Daily Executive Financial Flash Report", channel: "Email & Slack #exec-leadership", frequency: "Daily at 08:30 AM", recipients: "Board of Directors, MD, CFO", lastSent: "Today, 08:30 AM", status: "Active Scheduled" },
    { id: "SCH-02", name: "Weekly Shop Floor OEE & Scrap Variance", channel: "Microsoft Teams (Mfg Operations)", frequency: "Mondays at 07:00 AM", recipients: "Plant Heads, QC Leads, Supervisors", lastSent: "Aug 24, 07:00 AM", status: "Active Scheduled" },
    { id: "SCH-03", name: "Monthly Statutory Tax Reconciliation Pack", channel: "Encrypted Email PDF", frequency: "1st of Month at 09:00 AM", recipients: "Statutory Auditors, Tax Consultants", lastSent: "Aug 01, 09:00 AM", status: "Active Scheduled" },
    { id: "SCH-04", name: "Supplier OTIF & Quality Yield Scorecard", channel: "Automated Vendor Portal Digest", frequency: "Bi-Weekly", recipients: "Tier 1 Strategic Suppliers", lastSent: "Aug 15, 10:00 AM", status: "Active Scheduled" },
  ]);

  const headersMap = {
    builder: {
      tag: "Ad-Hoc Intelligence",
      title: "Custom Multi-Dimensional Report Builder",
      sub: "Drag-and-drop query generator across GL ledgers, production batches, sales pipeline, and procurement costing.",
    },
    analytics: {
      tag: "Executive Insights",
      title: "Cross-Module Enterprise Analytics",
      sub: "Unified correlated radar spanning sales revenue, machine OEE load, scrap costs, and OTIF logistics performance.",
    },
    distribution: {
      tag: "Automated Broadcasting",
      title: "Scheduled Report Distribution Engine",
      sub: "Automated email PDF, Microsoft Teams webhook, and Slack digest broadcasters with role-based data masking.",
    },
  };

  const currentHeader = headersMap[activeTab] || headersMap.builder;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <BarChart3 className="h-6 w-6" strokeWidth={1.75} />
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
        </div>
      </div>

      
      {activeTab === "builder" && (
        <div className="space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              Query Parameters & Aggregation Dimensions
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Data Source Entity</label>
                <select 
                  value={selectedEntity} 
                  onChange={(e) => setSelectedEntity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:ring-1 focus:ring-[#0D9488] outline-none"
                >
                  <option>Sales & Invoicing</option>
                  <option>Procurement & Vendor POs</option>
                  <option>Shop Floor Production (MES)</option>
                  <option>Inventory & Bay Stock</option>
                  <option>Financial GL & Cost Centers</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Group By Dimension</label>
                <select 
                  value={selectedGroupBy} 
                  onChange={(e) => setSelectedGroupBy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:ring-1 focus:ring-[#0D9488] outline-none"
                >
                  <option>Customer Region</option>
                  <option>Product Category</option>
                  <option>Work Center Cell</option>
                  <option>Supplier Rating</option>
                  <option>Month / Fiscal Quarter</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Aggregated Value Metric</label>
                <select 
                  value={selectedMetric} 
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:ring-1 focus:ring-[#0D9488] outline-none"
                >
                  <option>Gross Taxable Revenue</option>
                  <option>Total Invoiced Quantity</option>
                  <option>Average Profit Margin %</option>
                  <option>Lead Time Fulfillment Days</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Reporting Time Horizon</label>
                <select 
                  value={datePeriod} 
                  onChange={(e) => setDatePeriod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:ring-1 focus:ring-[#0D9488] outline-none"
                >
                  <option>FY 2026-27 (YTD)</option>
                  <option>Current Quarter (Q2 2026)</option>
                  <option>Trailing 12 Months (TTM)</option>
                  <option>Custom Date Range</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => toast.success("Exported custom report to Excel!")}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" /> Export Excel
              </button>
              <button 
                onClick={() => toast.success("Query executed in 42ms. 4 records matched.")}
                className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Execute & Render Report
              </button>
            </div>
          </div>

          
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Dynamic Pivot Result Set ({selectedEntity} grouped by {selectedGroupBy})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">{selectedGroupBy}</th>
                    <th className="py-2.5 px-3 text-right">Transaction Volume</th>
                    <th className="py-2.5 px-3 text-right">Gross Total Value</th>
                    <th className="py-2.5 px-3 text-right">Average Margin</th>
                    <th className="py-2.5 px-3 text-center">Data Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {reportPreviewData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">{row.dimension}</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-700">{row.volumeCount} Orders</td>
                      <td className="py-3 px-3 text-right font-black text-[#0D9488]">{fmtMoney(row.metricValue)}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">{row.marginPct}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded font-mono font-bold text-[10px]">
                          {Math.round((row.metricValue / 53900000) * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Cross-Functional Enterprise Telemetry Radar
                </h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">
                  Monthly Revenue (₹ Lakhs) vs Production Output (₹ Lakhs) vs OTIF Fulfillment (%)
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={crossModuleTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} />
                  <RTooltip />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Area type="monotone" dataKey="salesRev" name="Commercial Sales Revenue (₹ Lakhs)" stroke="#0D9488" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                  <Area type="monotone" dataKey="prodOutput" name="Shop Floor Machined Output (₹ Lakhs)" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#prodGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      
      {activeTab === "distribution" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Scheduled Report Dispatches</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Automated delivery across Email, Slack, Teams, and Executive Portals</p>
            </div>
            <button 
              onClick={() => toast.success("New report dispatch schedule registered")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Dispatch Schedule
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Schedule Name</th>
                  <th className="py-2.5 px-3">Delivery Channel</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">Target Audience</th>
                  <th className="py-2.5 px-3">Last Sent</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {schedules.map((sch) => (
                  <tr key={sch.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{sch.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{sch.id}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{sch.channel}</td>
                    <td className="py-3 px-3 text-slate-600">{sch.frequency}</td>
                    <td className="py-3 px-3 text-slate-700">{sch.recipients}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{sch.lastSent}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        {sch.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default BiHubPage;
