import { useState, useEffect } from "react";
import { masterService } from "../../../services/masterService";
import { BookOpen, Calendar, Filter, ChevronDown, ChevronUp, FileSpreadsheet } from "lucide-react";
import { toast } from "react-hot-toast";
import { cx } from "../../../utils/format";

export function DayBookPage() {
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  };
  const getToday = () => new Date().toISOString().slice(0, 10);

  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth);
  const [toDate, setToDate] = useState(getToday);

  useEffect(() => {
    fetchDayBook();
  }, [filterType, fromDate, toDate]);

  const fetchDayBook = async () => {
    setLoading(true);
    try {
      const res = await masterService.getVouchers({
        voucher_type: filterType || undefined,
        from_date: fromDate,
        to_date: toDate,
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setVouchers(res.data.data);
      } else {
        setVouchers([]);
      }
    } catch {
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = vouchers.reduce((sum, v) => sum + (parseFloat(v.total_amount) || 0), 0);

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <BookOpen className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs text-[#0D9488] font-bold uppercase tracking-[0.14em]">
                Financial Accounts & GL
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                Day Book & Transaction Journal
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Chronological log of all accounting entries, receipts, payments, and journals with live ledger expansions.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
          </div>
        </div>
      </div>

      
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Chronological Voucher Entries</h2>
            <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Click any row to expand double-entry debit & credit legs</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
            Running Period Total: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-28">Date</th>
                <th className="py-2.5 px-4 w-36">Voucher No</th>
                <th className="py-2.5 px-4 w-28">Type</th>
                <th className="py-2.5 px-4">Particulars / Narration</th>
                <th className="py-2.5 px-4 text-right w-36">Total Amount (₹)</th>
                <th className="py-2.5 px-4 text-center w-16">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vouchers.map((v) => {
                const isExpanded = expandedId === v.voucher_id;
                return (
                  <div key={v.voucher_id} className="contents">
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : v.voucher_id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono text-slate-600">{v.voucher_date}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#0D9488]">{v.voucher_no}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {v.voucher_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 truncate max-w-md">{v.narration}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{(parseFloat(v.total_amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400">
                        {isExpanded ? <ChevronUp className="h-4 w-4 mx-auto" /> : <ChevronDown className="h-4 w-4 mx-auto" />}
                      </td>
                    </tr>

                    
                    {isExpanded && v.items && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50 p-4 border-y border-slate-200">
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold text-slate-600">Posting Ledger Breakdown:</span>
                            <div className="space-y-1">
                              {v.items.map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs font-mono p-2 rounded bg-white border border-slate-200">
                                  <div className="flex items-center gap-2">
                                    <span className={cx("font-bold px-1.5 py-0.2 rounded text-[10px]", it.entry_type === "Dr" ? "bg-rose-50 text-rose-800 border border-rose-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200")}>
                                      {it.entry_type}
                                    </span>
                                    <span className="text-slate-900 font-semibold">{it.ledger_name}</span>
                                  </div>
                                  <span className="font-bold text-slate-900">₹{(parseFloat(it.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </div>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DayBookPage;
