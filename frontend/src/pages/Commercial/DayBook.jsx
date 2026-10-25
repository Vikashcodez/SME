import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { accounting as accountingApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Calendar,
  Filter,
  Eye,
  Plus,
  RefreshCw,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  X,
  BarChart3,
  MousePointer2
} from 'lucide-react';

const VOUCHER_TYPE_COLORS = {
  SALES: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PURCHASE: 'bg-blue-50 text-blue-700 border-blue-200',
  RECEIPT: 'bg-teal-50 text-teal-700 border-teal-200',
  PAYMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  CONTRA: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  JOURNAL: 'bg-purple-50 text-purple-700 border-purple-200',
  CREDIT_NOTE: 'bg-pink-50 text-pink-700 border-pink-200',
  DEBIT_NOTE: 'bg-orange-50 text-orange-700 border-orange-200',
};
const INCOME_CATEGORIES = ['SALES', 'RECEIPT'];
const EXPENSE_CATEGORIES = ['PURCHASE', 'PAYMENT', 'DEBIT_NOTE'];

const DayBook = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedGraphDate, setSelectedGraphDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [dayBookData, setDayBookData] = useState({
    count: 0,
    total_amount: '0.00',
    total_debit: '0.00',
    total_credit: '0.00',
    vouchers: []
  });
  const [chartVouchers, setChartVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New manual voucher modal state
  const [isNewVoucherOpen, setIsNewVoucherOpen] = useState(false);
  const [newVoucherForm, setNewVoucherForm] = useState({
    voucher_type_code: 'JOURNAL',
    voucher_date: new Date().toISOString().split('T')[0],
    narration: '',
    reference_number: '',
    lines: [
      { ledger_id: '', debit_amount: '', credit_amount: '', narration: '' },
      { ledger_id: '', debit_amount: '', credit_amount: '', narration: '' }
    ]
  });
  const [ledgersList, setLedgersList] = useState([]);

  const fetchDayBook = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await accountingApi.getDayBook({
        company_id: companyId,
        from_date: fromDate,
        to_date: toDate,
        voucher_type: selectedType || undefined
      });
      setDayBookData(res.data.data || {
        count: 0,
        total_amount: '0.00',
        total_debit: '0.00',
        total_credit: '0.00',
        vouchers: []
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Day Book');
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    if (!companyId) return;
    const today = new Date();
    const financialYearStart = `${today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1}-04-01`;

    try {
      const res = await accountingApi.getDayBook({
        company_id: companyId,
        from_date: financialYearStart,
        to_date: today.toISOString().split('T')[0],
        voucher_type: selectedType || undefined
      });
      setChartVouchers(res.data.data?.vouchers || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load day-wise chart');
    }
  };

  const fetchLedgers = async () => {
    if (!companyId) return;
    try {
      const res = await accountingApi.getLedgers({ company_id: companyId });
      setLedgersList(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDayBook();
  }, [companyId, fromDate, toDate, selectedType]);

  useEffect(() => {
    fetchChartData();
  }, [companyId, selectedType]);

  useEffect(() => {
    fetchLedgers();
  }, [companyId]);

  const handleOpenVoucherModal = async (v) => {
    try {
      const res = await accountingApi.getVoucherById(v.voucher_id);
      setSelectedVoucher(res.data.data);
      setIsModalOpen(true);
    } catch (err) {
      toast.error('Failed to load voucher details');
    }
  };

  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    try {
      const parsedLines = newVoucherForm.lines
        .filter(l => l.ledger_id && (parseFloat(l.debit_amount) > 0 || parseFloat(l.credit_amount) > 0))
        .map(l => ({
          ledger_id: parseInt(l.ledger_id),
          debit_amount: parseFloat(l.debit_amount) || 0,
          credit_amount: parseFloat(l.credit_amount) || 0,
          narration: l.narration
        }));

      const totalDr = parsedLines.reduce((s, l) => s + l.debit_amount, 0);
      const totalCr = parsedLines.reduce((s, l) => s + l.credit_amount, 0);

      if (Math.abs(totalDr - totalCr) > 0.01) {
        toast.error(`Voucher is not balanced! Total Debit (₹${totalDr.toFixed(2)}) must equal Total Credit (₹${totalCr.toFixed(2)})`);
        return;
      }

      await accountingApi.createVoucher({
        ...newVoucherForm,
        company_id: companyId,
        lines: parsedLines
      });

      toast.success('Voucher created and posted successfully!');
      setIsNewVoucherOpen(false);
      fetchDayBook();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create voucher');
    }
  };

  const dailySummaries = useMemo(() => {
    const summaries = new Map();

    chartVouchers.forEach((voucher) => {
      const date = voucher.voucher_date?.split('T')[0] || voucher.voucher_date;
      if (!date) return;

      const summary = summaries.get(date) || {
        date,
        count: 0,
        income: 0,
        expense: 0
      };
      summary.count += 1;
      if (INCOME_CATEGORIES.includes(voucher.base_category)) {
        summary.income += parseFloat(voucher.total_credit) || parseFloat(voucher.total_debit) || 0;
      } else if (EXPENSE_CATEGORIES.includes(voucher.base_category)) {
        summary.expense += parseFloat(voucher.total_debit) || parseFloat(voucher.total_credit) || 0;
      }
      summaries.set(date, summary);
    });

    return Array.from(summaries.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [chartVouchers]);

  const visibleVouchers = useMemo(() => (
    selectedGraphDate
      ? chartVouchers.filter((voucher) => voucher.voucher_date?.startsWith(selectedGraphDate))
      : dayBookData.vouchers
  ), [chartVouchers, dayBookData.vouchers, selectedGraphDate]);

  const transactionTotals = useMemo(() => visibleVouchers.reduce((totals, voucher) => {
    if (INCOME_CATEGORIES.includes(voucher.base_category)) {
      totals.income += parseFloat(voucher.total_credit) || parseFloat(voucher.total_debit) || 0;
      totals.incomeCount += 1;
    } else if (EXPENSE_CATEGORIES.includes(voucher.base_category)) {
      totals.expense += parseFloat(voucher.total_debit) || parseFloat(voucher.total_credit) || 0;
      totals.expenseCount += 1;
    }
    return totals;
  }, { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 }), [visibleVouchers]);

  const selectedDaySummary = dailySummaries.find((summary) => summary.date === selectedGraphDate);
  const chartMax = Math.max(...dailySummaries.flatMap((summary) => [summary.income, summary.expense]), 1);
  const formatDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short'
  });

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">Day Book</h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
                  Double-entry verified
                </span>
              </div>
              <p className="text-xs text-slate-500">Daily transaction register</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <label className="text-slate-400">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setSelectedGraphDate('');
                }}
                className="w-[125px] bg-transparent border-none text-slate-700 font-medium focus:outline-none"
              />
              <label className="text-slate-400">To</label>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setSelectedGraphDate('');
                }}
                className="w-[125px] bg-transparent border-none text-slate-700 font-medium focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setSelectedGraphDate('');
                }}
                className="max-w-[145px] bg-transparent border-none text-slate-700 font-medium focus:outline-none"
              >
                <option value="">All Voucher Types</option>
                <option value="VCH-SALES">Sales Invoice</option>
                <option value="VCH-PURCHASE">Purchase Invoice</option>
                <option value="VCH-RECEIPT">Receipt Voucher</option>
                <option value="VCH-PAYMENT">Payment Voucher</option>
                <option value="VCH-CONTRA">Contra Voucher</option>
                <option value="VCH-JOURNAL">Journal Voucher</option>
                <option value="VCH-CRNOTE">Credit Note</option>
                <option value="VCH-DRNOTE">Debit Note</option>
              </select>
            </div>

            <button
              onClick={() => setIsNewVoucherOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              New Voucher
            </button>

            <button
              onClick={() => window.print()}
              className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600"
              title="Print Day Book"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="p-4 bg-white">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Transactions</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{visibleVouchers.length}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="p-4 bg-white">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Income (Credit)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">₹{transactionTotals.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            <p className="text-[11px] text-slate-400 mt-1">{transactionTotals.incomeCount} sales / receipt entries</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="p-4 bg-white">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expense (Debit)</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">₹{transactionTotals.expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            <p className="text-[11px] text-slate-400 mt-1">{transactionTotals.expenseCount} purchase / payment entries</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Day Book Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3">
          <div className="p-4 bg-white">
            <h2 className="font-bold text-slate-900">
              {selectedDaySummary ? `Transactions for ${formatDate(selectedDaySummary.date)}` : 'Day Book Transactions'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {selectedDaySummary ? `${selectedDaySummary.count} transaction${selectedDaySummary.count === 1 ? '' : 's'} selected from the graph` : 'Select a graph column to focus on one day'}
            </p>
          </div>
          {selectedGraphDate && (
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
              {formatDate(selectedGraphDate)}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Voucher No</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Particulars</th>
                <th className="py-3.5 px-4 text-right">Debit (₹)</th>
                <th className="py-3.5 px-4 text-right">Credit (₹)</th>
                <th className="py-3.5 px-4">Narration</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading Day Book transactions...
                  </td>
                </tr>
              ) : visibleVouchers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No transactions recorded on this date.
                  </td>
                </tr>
              ) : (
                visibleVouchers.map((v) => (
                  <tr
                    key={v.voucher_id}
                    onClick={() => handleOpenVoucherModal(v)}
                    className={`cursor-pointer transition ${INCOME_CATEGORIES.includes(v.base_category) ? 'bg-emerald-50/30 hover:bg-emerald-50' : EXPENSE_CATEGORIES.includes(v.base_category) ? 'bg-rose-50/30 hover:bg-rose-50' : 'hover:bg-slate-50/70'}`}
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {v.voucher_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${VOUCHER_TYPE_COLORS[v.base_category] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {v.voucher_type_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-7 rounded-full ${INCOME_CATEGORIES.includes(v.base_category) ? 'bg-emerald-500' : EXPENSE_CATEGORIES.includes(v.base_category) ? 'bg-rose-500' : 'bg-slate-300'}`} />
                        <span>{v.particulars}</span>
                      </div>
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono font-semibold ${EXPENSE_CATEGORIES.includes(v.base_category) ? 'text-rose-700' : 'text-slate-900'}`}>
                      ₹{parseFloat(v.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono font-semibold ${INCOME_CATEGORIES.includes(v.base_category) ? 'text-emerald-700' : 'text-slate-900'}`}>
                      ₹{parseFloat(v.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {v.narration || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenVoucherModal(v)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="View Full Double-Entry Lines"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {visibleVouchers.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan="3" className="py-3.5 px-4 uppercase text-xs tracking-wider font-bold text-slate-600">
                    Selection summary ({visibleVouchers.length} transactions)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-700">
                    <span className="block text-[10px] font-sans uppercase tracking-wide text-slate-400">Expense</span>
                    ₹{transactionTotals.expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                    <span className="block text-[10px] font-sans uppercase tracking-wide text-slate-400">Income</span>
                    ₹{transactionTotals.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Day-wise chart */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-slate-900">Day-wise income & expense</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Current financial year · select a day to open its transactions
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Income
            </span>
            <span className="flex items-center gap-1.5 text-rose-700">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Expense
            </span>
            {selectedGraphDate && (
              <button
                type="button"
                onClick={() => setSelectedGraphDate('')}
                className="ml-1 px-2 py-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="p-4">
          {dailySummaries.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-sm text-slate-400">
              No daily activity in the selected period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="h-44 flex items-end gap-2 sm:gap-3 border-b border-slate-200 px-2">
                  {dailySummaries.map((summary) => {
                    const isSelected = summary.date === selectedGraphDate;
                    const incomeHeight = summary.income > 0 ? Math.max((summary.income / chartMax) * 100, 4) : 0;
                    const expenseHeight = summary.expense > 0 ? Math.max((summary.expense / chartMax) * 100, 4) : 0;
                    return (
                      <button
                        type="button"
                        key={summary.date}
                        onClick={() => setSelectedGraphDate(isSelected ? '' : summary.date)}
                        className={`group flex-1 min-w-14 h-full flex flex-col justify-end items-center rounded-lg px-1 pt-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'}`}
                        title={`${formatDate(summary.date)} · Income ₹${summary.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })} · Expense ₹${summary.expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                      >
                        <div className="flex items-end justify-center gap-1 h-full w-full">
                          <span
                            className="w-1/2 max-w-6 rounded-t-sm bg-emerald-500 group-hover:bg-emerald-600 transition-all"
                            style={{ height: `${incomeHeight}%` }}
                          />
                          <span
                            className="w-1/2 max-w-6 rounded-t-sm bg-rose-500 group-hover:bg-rose-600 transition-all"
                            style={{ height: `${expenseHeight}%` }}
                          />
                        </div>
                        <span className={`text-[10px] mt-2 whitespace-nowrap ${isSelected ? 'font-bold text-indigo-700' : 'text-slate-500'}`}>
                          {formatDate(summary.date)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                  <MousePointer2 className="w-3.5 h-3.5" />
                  <span>Green = income · red = expense · {dailySummaries.length} active {dailySummaries.length === 1 ? 'day' : 'days'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voucher Detail Modal */}
      {isModalOpen && selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-6xl max-h-[94vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
              <div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.16em]">Day Book · Voucher Detail</span>
                <h2 className="text-2xl font-bold mt-0.5">{selectedVoucher.voucher_number}</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
                <div className="p-4 bg-white">
                  <span className="text-slate-400 text-xs">Date</span>
                  <p className="font-semibold text-slate-800 mt-1">{new Date(selectedVoucher.voucher_date).toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-white">
                  <span className="text-slate-400 text-xs">Voucher Type</span>
                  <p className="font-semibold text-slate-800 mt-1">{selectedVoucher.voucher_type_name}</p>
                </div>
                <div className="p-4 bg-white">
                  <span className="text-slate-400 text-xs">Reference</span>
                  <p className="font-semibold text-slate-800 mt-1">{selectedVoucher.reference_number || 'N/A'}</p>
                </div>
                <div className="p-4 bg-white">
                  <span className="text-slate-400 text-xs">Posted By</span>
                  <p className="font-semibold text-slate-800 mt-1">{selectedVoucher.created_by_name || 'System'}</p>
                </div>
                <div className="p-4 bg-white">
                  <span className="text-slate-400 text-xs">Status</span>
                  <p className="font-semibold text-emerald-600 mt-1">{selectedVoucher.is_posted ? 'Posted' : 'Draft'}</p>
                </div>
                <div className="col-span-2 md:col-span-5 p-4 bg-white">
                  <span className="text-slate-400 text-xs">Voucher Narration</span>
                  <p className="font-medium text-slate-800 mt-1">{selectedVoucher.narration || 'No narration recorded'}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Particulars / Accounting Lines</h3>
                  <span className="text-xs text-slate-400">Full double-entry view</span>
                </div>
                <table className="w-full text-left text-sm border-collapse border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Account / Ledger</th>
                      <th className="py-3 px-4">Group / Nature</th>
                      <th className="py-3 px-4 text-right">Debit (₹)</th>
                      <th className="py-3 px-4 text-right">Credit (₹)</th>
                      <th className="py-3 px-4">Narration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedVoucher.lines?.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-400 text-xs">{line.line_number}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {line.ledger_name}
                          <span className="block text-xs font-mono text-slate-400">{line.ledger_code}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {line.group_name || '-'}
                          <span className="block uppercase text-[10px] text-slate-400">{line.nature || '-'}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-rose-700">
                          {parseFloat(line.debit_amount) > 0 ? `₹${parseFloat(line.debit_amount).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-emerald-700">
                          {parseFloat(line.credit_amount) > 0 ? `₹${parseFloat(line.credit_amount).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">{line.narration || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <p className="text-xs text-slate-500">Debit and credit totals must balance for a posted voucher.</p>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Voucher Creation Modal */}
      {isNewVoucherOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Double-Entry Accounting</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">Record Manual Voucher</h2>
              </div>
              <button onClick={() => setIsNewVoucherOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Voucher Type</label>
                  <select
                    value={newVoucherForm.voucher_type_code}
                    onChange={(e) => setNewVoucherForm({ ...newVoucherForm, voucher_type_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="JOURNAL">Journal Voucher</option>
                    <option value="CONTRA">Contra (Bank / Cash)</option>
                    <option value="PAYMENT">Payment Voucher</option>
                    <option value="RECEIPT">Receipt Voucher</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={newVoucherForm.voucher_date}
                    onChange={(e) => setNewVoucherForm({ ...newVoucherForm, voucher_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reference No</label>
                  <input
                    type="text"
                    placeholder="Ref / Chq / Voucher No"
                    value={newVoucherForm.reference_number}
                    onChange={(e) => setNewVoucherForm({ ...newVoucherForm, reference_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Voucher Entries (Debits must equal Credits)</label>
                <div className="space-y-2">
                  {newVoucherForm.lines.map((l, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                      <div className="col-span-5">
                        <select
                          value={l.ledger_id}
                          onChange={(e) => {
                            const updated = [...newVoucherForm.lines];
                            updated[idx].ledger_id = e.target.value;
                            setNewVoucherForm({ ...newVoucherForm, lines: updated });
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                          required
                        >
                          <option value="">Select Ledger Account...</option>
                          {ledgersList.map(led => (
                            <option key={led.ledger_id} value={led.ledger_id}>
                              {led.ledger_name} ({led.group_name})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Debit (₹)"
                          value={l.debit_amount}
                          onChange={(e) => {
                            const updated = [...newVoucherForm.lines];
                            updated[idx].debit_amount = e.target.value;
                            if (parseFloat(e.target.value) > 0) updated[idx].credit_amount = '';
                            setNewVoucherForm({ ...newVoucherForm, lines: updated });
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Credit (₹)"
                          value={l.credit_amount}
                          onChange={(e) => {
                            const updated = [...newVoucherForm.lines];
                            updated[idx].credit_amount = e.target.value;
                            if (parseFloat(e.target.value) > 0) updated[idx].debit_amount = '';
                            setNewVoucherForm({ ...newVoucherForm, lines: updated });
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        {newVoucherForm.lines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = newVoucherForm.lines.filter((_, i) => i !== idx);
                              setNewVoucherForm({ ...newVoucherForm, lines: updated });
                            }}
                            className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setNewVoucherForm({
                    ...newVoucherForm,
                    lines: [...newVoucherForm.lines, { ledger_id: '', debit_amount: '', credit_amount: '', narration: '' }]
                  })}
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Line
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Narration</label>
                <textarea
                  rows="2"
                  placeholder="Enter detailed narration / business remarks..."
                  value={newVoucherForm.narration}
                  onChange={(e) => setNewVoucherForm({ ...newVoucherForm, narration: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                ></textarea>
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewVoucherOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  Post Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayBook;
