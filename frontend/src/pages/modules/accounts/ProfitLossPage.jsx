import { useState, useEffect } from "react";
import { masterService } from "../../../services/masterService";
import { TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, FileSpreadsheet, Download, Printer } from "lucide-react";
import { toast } from "react-hot-toast";
import { exportToExcel, exportToCsv, printReport } from "../../../utils/exportUtils";

export function ProfitLossPage() {
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  };
  const getToday = () => new Date().toISOString().slice(0, 10);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth);
  const [toDate, setToDate] = useState(getToday);

  useEffect(() => {
    fetchPL();
  }, [fromDate, toDate]);

  const fetchPL = async () => {
    setLoading(true);
    try {
      const res = await masterService.getProfitLoss({ fromDate, toDate });
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to load Profit & Loss statement");
    } finally {
      setLoading(false);
    }
  };

  const trading = data?.tradingAccount || {};
  const pl = data?.profitAndLossAccount || {};

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold tracking-wider uppercase mb-1">
            <TrendingUp className="h-4 w-4" />
            <span>Tally Prime 9 Financial Statements</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Profit & Loss Statement</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Trading performance, Gross Profit, Operating Expenses, and Net Profit summary.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs text-xs">
              <span className="text-slate-500 font-bold">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs text-xs">
              <span className="text-slate-500 font-bold">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={fetchPL}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors shadow-xs"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              const rows = [
                { 'Particulars': 'Sales / Revenue', 'Debit (₹)': '', 'Credit (₹)': Number(trading.totalSales || 0) },
                { 'Particulars': 'Direct Expenses & COGS', 'Debit (₹)': Number(trading.totalPurchases || 0) + Number(trading.totalDirectExpenses || 0), 'Credit (₹)': '' },
                { 'Particulars': 'Gross Profit', 'Debit (₹)': '', 'Credit (₹)': Number(trading.grossProfit || 0) },
                { 'Particulars': 'Indirect Expenses', 'Debit (₹)': Number(pl.totalIndirectExpenses || 0), 'Credit (₹)': '' },
                { 'Particulars': 'Net Profit / (Loss)', 'Debit (₹)': '', 'Credit (₹)': Number(pl.netProfit || 0) },
              ];
              exportToExcel(rows, `Profit_Loss_Statement_${fromDate}_${toDate}`, 'ProfitLoss');
            }}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Export Excel"
          >
            <Download className="h-4 w-4 text-[#0D9488]" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => printReport(`Profit & Loss Statement (${fromDate} to ${toDate}) - Chandra Precision ERP`)}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Print P&L"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>Print</span>
          </button>
          <button
            onClick={() => masterService.downloadTallyXml()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Tally XML</span>
          </button>
        </div>
      </div>

      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Revenue / Sales</p>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">
            ₹{(trading.totalSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5" /> Direct Incomes
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <p className="text-xs font-bold text-slate-500 uppercase">Gross Profit</p>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
            ₹{(trading.grossProfit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Sales less Direct Purchases & Mfg
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <p className="text-xs font-bold text-slate-500 uppercase">Net Profit</p>
          <p className="text-2xl font-black text-blue-700 font-mono mt-1">
            ₹{(pl.netProfit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-blue-600 font-semibold mt-1">
            Margin: {(pl.netProfitPercentage || 0).toFixed(1)}%
          </p>
        </div>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-rose-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4" /> Expenses & Direct Costs
          </h2>
          <div className="divide-y divide-slate-100 font-mono text-sm">
            <div className="py-2 font-bold text-slate-800">Direct Purchases:</div>
            {(trading.purchases || []).map((p, i) => (
              <div key={i} className="py-1.5 pl-4 flex justify-between text-xs text-slate-700">
                <span>{p.ledger_name}</span>
                <span className="font-semibold">₹{parseFloat(p.amount).toLocaleString("en-IN")}</span>
              </div>
            ))}

            <div className="py-2 font-bold text-slate-800 mt-2">Indirect Operating Expenses:</div>
            {(pl.indirectExpenses || []).map((exp, i) => (
              <div key={i} className="py-1.5 pl-4 flex justify-between text-xs text-slate-700">
                <span>{exp.ledger_name}</span>
                <span className="font-semibold">₹{parseFloat(exp.amount).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>

        
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" /> Revenue & Operating Incomes
          </h2>
          <div className="divide-y divide-slate-100 font-mono text-sm">
            <div className="py-2 font-bold text-slate-800">Direct Incomes / Sales:</div>
            {(trading.sales || []).map((s, i) => (
              <div key={i} className="py-1.5 pl-4 flex justify-between text-xs text-slate-700">
                <span>{s.ledger_name}</span>
                <span className="font-semibold">₹{parseFloat(s.amount).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfitLossPage;
