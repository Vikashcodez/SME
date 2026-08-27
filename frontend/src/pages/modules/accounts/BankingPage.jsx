import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { 
  Building, Landmark, CreditCard, ArrowRightLeft, 
  CheckCircle2, Clock, Check, RefreshCw, Plus, FileText, X, Save
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";
import { Button } from "../../../components/ui/Button";

export function BankingPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "accounts";

  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    ledger_name: "",
    account_number: "",
    ifsc_code: "",
    branch_name: "Pune Main Branch",
    opening_balance: "500000",
  });

  const fetchBankData = async () => {
    setLoading(true);
    try {
      const res = await masterService.getLedgers();
      if (res.data?.success && Array.isArray(res.data.data)) {
        const bankLedgers = res.data.data.filter(
          (l) => l.group_name?.toLowerCase().includes("bank") || l.ledger_name?.toLowerCase().includes("bank")
        );
        setBankAccounts(
          bankLedgers.map((b, idx) => ({
            id: b.ledger_code || `BNK-0${idx + 1}`,
            name: b.ledger_name,
            accNo: b.account_number || "—",
            branch: b.branch_name || "Primary Branch",
            balance: Number(b.closing_balance || b.opening_balance || 0),
            type: b.group_name || "Current Operating A/c",
            ifsc: b.ifsc_code || "—",
          }))
        );
      }
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankData();
  }, []);

  const handleCreateBankAccount = async (e) => {
    e.preventDefault();
    if (!formData.ledger_name) {
      toast.error("Please enter Bank / Account Name");
      return;
    }
    try {
      await masterService.createLedger({
        ledger_name: formData.ledger_name,
        group_id: 1, 
        account_number: formData.account_number,
        ifsc_code: formData.ifsc_code,
        branch_name: formData.branch_name,
        opening_balance: Number(formData.opening_balance || 0),
      });
      toast.success("Bank account linked successfully");
      setIsModalOpen(false);
      fetchBankData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to link bank account");
    }
  };

  const totalLiquidity = bankAccounts.reduce((sum, b) => sum + b.balance, 0);

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Landmark className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs text-[#0D9488] font-bold uppercase tracking-[0.14em]">
                Treasury & Banking Console
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                Banking, BRS & House Accounts
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Real-time house bank ledger balances, 2-way statement reconciliation, and treasury liquidity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => {
                setFormData({
                  ledger_name: "",
                  account_number: "",
                  ifsc_code: "",
                  branch_name: "",
                  balance: "1000000",
                });
                setIsModalOpen(true);
              }}
            >
              Link Bank Account
            </Button>
          </div>
        </div>
      </div>

      
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">House Bank Accounts & Liquidity</h2>
            <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Operating Accounts, Disbursement Limits & IFSC Codes</p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-200">
            Total Liquidity: ₹{Number(totalLiquidity || 0).toLocaleString()}
          </span>
        </div>

        {bankAccounts.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
            <Landmark className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No bank accounts linked</p>
            <p className="text-xs text-slate-400 mt-1">Click "+ Link Bank Account" to connect your first bank account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bankAccounts.map((acc) => (
              <div key={acc.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#0D9488]">{acc.id}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                    {acc.type}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{acc.name}</h3>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">A/c: {acc.accNo}</p>
                  <p className="text-[10px] text-slate-400 font-mono">IFSC: {acc.ifsc} · {acc.branch}</p>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">Available Balance:</span>
                  <span className="text-sm font-bold font-mono text-slate-900">₹{Number(acc.balance || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-modal max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Landmark className="h-5 w-5 text-[#0D9488]" /> Link House Bank Account
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBankAccount} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Bank Name / Ledger Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.ledger_name}
                  onChange={(e) => setFormData({ ...formData, ledger_name: e.target.value })}
                  placeholder="e.g. HDFC Bank - Bhosari Current A/c"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="50200012345678"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">IFSC / SWIFT Code</label>
                  <input
                    type="text"
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                    placeholder="HDFC0000123"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    placeholder="Bhosari MIDC Branch"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                    placeholder="500000"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold text-right focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Link Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BankingPage;
