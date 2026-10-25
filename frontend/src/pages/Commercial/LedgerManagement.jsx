import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { accounting as accountingApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Landmark, Plus, Wallet, Scale, RefreshCw } from 'lucide-react';

const emptyLedger = {
  entry_type: 'CURRENT_ASSET',
  ledger_name: '',
  ledger_code: '',
  opening_balance: '',
  opening_balance_type: 'DR'
};

const emptyBank = {
  bank_name: '',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  branch_name: '',
  account_type: 'CURRENT',
  opening_balance: '',
  opening_balance_type: 'DR'
};

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const LedgerList = ({ title, groupCode, icon: Icon, ledgers }) => {
  const entries = ledgers.filter((ledger) => ledger.group_code === groupCode);
  const total = entries.reduce((sum, ledger) => sum + Number(ledger.current_balance || 0), 0);
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2"><Icon className="w-5 h-5 text-indigo-600" /><h2 className="font-semibold text-slate-900">{title}</h2></div>
        <span className="text-sm font-semibold text-slate-700">{money(total)}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {entries.length === 0 && <p className="p-5 text-sm text-slate-500">No entries yet.</p>}
        {entries.map((ledger) => <div key={ledger.ledger_id} className="px-5 py-3 flex items-center justify-between"><div><p className="text-sm font-medium text-slate-800">{ledger.ledger_name}</p><p className="text-xs text-slate-400">{ledger.ledger_code}</p></div><span className="font-mono text-sm text-slate-700">{money(ledger.current_balance)} {ledger.current_balance_type}</span></div>)}
      </div>
    </section>
  );
};

const LedgerManagement = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const [groups, setGroups] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [ledgerForm, setLedgerForm] = useState(emptyLedger);
  const [bankForm, setBankForm] = useState(emptyBank);
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [coa, banks] = await Promise.all([
        accountingApi.getChartOfAccounts({ company_id: companyId }),
        accountingApi.getBankAccounts({ company_id: companyId })
      ]);
      setGroups(coa.data.data?.groups || []);
      setLedgers(coa.data.data?.ledgers || []);
      setBankAccounts(banks.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Unable to load ledger details');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const groupByCode = useMemo(
    () => Object.fromEntries(groups.map((group) => [group.group_code, group])),
    [groups]
  );

  const categoryLedgers = (groupCode) => ledgers.filter((ledger) => ledger.group_code === groupCode);
  const totals = {
    assets: categoryLedgers('GRP-CA').reduce((sum, ledger) => sum + Number(ledger.current_balance || 0), 0),
    liabilities: categoryLedgers('GRP-CL').reduce((sum, ledger) => sum + Number(ledger.current_balance || 0), 0),
    cash: categoryLedgers('GRP-CASH').reduce((sum, ledger) => sum + Number(ledger.current_balance || 0), 0),
    banks: bankAccounts.reduce((sum, account) => sum + Number(account.current_balance || 0), 0)
  };

  const update = (setter) => (event) => setter((current) => ({ ...current, [event.target.name]: event.target.value }));

  const saveLedger = async (event) => {
    event.preventDefault();
    const groupCode = ledgerForm.entry_type === 'CURRENT_LIABILITY' ? 'GRP-CL'
      : ledgerForm.entry_type === 'CASH' ? 'GRP-CASH' : 'GRP-CA';
    if (!ledgerForm.ledger_name.trim() || !groupByCode[groupCode]) {
      toast.error('Ledger name and an initialized account group are required');
      return;
    }
    try {
      setSaving(true);
      await accountingApi.createLedger({
        company_id: companyId,
        group_id: groupByCode[groupCode].group_id,
        ledger_name: ledgerForm.ledger_name,
        ledger_code: ledgerForm.ledger_code,
        opening_balance: Number(ledgerForm.opening_balance || 0),
        opening_balance_type: ledgerForm.opening_balance_type
      });
      toast.success('Ledger entry added');
      setLedgerForm(emptyLedger);
      setShowLedgerForm(false);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Unable to create ledger entry');
    } finally {
      setSaving(false);
    }
  };

  const saveBank = async (event) => {
    event.preventDefault();
    if (!bankForm.bank_name.trim() || !bankForm.account_number.trim() || !bankForm.ifsc_code.trim()) {
      toast.error('Bank name, account number, and IFSC code are required');
      return;
    }
    try {
      setSaving(true);
      await accountingApi.createBankAccount({ ...bankForm, company_id: companyId });
      toast.success('Bank account and ledger added');
      setBankForm(emptyBank);
      setShowBankForm(false);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Unable to create bank account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><div className="flex items-center gap-3"><div className="p-3 bg-indigo-50 rounded-xl"><Scale className="w-6 h-6 text-indigo-600" /></div><h1 className="text-2xl font-bold text-slate-900">Ledger & Banking</h1></div><p className="text-sm text-slate-500 mt-2">Add Tally-style current assets, current liabilities, cash on hand, and bank ledgers.</p></div>
        <div className="flex gap-2"><button onClick={() => setShowLedgerForm(true)} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Add ledger entry</button><button onClick={() => setShowBankForm(true)} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium flex items-center gap-2"><Landmark className="w-4 h-4" /> Add bank account</button><button onClick={loadData} className="p-2.5 border border-slate-200 rounded-xl" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
      </header>

      <div className="bg-slate-900 text-white rounded-2xl p-5 grid md:grid-cols-3 gap-4">
        <div><p className="font-semibold">1. Choose the account</p><p className="text-sm text-slate-300 mt-1">Use current asset for money or amounts owed to you, current liability for amounts you owe, and cash for physical cash.</p></div>
        <div><p className="font-semibold">2. Add opening balance</p><p className="text-sm text-slate-300 mt-1">Enter the balance as it exists today. Debit is normal for assets; credit is normal for liabilities.</p></div>
        <div><p className="font-semibold">3. Record transactions</p><p className="text-sm text-slate-300 mt-1">Sales, purchases, receipts, payments, and transfers update these ledgers automatically through vouchers.</p></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[['Current assets', totals.assets, 'text-blue-600'], ['Current liabilities', totals.liabilities, 'text-amber-600'], ['Cash on hand', totals.cash, 'text-emerald-600'], ['Bank balances', totals.banks, 'text-indigo-600']].map(([label, value, color]) => <div key={label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className={`text-xl font-bold mt-2 ${color}`}>{money(value)}</p></div>)}
      </div>

      <div className="grid lg:grid-cols-3 gap-5"><LedgerList title="Current Assets" groupCode="GRP-CA" icon={Wallet} ledgers={ledgers} /><LedgerList title="Current Liabilities" groupCode="GRP-CL" icon={Scale} ledgers={ledgers} /><LedgerList title="Cash on Hand" groupCode="GRP-CASH" icon={Wallet} ledgers={ledgers} /></div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="px-5 py-4 border-b border-slate-100 flex justify-between"><h2 className="font-semibold text-slate-900 flex gap-2 items-center"><Landmark className="w-5 h-5 text-emerald-600" /> Bank accounts</h2><span className="text-sm text-slate-500">{bankAccounts.length} account(s)</span></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left p-4">Bank</th><th className="text-left p-4">Account</th><th className="text-left p-4">IFSC</th><th className="text-left p-4">Type</th><th className="text-right p-4">Ledger balance</th></tr></thead><tbody className="divide-y divide-slate-100">{bankAccounts.map((account) => <tr key={account.bank_account_id}><td className="p-4 font-medium">{account.bank_name}<span className="block text-xs text-slate-400">{account.account_holder_name || '—'}</span></td><td className="p-4">•••• {account.account_number.slice(-4)}</td><td className="p-4">{account.ifsc_code}</td><td className="p-4">{account.account_type}</td><td className="p-4 text-right font-mono">{money(account.current_balance)} {account.current_balance_type}</td></tr>)}</tbody></table>{bankAccounts.length === 0 && <p className="p-5 text-sm text-slate-500">No bank accounts added yet.</p>}</div></section>

      {showLedgerForm && <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"><form onSubmit={saveLedger} className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4"><h2 className="text-xl font-bold">Add ledger entry</h2><select name="entry_type" value={ledgerForm.entry_type} onChange={update(setLedgerForm)} className="w-full border rounded-xl p-3"><option value="CURRENT_ASSET">Current asset</option><option value="CURRENT_LIABILITY">Current liability</option><option value="CASH">Cash on hand</option></select><input required name="ledger_name" value={ledgerForm.ledger_name} onChange={update(setLedgerForm)} placeholder="Ledger name" className="w-full border rounded-xl p-3" /><input name="ledger_code" value={ledgerForm.ledger_code} onChange={update(setLedgerForm)} placeholder="Ledger code (optional)" className="w-full border rounded-xl p-3" /><div className="grid grid-cols-2 gap-3"><input type="number" min="0" step="0.01" name="opening_balance" value={ledgerForm.opening_balance} onChange={update(setLedgerForm)} placeholder="Opening balance" className="border rounded-xl p-3" /><select name="opening_balance_type" value={ledgerForm.opening_balance_type} onChange={update(setLedgerForm)} className="border rounded-xl p-3"><option value="DR">Debit</option><option value="CR">Credit</option></select></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowLedgerForm(false)} className="px-4 py-2 border rounded-xl">Cancel</button><button disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl">{saving ? 'Saving...' : 'Save ledger'}</button></div></form></div>}

      {showBankForm && <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"><form onSubmit={saveBank} className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-4"><h2 className="text-xl font-bold">Add bank account & ledger</h2><div className="grid md:grid-cols-2 gap-3">{[['bank_name', 'Bank name'], ['account_holder_name', 'Account holder name'], ['account_number', 'Account number'], ['ifsc_code', 'IFSC code'], ['branch_name', 'Branch name']].map(([name, placeholder]) => <input key={name} required={['bank_name', 'account_number', 'ifsc_code'].includes(name)} name={name} value={bankForm[name]} onChange={update(setBankForm)} placeholder={placeholder} className="border rounded-xl p-3" />)}<select name="account_type" value={bankForm.account_type} onChange={update(setBankForm)} className="border rounded-xl p-3"><option>CURRENT</option><option>SAVINGS</option><option>OVERDRAFT</option><option>CASH_CREDIT</option></select><input type="number" min="0" step="0.01" name="opening_balance" value={bankForm.opening_balance} onChange={update(setBankForm)} placeholder="Opening balance" className="border rounded-xl p-3" /><select name="opening_balance_type" value={bankForm.opening_balance_type} onChange={update(setBankForm)} className="border rounded-xl p-3"><option value="DR">Debit</option><option value="CR">Credit</option></select></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowBankForm(false)} className="px-4 py-2 border rounded-xl">Cancel</button><button disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-xl">{saving ? 'Saving...' : 'Save bank account'}</button></div></form></div>}
    </div>
  );
};

export default LedgerManagement;
