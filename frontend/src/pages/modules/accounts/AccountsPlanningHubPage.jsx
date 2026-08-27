import { useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { 
  CreditCard, TrendingUp, Calculator, DollarSign, 
  Layers, ArrowRight, RefreshCw, Plus, CheckCircle2, 
  AlertTriangle, PieChart, Landmark, Scale, Calendar, Download
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RTooltip, ResponsiveContainer, Legend 
} from "recharts";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";
import { Button } from "../../../components/ui/Button";

export function AccountsPlanningHubPage({ forcedTab }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  
  let activeTab = forcedTab || searchParams.get("tab");
  if (!activeTab) {
    if (location.pathname.includes("budgeting")) activeTab = "budgeting";
    else if (location.pathname.includes("treasury")) activeTab = "treasury";
    else if (location.pathname.includes("depreciation")) activeTab = "depreciation";
    else if (location.pathname.includes("forex")) activeTab = "forex";
    else if (location.pathname.includes("cost-centers")) activeTab = "cost-centers";
    else activeTab = "budgeting";
  }

  
  const [budgets, setBudgets] = useState([
    { dept: "Manufacturing & Production", allocated: 15000000, actual: 13800000, variance: -1200000, status: "Under Budget (Favorable)", forecastNextQtr: 16200000 },
    { dept: "Raw Material Procurement", allocated: 22000000, actual: 23100000, variance: 1100000, status: "Over Budget (Unfavorable)", forecastNextQtr: 24000000 },
    { dept: "Sales & Marketing", allocated: 4500000, actual: 3900000, variance: -600000, status: "Under Budget (Favorable)", forecastNextQtr: 4800000 },
    { dept: "Logistics & Transport Dispatch", allocated: 3800000, actual: 3650000, variance: -150000, status: "Under Budget (Favorable)", forecastNextQtr: 4000000 },
    { dept: "R&D & Precision Engineering", allocated: 2500000, actual: 2400000, variance: -100000, status: "Under Budget (Favorable)", forecastNextQtr: 2800000 },
  ]);

  
  const cashFlowForecast = [
    { period: "Sep 2026", inflow: 5800000, outflow: 4200000, netCash: 1600000, bankBalance: 26100000 },
    { period: "Oct 2026", inflow: 6200000, outflow: 4500000, netCash: 1700000, bankBalance: 27800000 },
    { period: "Nov 2026", inflow: 6800000, outflow: 4900000, netCash: 1900000, bankBalance: 29700000 },
    { period: "Dec 2026", inflow: 7400000, outflow: 5100000, netCash: 2300000, bankBalance: 32000000 },
  ];

  
  const [depreciations, setDepreciations] = useState([
    { assetId: "AST-CNC-001", name: "Mazak QuickTurn 250 CNC Lathe", cost: 4500000, method: "WDV (Written Down Value)", rate: "15%", openingWdv: 3825000, depCurrentYear: 573750, closingWdv: 3251250 },
    { assetId: "AST-VMC-002", name: "Haas VF-2 4-Axis Machining Center", cost: 6200000, method: "WDV (Written Down Value)", rate: "15%", openingWdv: 5270000, depCurrentYear: 790500, closingWdv: 4479500 },
    { assetId: "AST-SOL-003", name: "Rooftop 150 kW Solar Power Array", cost: 5800000, method: "SLM (Straight Line)", rate: "7.07%", openingWdv: 5390000, depCurrentYear: 410060, closingWdv: 4979940 },
  ]);

  
  const [forexCurrencies, setForexCurrencies] = useState([
    { currency: "USD (US Dollar)", bookRate: 83.50, spotRate: 83.85, unhedgedExposure: 240000, unrealizedGainLoss: 84000, type: "Gain (Favorable)" },
    { currency: "EUR (Euro)", bookRate: 91.20, spotRate: 91.05, unhedgedExposure: 85000, unrealizedGainLoss: -12750, type: "Loss (Unfavorable)" },
    { currency: "GBP (British Pound)", bookRate: 108.40, spotRate: 109.10, unhedgedExposure: 40000, unrealizedGainLoss: 28000, type: "Gain (Favorable)" },
    { currency: "JPY (Japanese Yen)", bookRate: 0.58, spotRate: 0.58, unhedgedExposure: 5000000, unrealizedGainLoss: 0, type: "Neutral" },
  ]);

  
  const [costCenters, setCostCenters] = useState([
    { code: "CC-PUN-01", name: "CNC Machining Center (Bhosari)", type: "Cost Center", directExpense: 8400000, allocatedOverheads: 2100000, totalCost: 10500000, absorptionRate: "₹850 / Machine Hour" },
    { code: "CC-MUM-02", name: "Assembly & Metrology Unit (Mumbai)", type: "Cost Center", directExpense: 3200000, allocatedOverheads: 800000, totalCost: 4000000, absorptionRate: "₹420 / Inspection Lot" },
    { code: "PC-AUTO-01", name: "Automotive Precision OEM Division", type: "Profit Center", revenue: 38500000, costOfSales: 28200000, netMargin: 10300000, marginPct: "26.7%" },
    { code: "PC-EXP-02", name: "Global Export & Special Alloys Division", type: "Profit Center", revenue: 15400000, costOfSales: 11200000, netMargin: 4200000, marginPct: "27.3%" },
  ]);

  const headersMap = {
    budgeting: {
      tag: "Corporate FP&A",
      title: "Budgeting & Financial Planning (FP&A)",
      sub: "Departmental budget allocation, actual vs. budgeted variance analysis, and 12-month rolling forecasts.",
    },
    treasury: {
      tag: "Liquidity Management",
      title: "Treasury & Cash Flow Forecasting",
      sub: "Direct cash flow projections, liquidity concentration, working capital buffers, and debt servicing schedules.",
    },
    depreciation: {
      tag: "Asset Accounting",
      title: "Fixed Asset Depreciation Engine (WDV & SLM)",
      sub: "Companies Act & Income Tax Act depreciation schedules, WDV vs Straight Line calculations, and journal generation.",
    },
    forex: {
      tag: "Foreign Exchange",
      title: "Multi-Currency & Forex Revaluation",
      sub: "Real-time spot rate ledger, currency exposure tracking, and month-end unrealized forex gain/loss settlement.",
    },
    "cost-centers": {
      tag: "Managerial Accounting",
      title: "Cost Center & Profit Center Accounting",
      sub: "Internal overhead absorption rates, machine hour cost allocation, and segment profitability reporting.",
    },
  };

  const currentHeader = headersMap[activeTab] || headersMap.budgeting;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <CreditCard className="h-6 w-6" strokeWidth={1.75} />
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

      
      {activeTab === "budgeting" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Departmental Budget vs. Actual</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">FY 2026-27 Planned Allocations & Rolling Forecasts</p>
            </div>
            <button 
              onClick={() => toast.success("Budget variance journal exported to Excel")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" /> Export Variance Pack
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Operating Department</th>
                  <th className="py-2.5 px-3 text-right">Allocated Budget</th>
                  <th className="py-2.5 px-3 text-right">Actual YTD Spend</th>
                  <th className="py-2.5 px-3 text-right">Variance (₹)</th>
                  <th className="py-2.5 px-3 text-right">Next Qtr Forecast</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {budgets.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{b.dept}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-700">{fmtMoney(b.allocated)}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">{fmtMoney(b.actual)}</td>
                    <td className={cx("py-3 px-3 text-right font-bold", b.variance > 0 ? "text-rose-600" : "text-emerald-600")}>
                      {fmtMoney(b.variance)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#0F766E]">{fmtMoney(b.forecastNextQtr)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={cx(
                        "px-2 py-0.5 rounded-full font-bold text-[10px] border",
                        b.variance > 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "treasury" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">4-Month Rolling Cash Flow Projection</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Inward Collections, Vendor Payables & Projected Bank Balances</p>
            </div>
            <button 
              onClick={() => toast.success("Treasury liquidity simulation updated")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Recompute Cash Runway
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {cashFlowForecast.map((cf, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">{cf.period}</span>
                  <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] font-bold text-[10px] rounded border border-teal-200">
                    Net: +{fmtMoney(cf.netCash)}
                  </span>
                </div>
                <div className="space-y-1 text-xs pt-2 border-t border-slate-200/60">
                  <div className="flex justify-between text-slate-500">
                    <span>Expected Inflow:</span>
                    <span className="font-semibold text-emerald-600">{fmtMoney(cf.inflow)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Planned Outflow:</span>
                    <span className="font-semibold text-rose-600">{fmtMoney(cf.outflow)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/80 flex justify-between">
                    <span className="font-bold text-slate-700">Closing Balance:</span>
                    <span className="font-black text-slate-900">{fmtMoney(cf.bankBalance)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      
      {activeTab === "depreciation" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Fixed Asset Depreciation Ledger</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Written Down Value (WDV) & Straight Line Method (SLM) Schedules</p>
            </div>
            <button 
              onClick={() => toast.success("Depreciation JV posted to General Ledger!")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Calculator className="h-4 w-4" /> Post Depreciation Journal
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Asset Item</th>
                  <th className="py-2.5 px-3">Original Cost</th>
                  <th className="py-2.5 px-3">Depreciation Method</th>
                  <th className="py-2.5 px-3">Rate</th>
                  <th className="py-2.5 px-3 text-right">Opening WDV</th>
                  <th className="py-2.5 px-3 text-right">Current FY Dep</th>
                  <th className="py-2.5 px-3 text-right">Closing Net Book Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {depreciations.map((d) => (
                  <tr key={d.assetId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{d.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{d.assetId}</p>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{fmtMoney(d.cost)}</td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{d.method}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{d.rate}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-800">{fmtMoney(d.openingWdv)}</td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600">-{fmtMoney(d.depCurrentYear)}</td>
                    <td className="py-3 px-3 text-right font-black text-[#0D9488]">{fmtMoney(d.closingWdv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "forex" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Foreign Exchange Revaluation Ledger</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Unrealized Gain / Loss calculation across foreign currency accounts</p>
            </div>
            <button 
              onClick={() => toast.success("Forex revaluation journals booked")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Revalue Spot Rates
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Currency</th>
                  <th className="py-2.5 px-3">Book Rate (INR)</th>
                  <th className="py-2.5 px-3">Spot Rate (INR)</th>
                  <th className="py-2.5 px-3 text-right">Unhedged Exposure</th>
                  <th className="py-2.5 px-3 text-right">Unrealized Gain/Loss</th>
                  <th className="py-2.5 px-3 text-center">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {forexCurrencies.map((f, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{f.currency}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-700">₹{f.bookRate.toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono font-black text-slate-900">₹{f.spotRate.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800">{f.unhedgedExposure.toLocaleString()} units</td>
                    <td className={cx("py-3 px-3 text-right font-black", f.unrealizedGainLoss >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {f.unrealizedGainLoss >= 0 ? "+" : ""}{fmtMoney(f.unrealizedGainLoss)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={cx(
                        "px-2 py-0.5 rounded-full font-bold text-[10px] border",
                        f.unrealizedGainLoss > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : (f.unrealizedGainLoss < 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-50 text-slate-700 border-slate-200")
                      )}>
                        {f.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "cost-centers" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Cost Centers & Profit Centers Matrix</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Managerial segment reporting, machine-hour overhead absorption rates</p>
            </div>
            <button 
              onClick={() => toast.success("New cost center registered")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Segment
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {costCenters.map((c) => (
              <div key={c.code} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded font-mono text-[10px] font-bold">
                      {c.code}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{c.name}</h3>
                  </div>
                  <span className={cx(
                    "px-2 py-0.5 rounded-full font-bold text-[10px] border",
                    c.type === "Profit Center" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"
                  )}>
                    {c.type}
                  </span>
                </div>

                {c.type === "Cost Center" ? (
                  <div className="space-y-1 text-xs pt-2 border-t border-slate-200/60">
                    <div className="flex justify-between text-slate-500">
                      <span>Direct Operational Expense:</span>
                      <span className="font-semibold text-slate-800">{fmtMoney(c.directExpense)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Allocated Overheads:</span>
                      <span className="font-semibold text-slate-800">{fmtMoney(c.allocatedOverheads)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 font-bold">
                      <span>Total Segment Cost:</span>
                      <span className="text-slate-900 font-black">{fmtMoney(c.totalCost)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/80 flex justify-between">
                      <span className="text-slate-700 font-semibold">Absorption Rate:</span>
                      <span className="text-[#0D9488] font-bold">{c.absorptionRate}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-xs pt-2 border-t border-slate-200/60">
                    <div className="flex justify-between text-slate-500">
                      <span>Segment Revenue:</span>
                      <span className="font-semibold text-slate-800">{fmtMoney(c.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Cost of Sales:</span>
                      <span className="font-semibold text-slate-800">{fmtMoney(c.costOfSales)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/80 flex justify-between items-baseline">
                      <span className="font-bold text-slate-700">Net Profit Margin:</span>
                      <span className="text-base font-black text-emerald-600">{fmtMoney(c.netMargin)} ({c.marginPct})</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountsPlanningHubPage;
