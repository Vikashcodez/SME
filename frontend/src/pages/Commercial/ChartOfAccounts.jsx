import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { accounting as accountingApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  BookOpen,
  FolderTree,
  Plus,
  Search,
  Filter,
  Eye,
  TrendingUp,
  CreditCard,
  Building2,
  DollarSign,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  Calendar,
  Edit2
} from 'lucide-react';

const NATURE_COLORS = {
  ASSET: 'text-blue-600 bg-blue-50 border-blue-200',
  LIABILITY: 'text-amber-600 bg-amber-50 border-amber-200',
  EQUITY: 'text-purple-600 bg-purple-50 border-purple-200',
  INCOME: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  EXPENSE: 'text-rose-600 bg-rose-50 border-rose-200'
};

const ChartOfAccounts = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [data, setData] = useState({ groups: [], ledgers: [] });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedNature, setSelectedNature] = useState('ALL');
  const [expandedGroups, setExpandedGroups] = useState({});

  // Ledger Statement Modal
  const [statementModal, setStatementModal] = useState(null);
  const [statementData, setStatementData] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);

  // New Ledger Modal
  const [isNewLedgerOpen, setIsNewLedgerOpen] = useState(false);
  const [ledgerForm, setLedgerForm] = useState({
    group_id: '',
    ledger_name: '',
    ledger_code: '',
    opening_balance: 0,
    opening_balance_type: 'DR',
    maintain_bill_by_bill: false
  });
  const [savingLedger, setSavingLedger] = useState(false);

  // Edit Ledger Modal
  const [editingLedger, setEditingLedger] = useState(null);
  const [editLedgerForm, setEditLedgerForm] = useState({
    group_id: '',
    ledger_name: '',
    ledger_code: '',
    opening_balance: 0,
    opening_balance_type: 'DR',
    maintain_bill_by_bill: false,
    notes: ''
  });
  const [savingEditLedger, setSavingEditLedger] = useState(false);

  const fetchCoA = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await accountingApi.getChartOfAccounts({ company_id: companyId });
      setData(res.data.data || { groups: [], ledgers: [] });
      // Expand all groups by default
      const exp = {};
      (res.data.data?.groups || []).forEach(g => { exp[g.group_id] = true; });
      setExpandedGroups(exp);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Chart of Accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoA();
  }, [companyId]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const openStatement = async (ledger) => {
    setStatementModal(ledger);
    try {
      setStatementLoading(true);
      const res = await accountingApi.getLedgerStatement(ledger.ledger_id);
      setStatementData(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load ledger transactions');
    } finally {
      setStatementLoading(false);
    }
  };

  const handleCreateLedger = async (e) => {
    e.preventDefault();
    if (!ledgerForm.group_id || !ledgerForm.ledger_name) {
      toast.error('Group and Ledger Name are required');
      return;
    }
    try {
      setSavingLedger(true);
      await accountingApi.createLedger({ ...ledgerForm, company_id: companyId });
      toast.success('Ledger created successfully!');
      setIsNewLedgerOpen(false);
      setLedgerForm({ group_id: '', ledger_name: '', ledger_code: '', opening_balance: 0, opening_balance_type: 'DR', maintain_bill_by_bill: false });
      fetchCoA();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error creating ledger');
    } finally {
      setSavingLedger(false);
    }
  };

  const openEditModal = (ledger) => {
    setEditingLedger(ledger);
    setEditLedgerForm({
      group_id: ledger.group_id || '',
      ledger_name: ledger.ledger_name || '',
      ledger_code: ledger.ledger_code || '',
      opening_balance: ledger.opening_balance ?? 0,
      opening_balance_type: ledger.opening_balance_type || 'DR',
      maintain_bill_by_bill: Boolean(ledger.maintain_bill_by_bill),
      notes: ledger.notes || ''
    });
  };

  const handleUpdateLedger = async (e) => {
    e.preventDefault();
    if (!editLedgerForm.group_id || !editLedgerForm.ledger_name?.trim()) {
      toast.error('Group and Ledger Name are required');
      return;
    }
    try {
      setSavingEditLedger(true);
      await accountingApi.updateLedger(editingLedger.ledger_id, {
        company_id: companyId,
        group_id: editLedgerForm.group_id,
        ledger_name: editLedgerForm.ledger_name.trim(),
        ledger_code: editLedgerForm.ledger_code ? editLedgerForm.ledger_code.trim().toUpperCase() : '',
        opening_balance: parseFloat(editLedgerForm.opening_balance) || 0,
        opening_balance_type: editLedgerForm.opening_balance_type,
        maintain_bill_by_bill: editLedgerForm.maintain_bill_by_bill,
        notes: editLedgerForm.notes
      });
      toast.success(`Ledger "${editLedgerForm.ledger_name}" updated successfully!`);
      const updatedLedgerId = editingLedger.ledger_id;
      setEditingLedger(null);
      await fetchCoA();
      if (statementModal && statementModal.ledger_id === updatedLedgerId) {
        setStatementModal(prev => ({
          ...prev,
          ...editLedgerForm,
          ledger_name: editLedgerForm.ledger_name.trim(),
          ledger_code: editLedgerForm.ledger_code ? editLedgerForm.ledger_code.trim().toUpperCase() : ''
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error updating ledger');
    } finally {
      setSavingEditLedger(false);
    }
  };

  // Group ledgers by group_id
  const ledgersByGroup = useMemo(() => {
    const map = {};
    data.ledgers.forEach(l => {
      if (!map[l.group_id]) map[l.group_id] = [];
      map[l.group_id].push(l);
    });
    return map;
  }, [data.ledgers]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    return data.groups.filter(g => {
      const matchNature = selectedNature === 'ALL' || g.nature === selectedNature;
      const matchSearch = search ? (
        g.group_name.toLowerCase().includes(search.toLowerCase()) ||
        (ledgersByGroup[g.group_id] || []).some(l => l.ledger_name.toLowerCase().includes(search.toLowerCase()))
      ) : true;
      return matchNature && matchSearch;
    });
  }, [data.groups, selectedNature, search, ledgersByGroup]);

  // Overall Stats
  const totals = useMemo(() => {
    const totalLedgers = data.ledgers.length;
    const totalGroups = data.groups.length;
    const assetBal = data.ledgers.reduce((acc, l) => {
      const balance = parseFloat(l.current_balance || 0);
      const isInputTax = String(l.ledger_code || '').startsWith('LED-TAX-IN-');
      if (l.nature === 'ASSET' || isInputTax) return acc + balance;
      return acc;
    }, 0);
    const liabBal = data.ledgers.reduce((acc, l) => {
      const balance = parseFloat(l.current_balance || 0);
      const isInputTax = String(l.ledger_code || '').startsWith('LED-TAX-IN-');
      if (l.nature === 'LIABILITY' && !isInputTax) return acc + (l.current_balance_type === 'CR' ? balance : 0);
      return acc;
    }, 0);
    return { totalLedgers, totalGroups, assetBal, liabBal };
  }, [data]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Chart of Accounts & Ledgers</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Your Tally-style account tree. Assets and expenses normally carry debit balances; liabilities, capital, and income normally carry credit balances.
          </p>
        </div>
        <button
          onClick={() => setIsNewLedgerOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create New Ledger
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Groups</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{totals.totalGroups}</h3>
          <p className="text-xs text-slate-500 mt-1">Classification nodes</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total General Ledgers</p>
          <h3 className="text-2xl font-bold text-indigo-600 mt-1">{totals.totalLedgers}</h3>
          <p className="text-xs text-slate-500 mt-1">Unified posting accounts</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current Assets Bal</p>
          <h3 className="text-2xl font-bold text-blue-600 mt-1">₹{totals.assetBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs text-slate-500 mt-1">Bank, Cash, Sundry Debtors</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Liabilities & Tax Bal</p>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">₹{totals.liabBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs text-slate-500 mt-1">Duties, Creditors, Capital</p>
        </div>
      </div>

      {/* Filter / Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search group or ledger name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'].map(nature => (
            <button
              key={nature}
              onClick={() => setSelectedNature(nature)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                selectedNature === nature
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {nature}
            </button>
          ))}
        </div>
      </div>

      {/* Hierarchical Tree of Groups & Ledgers */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading Chart of Accounts...</div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No account groups found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredGroups.map(group => {
              const ledgers = ledgersByGroup[group.group_id] || [];
              const isExpanded = expandedGroups[group.group_id];

              return (
                <div key={group.group_id} className="transition">
                  {/* Group Row */}
                  <div
                    onClick={() => toggleGroup(group.group_id)}
                    className="flex items-center justify-between px-6 py-3.5 bg-slate-50/60 hover:bg-slate-100/60 cursor-pointer select-none transition"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="font-semibold text-slate-900 text-sm">{group.group_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${NATURE_COLORS[group.nature] || ''}`}>
                        {group.nature}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">({group.group_code})</span>
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                      {ledgers.length} {ledgers.length === 1 ? 'Ledger' : 'Ledgers'}
                    </div>
                  </div>

                  {/* Ledgers inside group */}
                  {isExpanded && ledgers.length > 0 && (
                    <div className="pl-12 pr-6 divide-y divide-slate-50 bg-white">
                      {ledgers.map(l => (
                        <div key={l.ledger_id} className="flex items-center justify-between py-3 hover:bg-indigo-50/30 px-3 rounded-lg transition">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <div>
                              <div className="text-sm font-medium text-slate-800">{l.ledger_name}</div>
                              <div className="text-xs text-slate-400 font-mono">{l.ledger_code}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-semibold text-slate-900">
                                ₹{parseFloat(l.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {l.current_balance_type}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Op: ₹{parseFloat(l.opening_balance || 0).toLocaleString()} {l.opening_balance_type}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openEditModal(l)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                                title="Edit Ledger"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                                Edit
                              </button>
                              <button
                                onClick={() => openStatement(l)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Statement
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isExpanded && ledgers.length === 0 && (
                    <div className="pl-14 py-2 text-xs text-slate-400 italic">
                      No ledgers under this group.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ledger Statement Modal */}
      {statementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{statementModal.ledger_name} - Ledger Book</h3>
                <p className="text-xs text-slate-500 font-mono">Code: {statementModal.ledger_code} | Nature: {statementModal.nature}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(statementModal)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-indigo-200"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Ledger
                </button>
                <button onClick={() => setStatementModal(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500">Opening Balance:</span>
                  <span className="ml-2 font-bold text-slate-900">
                    ₹{parseFloat(statementData?.opening_balance || statementModal.opening_balance || 0).toLocaleString()} {statementModal.opening_balance_type}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Current Closing Balance:</span>
                  <span className="ml-2 font-bold text-indigo-600">
                    ₹{parseFloat(statementModal.current_balance || 0).toLocaleString()} {statementModal.current_balance_type}
                  </span>
                </div>
              </div>

              {statementLoading ? (
                <div className="py-12 text-center text-slate-400">Loading ledger statement...</div>
              ) : statementData?.transactions?.length === 0 ? (
                <div className="py-12 text-center text-slate-400">No voucher transactions posted for this ledger yet.</div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Voucher Type & #</th>
                        <th className="p-3">Narration / Particulars</th>
                        <th className="p-3 text-right">Debit (₹)</th>
                        <th className="p-3 text-right">Credit (₹)</th>
                        <th className="p-3 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {statementData?.transactions?.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(t.voucher_date).toLocaleDateString()}</td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-900">{t.voucher_type_name}</span>
                            <div className="text-slate-400 font-mono">{t.voucher_number}</div>
                          </td>
                          <td className="p-3 text-slate-700 max-w-xs truncate">{t.line_narration || t.voucher_narration || '-'}</td>
                          <td className="p-3 text-right font-medium text-slate-900">
                            {parseFloat(t.debit_amount) > 0 ? parseFloat(t.debit_amount).toFixed(2) : '-'}
                          </td>
                          <td className="p-3 text-right font-medium text-slate-900">
                            {parseFloat(t.credit_amount) > 0 ? parseFloat(t.credit_amount).toFixed(2) : '-'}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            ₹{t.running_balance} {t.running_balance_type}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Ledger Modal */}
      {isNewLedgerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Create New Ledger Account
              </h3>
              <button onClick={() => setIsNewLedgerOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLedger} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Group *</label>
                <select
                  required
                  value={ledgerForm.group_id}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, group_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select Parent Account Group...</option>
                  {data.groups.map(g => (
                    <option key={g.group_id} value={g.group_id}>
                      {g.group_name} ({g.nature})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ledger Name *</label>
                <input
                  type="text"
                  required
                  value={ledgerForm.ledger_name}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, ledger_name: e.target.value })}
                  placeholder="e.g. HDFC Current Account or Factory Rent"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                >
                </input>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ledger Code (Optional)</label>
                <input
                  type="text"
                  value={ledgerForm.ledger_code}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, ledger_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. BANK_HDFC_01"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ledgerForm.opening_balance}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, opening_balance: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Balance Type</label>
                  <select
                    value={ledgerForm.opening_balance_type}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, opening_balance_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="DR">DR (Debit)</option>
                    <option value="CR">CR (Credit)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewLedgerOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLedger}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {savingLedger ? 'Saving...' : 'Create Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Ledger Modal */}
      {editingLedger && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-indigo-600 font-bold">Edit Account</p>
                <h3 className="text-lg font-bold text-slate-900">Edit Ledger: {editingLedger.ledger_name}</h3>
              </div>
              <button onClick={() => setEditingLedger(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLedger} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Account Group *</label>
                <select
                  required
                  value={editLedgerForm.group_id}
                  onChange={(e) => setEditLedgerForm({ ...editLedgerForm, group_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select Parent Group</option>
                  {data.groups.map(g => (
                    <option key={g.group_id} value={g.group_id}>
                      {g.group_name} ({g.nature})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ledger Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Sales Account, HDFC Bank, Office Rent"
                  value={editLedgerForm.ledger_name}
                  onChange={(e) => setEditLedgerForm({ ...editLedgerForm, ledger_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ledger Code</label>
                <input
                  type="text"
                  placeholder="e.g. LED-SALES-01 (Auto-generated if blank)"
                  value={editLedgerForm.ledger_code}
                  onChange={(e) => setEditLedgerForm({ ...editLedgerForm, ledger_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editLedgerForm.opening_balance}
                    onChange={(e) => setEditLedgerForm({ ...editLedgerForm, opening_balance: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Balance Type</label>
                  <select
                    value={editLedgerForm.opening_balance_type}
                    onChange={(e) => setEditLedgerForm({ ...editLedgerForm, opening_balance_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="DR">DR (Debit)</option>
                    <option value="CR">CR (Credit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Description</label>
                <textarea
                  rows="2"
                  placeholder="Optional notes or details..."
                  value={editLedgerForm.notes}
                  onChange={(e) => setEditLedgerForm({ ...editLedgerForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit_maintain_bill"
                  checked={editLedgerForm.maintain_bill_by_bill}
                  onChange={(e) => setEditLedgerForm({ ...editLedgerForm, maintain_bill_by_bill: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="edit_maintain_bill" className="text-xs text-slate-600 select-none">
                  Maintain balances bill-by-bill (for Debtors / Creditors)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLedger(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditLedger}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {savingEditLedger ? 'Saving...' : 'Update Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartOfAccounts;
