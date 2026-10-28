import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { accounting as accountingApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  Printer,
  Download,
  BookOpen
} from 'lucide-react';

const NATURE_COLORS = {
  ASSET: 'text-blue-600 bg-blue-50',
  LIABILITY: 'text-amber-600 bg-amber-50',
  EQUITY: 'text-purple-600 bg-purple-50',
  INCOME: 'text-emerald-600 bg-emerald-50',
  EXPENSE: 'text-rose-600 bg-rose-50'
};

const TrialBalance = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState({ rows: [], totals: { total_debit: '0.00', total_credit: '0.00', difference: '0.00', is_balanced: true } });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedNature, setSelectedNature] = useState('ALL');

  const fetchTrialBalance = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await accountingApi.getTrialBalance({
        company_id: companyId,
        as_on_date: asOnDate
      });
      setReportData(res.data.data || { rows: [], totals: {} });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Trial Balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance();
  }, [companyId, asOnDate]);

  const filteredRows = useMemo(() => {
    return (reportData.rows || []).filter(r => {
      const matchNature = selectedNature === 'ALL' || r.nature === selectedNature;
      const matchSearch = search ? (
        r.ledger_name.toLowerCase().includes(search.toLowerCase()) ||
        r.group_name.toLowerCase().includes(search.toLowerCase()) ||
        r.ledger_code.toLowerCase().includes(search.toLowerCase())
      ) : true;
      return matchNature && matchSearch;
    });
  }, [reportData.rows, selectedNature, search]);

  const nominalSummary = useMemo(() => (reportData.rows || []).reduce((summary, row) => {
    if (row.nature === 'EXPENSE') {
      summary.expense += parseFloat(row.closing_debit) || 0;
    }
    if (row.nature === 'INCOME') {
      summary.income += parseFloat(row.closing_credit) || 0;
    }
    return summary;
  }, { expense: 0, income: 0 }), [reportData.rows]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Scale className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Trial Balance Statement</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Tally-style closing balances: expenses remain on the debit side and income remains on the credit side.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 font-medium">As of:</span>
            <input
              type="date"
              value={asOnDate}
              onChange={(e) => setAsOnDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none"
            />
          </div>
          <button
            onClick={() => window.print()}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Balance Verification Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${
        reportData.totals?.is_balanced
          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
          : 'bg-rose-50 border-rose-200 text-rose-800'
      }`}>
        <div className="flex items-center gap-3">
          {reportData.totals?.is_balanced ? (
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
          )}
          <div>
            <h3 className="font-bold text-sm">
              {reportData.totals?.is_balanced ? 'Trial Balance is In Balance' : 'Trial Balance Out of Balance'}
            </h3>
            <p className="text-xs opacity-80">
              {reportData.totals?.is_balanced
                ? 'Total Debits strictly match Total Credits. No mathematical discrepancy.'
                : `Discrepancy detected: ₹${reportData.totals?.difference}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 font-mono text-xs">
          <div>
            <span className="opacity-75">Opening:</span>{' '}
            <span className="font-bold">₹{reportData.totals?.total_opening_debit || '0.00'} Dr / ₹{reportData.totals?.total_opening_credit || '0.00'} Cr</span>
          </div>
          <div>
            <span className="opacity-75">Period Debit:</span>{' '}
            <span className="font-bold text-sm">₹{reportData.totals?.total_period_debit || reportData.totals?.total_debit}</span>
          </div>
          <div>
            <span className="opacity-75">Period Credit:</span>{' '}
            <span className="font-bold text-sm">₹{reportData.totals?.total_period_credit || reportData.totals?.total_credit}</span>
          </div>
        </div>
      </div>

      {/* Financial Integration Summary: P&L and Balance Sheet */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-rose-50/70 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Expenses · Debit</p>
            <p className="text-[11px] text-rose-600 mt-0.5">Charged to P&L</p>
          </div>
          <p className="text-lg font-bold font-mono text-rose-700">
            ₹{Number(reportData.profit_and_loss_summary?.total_expense || nominalSummary.expense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Income · Credit</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Earned & Credited</p>
          </div>
          <p className="text-lg font-bold font-mono text-emerald-700">
            ₹{Number(reportData.profit_and_loss_summary?.total_income || nominalSummary.income || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className={`border rounded-xl px-4 py-3 flex items-center justify-between ${
          (reportData.profit_and_loss_summary?.is_profit ?? (nominalSummary.income >= nominalSummary.expense))
            ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
            : 'bg-amber-50/70 border-amber-200 text-amber-900'
        }`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider">
              {(reportData.profit_and_loss_summary?.is_profit ?? (nominalSummary.income >= nominalSummary.expense)) ? 'Net Profit' : 'Net Loss'}
            </p>
            <p className="text-[11px] opacity-75 mt-0.5">Trial Balance P&L Result</p>
          </div>
          <p className="text-lg font-bold font-mono">
            ₹{Number(reportData.profit_and_loss_summary?.net_profit_loss ?? Math.abs(nominalSummary.income - nominalSummary.expense)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search account name, code..."
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

      {/* Trial Balance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200 uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">Ledger Account</th>
                <th className="px-6 py-4">Account Group</th>
                <th className="px-6 py-4">Nature</th>
                <th className="px-6 py-4 text-right">Opening Balance</th>
                <th className="px-6 py-4 text-right">Debit (₹)</th>
                <th className="px-6 py-4 text-right">Credit (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-sans">Calculating Trial Balance...</td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-sans">No ledger accounts found.</td>
                </tr>
              ) : (
                filteredRows.map((r, index) => (
                  <React.Fragment key={r.ledger_id}>
                    {(index === 0 || filteredRows[index - 1].nature !== r.nature) && (
                      <tr className="bg-slate-100/80 border-y border-slate-200">
                        <td colSpan={6} className="px-6 py-2 font-sans text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {r.nature === 'EXPENSE' ? 'Debit side · Expenses' : r.nature === 'INCOME' ? 'Credit side · Income' : `${r.nature} accounts`}
                        </td>
                      </tr>
                    )}
                    <tr className={`transition ${r.nature === 'EXPENSE' ? 'bg-rose-50/20 hover:bg-rose-50/60' : r.nature === 'INCOME' ? 'bg-emerald-50/20 hover:bg-emerald-50/60' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-6 py-3 font-sans font-medium text-slate-900">
                      <div>{r.ledger_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.ledger_code}</div>
                    </td>
                    <td className="px-6 py-3 font-sans text-slate-600">{r.group_name}</td>
                    <td className="px-6 py-3 font-sans">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${NATURE_COLORS[r.nature] || ''}`}>
                        {r.nature}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-slate-500">
                      {parseFloat(r.opening_balance) > 0 ? `${parseFloat(r.opening_balance).toFixed(2)} ${r.opening_balance_type}` : '-'}
                    </td>
                    <td className={`px-6 py-3 text-right font-medium ${r.nature === 'EXPENSE' ? 'text-rose-700' : 'text-slate-900'}`}>
                      {parseFloat(r.closing_debit) > 0 ? parseFloat(r.closing_debit).toFixed(2) : '-'}
                    </td>
                    <td className={`px-6 py-3 text-right font-medium ${r.nature === 'INCOME' ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {parseFloat(r.closing_credit) > 0 ? parseFloat(r.closing_credit).toFixed(2) : '-'}
                    </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-mono text-xs font-bold text-slate-900">
              <tr>
                <td colSpan={4} className="px-6 py-4 font-sans uppercase">Grand Totals</td>
                <td className="px-6 py-4 text-right text-indigo-600 text-sm">₹{reportData.totals?.total_debit}</td>
                <td className="px-6 py-4 text-right text-indigo-600 text-sm">₹{reportData.totals?.total_credit}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrialBalance;
