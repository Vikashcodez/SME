import { useState, useEffect, useRef } from "react";
import { masterService } from "../../../services/masterService";
import { 
  Receipt, Plus, Trash2, CheckCircle2, AlertCircle, 
  HelpCircle, Calendar, FileText, ArrowRight, Save
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cx, fmtMoney } from "../../../utils/format";

export function VoucherEntryPage() {
  const [voucherType, setVoucherType] = useState("Payment");
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [voucherNo, setVoucherNo] = useState("");
  const [narration, setNarration] = useState("");
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [entries, setEntries] = useState([
    { id: 1, type: "Dr", ledgerId: "", amount: "", remark: "" },
    { id: 2, type: "Cr", ledgerId: "", amount: "", remark: "" },
  ]);

  useEffect(() => {
    fetchLedgers();
    fetchNextVoucherNo();
  }, [voucherType]);

  const fetchLedgers = async () => {
    try {
      const res = await masterService.getLedgers();
      if (res.data?.success) {
        setLedgers(res.data.data);
      }
    } catch {
      
    }
  };

  const fetchNextVoucherNo = () => {
    const prefix = voucherType.slice(0, 3).toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900);
    setVoucherNo(`${prefix}-2026-0${rand}`);
  };

  const handleAddRow = () => {
    const last = entries[entries.length - 1];
    const nextType = last && last.type === "Dr" ? "Cr" : "Dr";
    setEntries([...entries, { id: Date.now(), type: nextType, ledgerId: "", amount: "", remark: "" }]);
  };

  const handleRemoveRow = (id) => {
    if (entries.length <= 2) {
      toast.error("A voucher requires at least two entry legs (1 Dr and 1 Cr)");
      return;
    }
    setEntries(entries.filter((e) => e.id !== id));
  };

  const handleEntryChange = (id, field, value) => {
    setEntries(
      entries.map((e) => {
        if (e.id === id) {
          return { ...e, [field]: value };
        }
        return e;
      })
    );
  };

  const totalDebit = entries
    .filter((e) => e.type === "Dr")
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const totalCredit = entries
    .filter((e) => e.type === "Cr")
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isBalanced) {
      toast.error("Voucher is out of balance. Total Debit must equal Total Credit.");
      return;
    }
    setLoading(true);
    try {
      const formattedItems = entries.map((entry) => {
        let matched = ledgers.find(
          (l) => l.ledger_name?.toLowerCase() === entry.ledgerId?.trim().toLowerCase() || String(l.ledger_id) === String(entry.ledgerId)
        );
        const resolvedId = matched ? Number(matched.ledger_id) : (ledgers[0]?.ledger_id || 1);
        return {
          ledger_id: Number(resolvedId),
          entry_type: entry.type === "Dr" ? "Dr" : "Cr",
          amount: parseFloat(entry.amount) || 0,
          item_narration: entry.remark || null,
        };
      });

      const res = await masterService.createVoucher({
        voucher_number: voucherNo,
        voucher_type: voucherType,
        voucher_date: voucherDate,
        narration: narration || `${voucherType} voucher transaction`,
        items: formattedItems,
      });

      toast.success(res.data?.message || `Voucher ${voucherNo} posted successfully to General Ledger!`);
      setEntries([
        { id: 1, type: "Dr", ledgerId: "", amount: "", remark: "" },
        { id: 2, type: "Cr", ledgerId: "", amount: "", remark: "" },
      ]);
      setNarration("");
      fetchNextVoucherNo();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post voucher to General Ledger");
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
              <Receipt className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs text-[#0D9488] font-bold uppercase tracking-[0.14em]">
                Double-Entry Posting Engine
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                Voucher Entry Console (F4-F9)
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Post double-entry journal, receipt, payment, contra, sales, and purchase vouchers with live balancing.
              </p>
            </div>
          </div>
        </div>
      </div>

      
      <div className="flex flex-wrap items-center gap-2">
        {["Payment", "Receipt", "Contra", "Journal", "Sales", "Purchase"].map((type) => (
          <button
            key={type}
            onClick={() => setVoucherType(type)}
            className={cx(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
              voucherType === type
                ? "bg-[#0D9488] text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            )}
          >
            {type} Voucher
          </button>
        ))}
      </div>

      
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Voucher No</label>
            <input
              type="text"
              value={voucherNo}
              readOnly
              className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-xs focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Date of Entry</label>
            <input
              type="date"
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
              className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-900 text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Voucher Category</label>
            <input
              type="text"
              value={voucherType}
              readOnly
              className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-xs focus:outline-none"
            />
          </div>
        </div>

        
        <div className="space-y-2.5">
          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-slate-500 px-2">
            <div className="col-span-2">Dr / Cr</div>
            <div className="col-span-5">Account Head / Ledger</div>
            <div className="col-span-4 text-right">Amount (₹)</div>
            <div className="col-span-1 text-center">Action</div>
          </div>

          {entries.map((entry) => (
            <div key={entry.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="col-span-2">
                <select
                  value={entry.type}
                  onChange={(e) => handleEntryChange(entry.id, "type", e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0D9488]"
                >
                  <option value="Dr">Dr</option>
                  <option value="Cr">Cr</option>
                </select>
              </div>

              <div className="col-span-5">
                <input
                  type="text"
                  list="ledgerOptions"
                  placeholder="Type or select account head…"
                  value={entry.ledgerId}
                  onChange={(e) => handleEntryChange(entry.id, "ledgerId", e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-[#0D9488]"
                />
                <datalist id="ledgerOptions">
                  {ledgers.map((l) => (
                    <option key={l.ledger_id || l.ledger_name} value={l.ledger_name}>
                      {l.group_name ? `(${l.group_name})` : ""}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="col-span-4">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={entry.amount}
                  onChange={(e) => handleEntryChange(entry.id, "amount", e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-right text-slate-900 focus:ring-2 focus:ring-[#0D9488]"
                />
              </div>

              <div className="col-span-1 text-center">
                <button
                  type="button"
                  onClick={() => handleRemoveRow(entry.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add Ledger Leg
          </button>
        </div>

        
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Narration / Transaction Memo</label>
          <textarea
            rows={2}
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Provide audit reference, cheque/UTR details, or supporting invoice number…"
            className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
          />
        </div>

        
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 font-mono text-xs">
            <div>
              <span className="text-slate-500 block">Total Debit (Dr):</span>
              <span className="font-bold text-slate-900 text-sm">₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Credit (Cr):</span>
              <span className="font-bold text-slate-900 text-sm">₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Difference:</span>
              <span className={cx("font-bold text-sm", isBalanced ? "text-emerald-700" : "text-rose-700")}>
                ₹{Math.abs(totalDebit - totalCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isBalanced ? (
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Balanced & Valid
              </span>
            ) : (
              <span className="text-xs font-mono font-bold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" /> Out of Balance
              </span>
            )}
            <button
              type="submit"
              disabled={!isBalanced || loading}
              className="px-5 py-2 bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="h-4 w-4" /> {loading ? "Posting..." : "Post Voucher"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default VoucherEntryPage;
