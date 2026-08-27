import { useState, useEffect } from "react";
import { masterService } from "../../../services/masterService";
import { Scale, CheckCircle2, AlertCircle, RefreshCw, FileSpreadsheet, Download, Printer } from "lucide-react";
import { toast } from "react-hot-toast";
import { exportToExcel, exportToCsv, printReport } from "../../../utils/exportUtils";

export function TrialBalancePage() {
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  };
  const getToday = () => new Date().toISOString().slice(0, 10);

  const [data, setData] = useState([]);
  const [grandDebit, setGrandDebit] = useState(0);
  const [grandCredit, setGrandCredit] = useState(0);
  const [isBalanced, setIsBalanced] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth);
  const [toDate, setToDate] = useState(getToday);

  useEffect(() => {
    fetchTrialBalance();
  }, [fromDate, toDate]);

  const fetchTrialBalance = async () => {
    setLoading(true);
    try {
      const res = await masterService.getTrialBalance({ from_date: fromDate, to_date: toDate });
      if (res.data?.success && res.data.data) {
        const fetchedData = res.data.data.groups || res.data.data || [];
        setData(Array.isArray(fetchedData) ? fetchedData : []);
        setGrandDebit(res.data.data.grand_total_debit || res.data.data.total_debit || 0);
        setGrandCredit(res.data.data.grand_total_credit || res.data.data.total_credit || 0);
        setIsBalanced(res.data.data.is_balanced !== undefined ? res.data.data.is_balanced : true);
      } else {
        setData([]);
      }
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Scale className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs text-[#0D9488] font-bold uppercase tracking-[0.14em]">
                Financial Accounts & GL
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                Trial Balance & Ledger Accounts
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Closing debit and credit balances grouped by primary ledger account heads.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-slate-600 font-bold">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-slate-900 font-medium focus:outline-none"
              />
              <span className="text-slate-600 font-bold">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-slate-900 font-medium focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const rows = [];
                data.forEach(g => {
                  (g.ledgers || []).forEach(l => {
                    rows.push({
                      'Group': g.group_name,
                      'Ledger Name': l.ledger_name,
                      'Debit (Dr)': Number(l.debit_balance || 0),
                      'Credit (Cr)': Number(l.credit_balance || 0)
                    });
                  });
                });
                exportToExcel(rows, `Trial_Balance_${fromDate}_${toDate}`, 'TrialBalance');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors"
              title="Export to Excel"
            >
              <Download className="h-3.5 w-3.5 text-[#0D9488]" /> Export
            </button>

            <button
              type="button"
              onClick={() => printReport(`Trial Balance (${fromDate} to ${toDate}) - Chandra Precision ERP`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors"
              title="Print Trial Balance"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" /> Print
            </button>
          </div>
        </div>
      </div>

      
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">General Ledger Balances</h2>
            <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Dense Monospace Debit & Credit Columns</p>
          </div>
          {isBalanced ? (
            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
              <CheckCircle2 className="h-4 w-4" /> Trial Balance Reconciled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg">
              <AlertCircle className="h-4 w-4" /> Unbalanced
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Particulars / Account Head</th>
                <th className="py-2.5 px-4 text-right w-40">Debit Balance (Dr ₹)</th>
                <th className="py-2.5 px-4 text-right w-40">Credit Balance (Cr ₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((group, gIdx) => (
                <div key={gIdx} className="contents">
                  <tr className="bg-slate-50/80 font-bold text-slate-900">
                    <td colSpan={3} className="py-2 px-4 text-xs tracking-wider uppercase text-[#0D9488]">
                      {group.group_name}
                    </td>
                  </tr>
                  {group.ledgers.map((l, lIdx) => (
                    <tr key={lIdx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-8 text-slate-800 font-medium">{l.ledger_name}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {l.closing_type === "Dr" ? `₹${l.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {l.closing_type === "Cr" ? `₹${l.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                    </tr>
                  ))}
                </div>
              ))}
            </tbody>
          </table>
        </div>

        
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-xl flex items-center justify-between font-mono">
          <span className="text-xs font-bold uppercase text-slate-600">Grand Reconciled Total:</span>
          <div className="flex items-center gap-12 text-sm font-bold">
            <span className="text-slate-900">Dr: ₹{grandDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span className="text-slate-900">Cr: ₹{grandCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrialBalancePage;
