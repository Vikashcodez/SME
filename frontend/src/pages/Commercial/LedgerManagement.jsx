import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { accounting as accountingApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Landmark,
  Plus,
  Wallet,
  Scale,
  RefreshCw,
  Search,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  X,
  Calendar,
  FileText,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Info
} from 'lucide-react';

const emptyLedger = {
  group_id: '',
  ledger_name: '',
  ledger_code: '',
  opening_balance: '',
  opening_balance_type: 'DR',
  opening_balance_date: new Date().toISOString().split('T')[0],
  notes: ''
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

const NATURE_COLORS = {
  ASSET: 'text-blue-700 bg-blue-50 border-blue-200',
  LIABILITY: 'text-amber-700 bg-amber-50 border-amber-200',
  EQUITY: 'text-purple-700 bg-purple-50 border-purple-200',
  INCOME: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  EXPENSE: 'text-rose-700 bg-rose-50 border-rose-200'
};

const VOUCHER_TYPE_COLORS = {
  PAYMENT: 'bg-rose-50 text-rose-700 border-rose-200',
  RECEIPT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CONTRA: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  JOURNAL: 'bg-amber-50 text-amber-700 border-amber-200',
  SALES: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  PURCHASE: 'bg-orange-50 text-orange-700 border-orange-200'
};

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const LedgerManagement = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [groups, setGroups] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeNature, setActiveNature] = useState('ALL');
  const [activeGroup, setActiveGroup] = useState('ALL');

  // Modals state
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingLedger, setEditingLedger] = useState(null);
  const [ledgerForm, setLedgerForm] = useState(emptyLedger);
  const [bankForm, setBankForm] = useState(emptyBank);

  // Statement Drawer state
  const [statementLedger, setStatementLedger] = useState(null);
  const [statementData, setStatementData] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementFilters, setStatementFilters] = useState({
    from_date: '',
    to_date: '',
    voucher_type: ''
  });

  // Voucher Detail Modal state
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  // Delete Confirm Modal
  const [deletingLedger, setDeletingLedger] = useState(null);

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
    loadData();
  }, [loadData]);

  // Load Statement for selected ledger
  const loadStatement = useCallback(async (ledgerId, filters = statementFilters) => {
    if (!ledgerId) return;
    setStatementLoading(true);
    try {
      const params = {};
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      if (filters.voucher_type) params.voucher_type = filters.voucher_type;

      const res = await accountingApi.getLedgerStatement(ledgerId, params);
      setStatementData(res.data?.data || null);
    } catch (error) {
      console.error('Error fetching statement:', error);
      toast.error(error.response?.data?.message || 'Unable to load statement');
    } finally {
      setStatementLoading(false);
    }
  }, [statementFilters]);

  const openStatement = (ledger) => {
    setStatementLedger(ledger);
    const today = new Date().toISOString().split('T')[0];
    const initialFilters = { from_date: '', to_date: today, voucher_type: '' };
    setStatementFilters(initialFilters);
    loadStatement(ledger.ledger_id, initialFilters);
  };

  const closeStatement = () => {
    setStatementLedger(null);
    setStatementData(null);
  };

  const openVoucherDetail = async (voucherId) => {
    if (!voucherId) return;
    setVoucherLoading(true);
    try {
      const res = await accountingApi.getVoucherById(voucherId);
      setSelectedVoucher(res.data?.data || null);
    } catch (error) {
      console.error('Error loading voucher:', error);
      toast.error('Unable to fetch voucher details');
    } finally {
      setVoucherLoading(false);
    }
  };

  const categoryLedgers = (groupCode) => ledgers.filter((ledger) => ledger.group_code === groupCode);
  const totals = {
    assets: ledgers.filter(l => l.nature === 'ASSET').reduce((sum, l) => sum + Number(l.current_balance || 0), 0),
    liabilities: ledgers.filter(l => l.nature === 'LIABILITY').reduce((sum, l) => sum + Number(l.current_balance || 0), 0),
    cash: categoryLedgers('GRP-CASH').reduce((sum, l) => sum + Number(l.current_balance || 0), 0),
    banks: bankAccounts.reduce((sum, account) => sum + Number(account.current_balance || 0), 0)
  };

  const visibleLedgers = useMemo(() => {
    return ledgers.filter((ledger) => {
      const matchesNature = activeNature === 'ALL' || ledger.nature === activeNature;
      const matchesGroup = activeGroup === 'ALL' || ledger.group_id === activeGroup;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query ||
        ledger.ledger_name?.toLowerCase().includes(query) ||
        ledger.ledger_code?.toLowerCase().includes(query) ||
        ledger.group_name?.toLowerCase().includes(query);
      return matchesNature && matchesGroup && matchesSearch;
    });
  }, [activeNature, activeGroup, ledgers, search]);

  const update = (setter) => (event) => setter((current) => ({ ...current, [event.target.name]: event.target.value }));

  // Create Ledger
  const saveLedger = async (event) => {
    event.preventDefault();
    if (!ledgerForm.ledger_name.trim() || !ledgerForm.group_id) {
      toast.error('Ledger name and account group are required');
      return;
    }
    try {
      setSaving(true);
      await accountingApi.createLedger({
        company_id: companyId,
        group_id: ledgerForm.group_id,
        ledger_name: ledgerForm.ledger_name,
        ledger_code: ledgerForm.ledger_code,
        opening_balance: Number(ledgerForm.opening_balance || 0),
        opening_balance_type: ledgerForm.opening_balance_type,
        opening_balance_date: ledgerForm.opening_balance_date,
        notes: ledgerForm.notes
      });
      toast.success('Ledger created successfully');
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

  // Edit Ledger
  const openEditLedger = (ledger) => {
    setEditingLedger(ledger);
    setLedgerForm({
      group_id: ledger.group_id || '',
      ledger_name: ledger.ledger_name || '',
      ledger_code: ledger.ledger_code || '',
      opening_balance: ledger.opening_balance ?? '',
      opening_balance_type: ledger.opening_balance_type || 'DR',
      opening_balance_date: ledger.opening_balance_date ? ledger.opening_balance_date.split('T')[0] : '',
      notes: ledger.notes || ''
    });
  };

  const handleUpdateLedger = async (event) => {
    event.preventDefault();
    if (!ledgerForm.ledger_name.trim() || !ledgerForm.group_id) {
      toast.error('Ledger name and account group are required');
      return;
    }
    try {
      setSaving(true);
      await accountingApi.updateLedger(editingLedger.ledger_id, {
        company_id: companyId,
        group_id: ledgerForm.group_id,
        ledger_name: ledgerForm.ledger_name,
        ledger_code: ledgerForm.ledger_code,
        opening_balance: Number(ledgerForm.opening_balance || 0),
        opening_balance_type: ledgerForm.opening_balance_type,
        opening_balance_date: ledgerForm.opening_balance_date,
        notes: ledgerForm.notes
      });
      toast.success(`Ledger "${ledgerForm.ledger_name}" updated successfully`);
      setEditingLedger(null);
      setLedgerForm(emptyLedger);
      await loadData();
      if (statementLedger && statementLedger.ledger_id === editingLedger.ledger_id) {
        loadStatement(editingLedger.ledger_id);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Unable to update ledger');
    } finally {
      setSaving(false);
    }
  };

  // Delete Ledger
  const handleDeleteLedger = async () => {
    if (!deletingLedger) return;
    try {
      setSaving(true);
      const res = await accountingApi.deleteLedger(deletingLedger.ledger_id);
      toast.success(res.data?.message || 'Ledger deleted successfully');
      setDeletingLedger(null);
      await loadData();
      if (statementLedger && statementLedger.ledger_id === deletingLedger.ledger_id) {
        closeStatement();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Cannot delete this ledger.');
      setDeletingLedger(null);
    } finally {
      setSaving(false);
    }
  };

  // Save Bank
  const saveBank = async (event) => {
    event.preventDefault();
    if (!bankForm.bank_name.trim() || !bankForm.account_number.trim() || !bankForm.ifsc_code.trim()) {
      toast.error('Bank name, account number, and IFSC code are required');
      return;
    }
    try {
      setSaving(true);
      await accountingApi.createBankAccount({ ...bankForm, company_id: companyId });
      toast.success('Bank account and ledger added successfully');
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Page Header */}
      <header className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Ledger Management</h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                Tally Double-Entry
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Chart of accounts, real-time running statements, and double-entry balances
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLedgerForm(emptyLedger);
              setShowLedgerForm(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" /> New Ledger
          </button>
          <button
            onClick={() => {
              setBankForm(emptyBank);
              setShowBankForm(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Landmark className="w-3.5 h-3.5" /> New Bank
          </button>
          <button
            onClick={loadData}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition"
            title="Refresh Ledger List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </header>

      {/* KPI Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Total Assets', totals.assets, 'text-blue-600', 'bg-blue-50 border-blue-100'],
          ['Total Liabilities', totals.liabilities, 'text-amber-600', 'bg-amber-50 border-amber-100'],
          ['Cash in Hand', totals.cash, 'text-emerald-600', 'bg-emerald-50 border-emerald-100'],
          ['Bank Balances', totals.banks, 'text-indigo-600', 'bg-indigo-50 border-indigo-100']
        ].map(([label, value, color, bg]) => (
          <div key={label} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
              <p className={`text-xl font-bold font-mono mt-1 ${color}`}>{money(value)}</p>
            </div>
            <div className={`p-2.5 rounded-xl border ${bg}`}>
              <Wallet className={`w-5 h-5 ${color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Ledger Table Card */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'].map((nature) => (
              <button
                key={nature}
                onClick={() => setActiveNature(nature)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeNature === nature
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {nature}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeGroup}
              onChange={(e) => setActiveGroup(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Account Groups</option>
              {groups.map((g) => (
                <option key={g.group_id} value={g.group_id}>
                  {g.group_name} ({g.nature})
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ledger or code..."
                className="w-52 pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        {/* Ledgers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-5 py-3">Ledger Name</th>
                <th className="px-5 py-3">Account Group</th>
                <th className="px-5 py-3">Nature</th>
                <th className="px-5 py-3 text-right">Opening Balance</th>
                <th className="px-5 py-3 text-right">Current Balance</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Loading accounts...
                  </td>
                </tr>
              ) : visibleLedgers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No ledgers match this view.
                  </td>
                </tr>
              ) : (
                visibleLedgers.map((ledger) => {
                  const isSystem = ledger.is_system_defined;
                  return (
                    <tr key={ledger.ledger_id} className="hover:bg-slate-50/70 transition group">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {ledger.ledger_name}
                          {isSystem && (
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-500 border border-slate-200 rounded text-[9px] font-mono">
                              SYSTEM
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{ledger.ledger_code}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 font-medium">{ledger.group_name}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${NATURE_COLORS[ledger.nature] || 'bg-slate-100 text-slate-600'}`}>
                          {ledger.nature}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-slate-500">
                        {money(ledger.opening_balance)}{' '}
                        <span className="text-[10px] font-bold">{ledger.opening_balance_type}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">
                        {money(ledger.current_balance)}{' '}
                        <span className={`text-[10px] font-bold ${ledger.current_balance_type === 'DR' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                          {ledger.current_balance_type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openStatement(ledger)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] flex items-center gap-1 transition"
                            title="View Statement"
                          >
                            <Eye className="w-3.5 h-3.5" /> Statement
                          </button>
                          <button
                            onClick={() => openEditLedger(ledger)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                            title="Edit Ledger Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingLedger(ledger)}
                            disabled={isSystem}
                            className={`p-1.5 rounded-lg transition ${
                              isSystem
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'hover:bg-rose-50 text-rose-600'
                            }`}
                            title={isSystem ? 'System accounts cannot be deleted' : 'Delete Ledger'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bank Accounts Master List */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-slate-900 text-sm">Bank Accounts & Linked Ledgers</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">{bankAccounts.length} account(s) registered</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-5 py-3">Bank & Account Name</th>
                <th className="px-5 py-3">Account Number</th>
                <th className="px-5 py-3">IFSC Code</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3 text-right">Current Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {bankAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400 font-sans">
                    No bank accounts registered yet.
                  </td>
                </tr>
              ) : (
                bankAccounts.map((account) => (
                  <tr key={account.bank_account_id} className="hover:bg-emerald-50/30 transition">
                    <td className="px-5 py-3 font-sans">
                      <span className="font-semibold text-slate-900">{account.bank_name}</span>
                      <span className="block text-[10px] text-slate-400 font-sans">{account.account_holder_name || '—'}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">•••• {account.account_number.slice(-4)}</td>
                    <td className="px-5 py-3 text-slate-600">{account.ifsc_code}</td>
                    <td className="px-5 py-3 font-sans text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-[10px]">{account.account_type}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900">
                      {money(account.current_balance)}{' '}
                      <span className="text-[10px] text-emerald-700 font-bold">{account.current_balance_type}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Slide-Over Drawer: Ledger Statement */}
      {statementLedger && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">{statementLedger.ledger_name}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 text-[10px] font-mono font-bold">
                    {statementLedger.ledger_code}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${NATURE_COLORS[statementLedger.nature] || ''}`}>
                    {statementLedger.nature}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Parent Group: {statementLedger.group_name} · Real-time ledger statement & running balance
                </p>
              </div>
              <button
                onClick={closeStatement}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Toolbar */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 font-semibold text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> From:
                  <input
                    type="date"
                    value={statementFilters.from_date}
                    onChange={(e) => setStatementFilters({ ...statementFilters, from_date: e.target.value })}
                    className="border border-slate-200 rounded-lg px-2 py-1 bg-white"
                  />
                </label>
                <label className="flex items-center gap-1 font-semibold text-slate-600">
                  To:
                  <input
                    type="date"
                    value={statementFilters.to_date}
                    onChange={(e) => setStatementFilters({ ...statementFilters, to_date: e.target.value })}
                    className="border border-slate-200 rounded-lg px-2 py-1 bg-white"
                  />
                </label>
                <select
                  value={statementFilters.voucher_type}
                  onChange={(e) => setStatementFilters({ ...statementFilters, voucher_type: e.target.value })}
                  className="border border-slate-200 rounded-lg px-2.5 py-1 bg-white"
                >
                  <option value="">All Voucher Types</option>
                  <option value="PAYMENT">Payment</option>
                  <option value="RECEIPT">Receipt</option>
                  <option value="CONTRA">Contra</option>
                  <option value="JOURNAL">Journal</option>
                  <option value="SALES">Sales</option>
                  <option value="PURCHASE">Purchase</option>
                </select>
                <button
                  onClick={() => loadStatement(statementLedger.ledger_id, statementFilters)}
                  className="px-3 py-1 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
                >
                  Apply
                </button>
              </div>
              <button
                onClick={() => {
                  const reset = { from_date: '', to_date: '', voucher_type: '' };
                  setStatementFilters(reset);
                  loadStatement(statementLedger.ledger_id, reset);
                }}
                className="text-slate-500 hover:text-slate-800 underline"
              >
                Reset filters
              </button>
            </div>

            {/* Statement Summary KPI Cards */}
            {statementData && (
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border-b border-slate-200/80">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Opening Balance</p>
                  <p className="text-base font-bold font-mono text-slate-900 mt-1">
                    {money(statementData.period_opening_balance)}{' '}
                    <span className="text-xs font-semibold text-indigo-600">{statementData.period_opening_balance_type}</span>
                  </p>
                </div>
                <div className="bg-rose-50/40 p-3 rounded-xl border border-rose-100">
                  <p className="text-[10px] uppercase font-bold text-rose-600">Total Debit (+)</p>
                  <p className="text-base font-bold font-mono text-rose-700 mt-1">
                    {money(statementData.totals?.total_debit)}
                  </p>
                </div>
                <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
                  <p className="text-[10px] uppercase font-bold text-emerald-600">Total Credit (-)</p>
                  <p className="text-base font-bold font-mono text-emerald-700 mt-1">
                    {money(statementData.totals?.total_credit)}
                  </p>
                </div>
                <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100">
                  <p className="text-[10px] uppercase font-bold text-indigo-600">Closing Balance</p>
                  <p className="text-base font-bold font-mono text-indigo-900 mt-1">
                    {money(statementData.totals?.closing_balance)}{' '}
                    <span className="text-xs font-semibold text-indigo-700">{statementData.totals?.closing_balance_type}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Statement Transactions Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Voucher #</th>
                    <th className="px-3 py-2.5">Type</th>
                    <th className="px-3 py-2.5">Particulars (Contra Accounts)</th>
                    <th className="px-3 py-2.5 text-right">Debit (₹)</th>
                    <th className="px-3 py-2.5 text-right">Credit (₹)</th>
                    <th className="px-3 py-2.5 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {statementLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 font-sans">
                        Loading statement lines...
                      </td>
                    </tr>
                  ) : !statementData || statementData.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 font-sans">
                        No transactions recorded for this ledger in the selected date range.
                      </td>
                    </tr>
                  ) : (
                    statementData.transactions.map((tx) => (
                      <tr
                        key={tx.line_id}
                        onClick={() => openVoucherDetail(tx.voucher_id)}
                        className="hover:bg-indigo-50/40 cursor-pointer transition"
                        title="Click to view voucher details"
                      >
                        <td className="px-3 py-2.5 text-slate-600 font-sans whitespace-nowrap">
                          {tx.voucher_date ? tx.voucher_date.split('T')[0] : '—'}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-indigo-600">{tx.voucher_number}</td>
                        <td className="px-3 py-2.5 font-sans">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${VOUCHER_TYPE_COLORS[tx.voucher_type_code?.replace('VCH-', '')] || 'bg-slate-100 text-slate-700'}`}>
                            {tx.voucher_type_name || tx.voucher_type_code}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-sans text-slate-800 font-medium">
                          {tx.particulars || 'Voucher Entry'}
                          {tx.line_narration && (
                            <span className="block text-[10px] text-slate-400 italic font-sans">{tx.line_narration}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-slate-900">
                          {parseFloat(tx.debit_amount) > 0 ? money(tx.debit_amount) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-slate-900">
                          {parseFloat(tx.credit_amount) > 0 ? money(tx.credit_amount) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                          {money(tx.running_balance)}{' '}
                          <span className={`text-[10px] font-bold ${tx.running_balance_type === 'DR' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                            {tx.running_balance_type}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Clicking any line opens full multi-legged voucher details.
              </span>
              <button
                onClick={closeStatement}
                className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Detail Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-indigo-300">Voucher Details</p>
                <h3 className="text-lg font-bold">
                  {selectedVoucher.voucher_number} · {selectedVoucher.voucher_type_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedVoucher(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block">Date</span>
                  <span className="font-semibold text-slate-900">
                    {selectedVoucher.voucher_date ? selectedVoucher.voucher_date.split('T')[0] : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Reference No</span>
                  <span className="font-semibold text-slate-900">{selectedVoucher.reference_number || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status</span>
                  <span className="font-bold text-emerald-600">POSTED (Active)</span>
                </div>
                {selectedVoucher.narration && (
                  <div className="col-span-3 pt-1 border-t border-slate-200">
                    <span className="text-slate-400 block">Narration</span>
                    <span className="italic text-slate-700">{selectedVoucher.narration}</span>
                  </div>
                )}
              </div>

              {/* Lines Table */}
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Account (Ledger)</th>
                    <th className="px-3 py-2 text-right">Debit (₹)</th>
                    <th className="px-3 py-2 text-right">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(selectedVoucher.lines || []).map((l, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-sans font-medium text-slate-900">{l.ledger_name}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">
                        {parseFloat(l.debit_amount) > 0 ? money(l.debit_amount) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">
                        {parseFloat(l.credit_amount) > 0 ? money(l.credit_amount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedVoucher(null)}
                className="px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Ledger Modal */}
      {(showLedgerForm || editingLedger) && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={editingLedger ? handleUpdateLedger : saveLedger}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150"
          >
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-indigo-300">
                  {editingLedger ? 'Update Master' : 'New Account'}
                </p>
                <h2 className="text-lg font-bold">
                  {editingLedger ? `Edit Ledger: ${editingLedger.ledger_name}` : 'Create New Ledger'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLedgerForm(false);
                  setEditingLedger(null);
                }}
                className="text-slate-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-5 grid grid-cols-2 gap-3 text-xs">
              <label className="col-span-2 font-semibold text-slate-700">
                Parent Account Group *
                <select
                  required
                  name="group_id"
                  value={ledgerForm.group_id}
                  onChange={update(setLedgerForm)}
                  className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select the parent group</option>
                  {groups.map((group) => (
                    <option key={group.group_id} value={group.group_id}>
                      {group.group_name} · {group.nature}
                    </option>
                  ))}
                </select>
              </label>

              <label className="col-span-2 font-semibold text-slate-700">
                Ledger Name *
                <input
                  required
                  name="ledger_name"
                  value={ledgerForm.ledger_name}
                  onChange={update(setLedgerForm)}
                  placeholder="e.g. Office Rent Expense, HDFC Bank, etc."
                  className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>

              <label className="font-semibold text-slate-700">
                Ledger Code
                <input
                  name="ledger_code"
                  value={ledgerForm.ledger_code}
                  onChange={update(setLedgerForm)}
                  placeholder="e.g. LED-RENT-01"
                  className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>

              <label className="font-semibold text-slate-700">
                Opening Balance Date
                <input
                  type="date"
                  name="opening_balance_date"
                  value={ledgerForm.opening_balance_date}
                  onChange={update(setLedgerForm)}
                  className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>

              <label className="col-span-2 font-semibold text-slate-700">
                Opening Balance & Nature
                <div className="flex mt-1">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="opening_balance"
                    value={ledgerForm.opening_balance}
                    onChange={update(setLedgerForm)}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-l-xl p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <select
                    name="opening_balance_type"
                    value={ledgerForm.opening_balance_type}
                    onChange={update(setLedgerForm)}
                    className="border border-l-0 border-slate-200 rounded-r-xl px-3 text-sm font-bold bg-slate-50 focus:outline-none"
                  >
                    <option value="DR">DR</option>
                    <option value="CR">CR</option>
                  </select>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Assets & Expenses normally have DR opening balances. Liabilities, Capital & Incomes have CR.
                </span>
              </label>

              <label className="col-span-2 font-semibold text-slate-700">
                Notes / Particulars
                <textarea
                  name="notes"
                  rows={2}
                  value={ledgerForm.notes}
                  onChange={update(setLedgerForm)}
                  placeholder="Optional details or instructions..."
                  className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowLedgerForm(false);
                  setEditingLedger(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                {saving ? 'Saving...' : editingLedger ? 'Update Ledger' : 'Create Ledger'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletingLedger && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Ledger Account</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">"{deletingLedger.ledger_name}"</strong>?
              According to accounting rules, a ledger can only be deleted if it has zero recorded transactions and is not linked to any profile or system default account.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingLedger(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={handleDeleteLedger}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition"
              >
                {saving ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Bank Form Modal */}
      {showBankForm && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={saveBank}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          >
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-emerald-300">Bank Master</p>
                <h2 className="text-lg font-bold">Add Bank Account</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowBankForm(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-5 grid grid-cols-2 gap-3 text-xs">
              {[
                ['bank_name', 'Bank Name *', 'e.g. HDFC Bank, SBI'],
                ['account_holder_name', 'Account Holder Name', 'e.g. Acme Corp Ltd'],
                ['account_number', 'Account Number *', 'Full account number'],
                ['ifsc_code', 'IFSC Code *', 'e.g. HDFC0001234'],
                ['branch_name', 'Branch Name', 'e.g. Koramangala']
              ].map(([name, label, placeholder]) => (
                <label key={name} className="font-semibold text-slate-700">
                  {label}
                  <input
                    required={['bank_name', 'account_number', 'ifsc_code'].includes(name)}
                    name={name}
                    value={bankForm[name]}
                    onChange={update(setBankForm)}
                    placeholder={placeholder}
                    className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </label>
              ))}

              <label className="font-semibold text-slate-700">
                Account Type
                <select
                  name="account_type"
                  value={bankForm.account_type}
                  onChange={update(setBankForm)}
                  className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="CURRENT">CURRENT</option>
                  <option value="SAVINGS">SAVINGS</option>
                  <option value="OVERDRAFT">OVERDRAFT</option>
                  <option value="CASH_CREDIT">CASH_CREDIT</option>
                </select>
              </label>

              <label className="col-span-2 font-semibold text-slate-700">
                Opening Balance
                <div className="flex mt-1">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="opening_balance"
                    value={bankForm.opening_balance}
                    onChange={update(setBankForm)}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-l-xl p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <select
                    name="opening_balance_type"
                    value={bankForm.opening_balance_type}
                    onChange={update(setBankForm)}
                    className="border border-l-0 border-slate-200 rounded-r-xl px-3 text-sm font-bold bg-slate-50 focus:outline-none"
                  >
                    <option value="DR">DR</option>
                    <option value="CR">CR</option>
                  </select>
                </div>
              </label>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBankForm(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                {saving ? 'Saving...' : 'Create Bank Account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default LedgerManagement;
