import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { accounting as accountingApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Scale,
  Calendar,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Building,
  Layers,
  ArrowRight
} from 'lucide-react';

const BalanceSheet = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const fetchBalanceSheet = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await accountingApi.getBalanceSheet({
        company_id: companyId,
        as_on_date: asOnDate
      });
      setReportData(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Balance Sheet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceSheet();
  }, [companyId, asOnDate]);

  const liabilities = reportData?.liabilities;
  const assets = reportData?.assets;
  const summary = reportData?.summary;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Balance Sheet</h1>
            <p className="text-sm text-slate-500">
              Double-Entry Financial Position Statement as on {new Date(asOnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">As on:</span>
            <input
              type="date"
              value={asOnDate}
              onChange={(e) => setAsOnDate(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-medium focus:outline-none"
            />
          </div>

          <button
            onClick={fetchBalanceSheet}
            className="p-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={() => window.print()}
            className="p-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600"
            title="Print Statement"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Liabilities & Equity</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹{parseFloat(liabilities?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Sources of Funds</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Assets</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹{parseFloat(assets?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Application of Funds</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Working Capital</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            ₹{parseFloat(summary?.working_capital || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Current Assets - Current Liab</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audit Balancing Status</p>
          <div className="flex items-center gap-2 mt-1">
            {summary?.is_balanced ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Perfectly Balanced
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" /> Diff: ₹{summary?.difference}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Assets = Liabilities Equation</span>
        </div>
      </div>

      {/* T-Shape Balance Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Liabilities & Capital */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Liabilities & Equity</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount (₹)</span>
            </div>

            <div className="p-6 space-y-6">
              {/* 1. Capital & Reserves */}
              <div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200 font-bold text-slate-900 text-sm">
                  <span>Capital Account & Equity</span>
                  <span className="font-mono">₹{parseFloat(liabilities?.capital_and_reserves?.total || 0).toFixed(2)}</span>
                </div>
                {liabilities?.capital_and_reserves?.ledgers?.map(l => (
                  <div key={l.ledger_id} className="flex justify-between text-xs text-slate-500 pl-4 py-1">
                    <span>• {l.ledger_name}</span>
                    <span className="font-mono">₹{parseFloat(l.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* 2. Profit & Loss (Current Year Net Profit) */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                <div className="flex justify-between items-center text-sm font-bold text-indigo-950">
                  <span>Profit & Loss A/c (Current Period Surplus)</span>
                  <span className="font-mono">₹{parseFloat(liabilities?.profit_and_loss?.total || 0).toFixed(2)}</span>
                </div>
                <span className="text-xs text-indigo-600 mt-0.5 block">Net Profit brought from P&L Statement</span>
              </div>

              {/* 3. Loans & Borrowings */}
              <div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200 font-bold text-slate-900 text-sm">
                  <span>Loans & Borrowings</span>
                  <span className="font-mono">₹{parseFloat(liabilities?.loans_and_borrowings?.total || 0).toFixed(2)}</span>
                </div>
                {liabilities?.loans_and_borrowings?.ledgers?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-4 py-1">No term loans or borrowings.</p>
                ) : (
                  liabilities?.loans_and_borrowings?.ledgers?.map(l => (
                    <div key={l.ledger_id} className="flex justify-between text-xs text-slate-500 pl-4 py-1">
                      <span>• {l.ledger_name}</span>
                      <span className="font-mono">₹{parseFloat(l.amount).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* 4. Current Liabilities */}
              <div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200 font-bold text-slate-900 text-sm">
                  <span>Current Liabilities</span>
                  <span className="font-mono">₹{parseFloat(liabilities?.current_liabilities?.total || 0).toFixed(2)}</span>
                </div>

                {/* Sundry Creditors */}
                <div className="py-2 border-b border-slate-100 pl-3">
                  <div className="flex justify-between text-sm font-semibold text-slate-700">
                    <span>Sundry Creditors (Suppliers / Vendors)</span>
                    <span className="font-mono">₹{parseFloat(liabilities?.current_liabilities?.sundry_creditors?.total || 0).toFixed(2)}</span>
                  </div>
                  {liabilities?.current_liabilities?.sundry_creditors?.ledgers?.map(l => (
                    <div key={l.ledger_id} className="flex justify-between text-xs text-slate-500 pl-3 py-0.5">
                      <span>• {l.ledger_name}</span>
                      <span className="font-mono">₹{parseFloat(l.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Duties & Taxes */}
                <div className="py-2 pl-3">
                  <div className="flex justify-between text-sm font-semibold text-slate-700">
                    <span>Duties & Taxes (Net GST / TDS Liability)</span>
                    <span className="font-mono">₹{parseFloat(liabilities?.current_liabilities?.duties_and_taxes?.total || 0).toFixed(2)}</span>
                  </div>
                  {liabilities?.current_liabilities?.duties_and_taxes?.ledgers?.map(l => (
                    <div key={l.ledger_id} className="flex justify-between text-xs text-slate-500 pl-3 py-0.5">
                      <span>• {l.ledger_name}</span>
                      <span className="font-mono">₹{parseFloat(l.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center font-bold text-slate-900">
            <span className="text-xs uppercase tracking-wider">Total Liabilities & Equity</span>
            <span className="font-mono text-lg text-indigo-700">₹{parseFloat(liabilities?.total || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Right Column: Assets */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Assets</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount (₹)</span>
            </div>

            <div className="p-6 space-y-6">
              {/* 1. Fixed Assets */}
              <div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200 font-bold text-slate-900 text-sm">
                  <span>Fixed Assets (Plant, Machinery & Equipment)</span>
                  <span className="font-mono">₹{parseFloat(assets?.fixed_assets?.total || 0).toFixed(2)}</span>
                </div>
                {assets?.fixed_assets?.ledgers?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-4 py-1">No fixed assets capitalized.</p>
                ) : (
                  assets?.fixed_assets?.ledgers?.map(l => (
                    <div key={l.ledger_id} className="flex justify-between text-xs text-slate-500 pl-4 py-1">
                      <span>• {l.ledger_name}</span>
                      <span className="font-mono">₹{parseFloat(l.amount).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* 2. Investments */}
              <div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200 font-bold text-slate-900 text-sm">
                  <span>Investments</span>
                  <span className="font-mono">₹{parseFloat(assets?.investments?.total || 0).toFixed(2)}</span>
                </div>
                {assets?.investments?.ledgers?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-4 py-1">No external investments.</p>
                ) : (
                  assets?.investments?.ledgers?.map(l => (
                    <div key={l.ledger_id} className="flex justify-between text-xs text-slate-500 pl-4 py-1">
                      <span>• {l.ledger_name}</span>
                      <span className="font-mono">₹{parseFloat(l.amount).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* 3. Current Assets */}
              <div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200 font-bold text-slate-900 text-sm">
                  <span>Current Assets</span>
                  <span className="font-mono">₹{parseFloat(assets?.current_assets?.total || 0).toFixed(2)}</span>
                </div>

                {/* Stock in Hand */}
                <div className="py-2 border-b border-slate-100 pl-3">
                  <div className="flex justify-between text-sm font-semibold text-slate-700">
                    <span>Stock-in-Hand (Physical Inventory Valuation)</span>
                    <span className="font-mono">₹{parseFloat(assets?.current_assets?.stock_in_hand?.total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 pl-3 py-0.5">
                    <span>• Raw Material Inventory Valuation</span>
                    <span className="font-mono">₹{parseFloat(assets?.current_assets?.stock_in_hand?.raw_material_valuation || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 pl-3 py-0.5">
                    <span>• Finished Goods Inventory Valuation</span>
                    <span className="font-mono">₹{parseFloat(assets?.current_assets?.stock_in_hand?.finished_goods_valuation || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Sundry Debtors */}
                <div className="py-2 border-b border-slate-100 pl-3">
                  <div className="flex justify-between text-sm font-semibold text-slate-700">
                    <span>Sundry Debtors (Customer Receivables)</span>
                    <span className="font-mono">₹{parseFloat(assets?.current_assets?.sundry_debtors?.total || 0).toFixed(2)}</span>
                  </div>
                  {assets?.current_assets?.sundry_debtors?.ledgers?.map(l => (
                    <div key={l.ledger_id} className="flex justify-between text-xs text-slate-500 pl-3 py-0.5">
                      <span>• {l.ledger_name}</span>
                      <span className="font-mono">₹{parseFloat(l.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Cash in Hand */}
                <div className="py-2 border-b border-slate-100 pl-3">
                  <div className="flex justify-between text-sm font-semibold text-slate-700">
                    <span>Cash-in-Hand</span>
                    <span className="font-mono">₹{parseFloat(assets?.current_assets?.cash_in_hand?.total || 0).toFixed(2)}</span>
                  </div>
                  {assets?.current_assets?.cash_in_hand?.ledgers?.map(l => (
                    <div key={l.ledger_id} className="flex justify-between text-xs text-slate-500 pl-3 py-0.5">
                      <span>• {l.ledger_name}</span>
                      <span className="font-mono">₹{parseFloat(l.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Bank Accounts */}
                <div className="py-2 pl-3">
                  <div className="flex justify-between text-sm font-semibold text-slate-700">
                    <span>Bank Accounts</span>
                    <span className="font-mono">₹{parseFloat(assets?.current_assets?.bank_accounts?.total || 0).toFixed(2)}</span>
                  </div>
                  {assets?.current_assets?.bank_accounts?.ledgers?.map(l => (
                    <div key={l.ledger_id} className="flex justify-between text-xs text-slate-500 pl-3 py-0.5">
                      <span>• {l.ledger_name}</span>
                      <span className="font-mono">₹{parseFloat(l.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center font-bold text-slate-900">
            <span className="text-xs uppercase tracking-wider">Total Assets</span>
            <span className="font-mono text-lg text-emerald-700">₹{parseFloat(assets?.total || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheet;
