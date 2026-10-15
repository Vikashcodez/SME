import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { accounting as accountingApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  Printer,
  ChevronDown,
  ChevronRight,
  Package,
  ArrowRight,
  ShieldCheck,
  Percent
} from 'lucide-react';

const ProfitAndLoss = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const currentYear = new Date().getFullYear();
  const defaultFrom = `${new Date().getMonth() >= 3 ? currentYear : currentYear - 1}-04-01`;
  const defaultTo = new Date().toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const fetchPL = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await accountingApi.getProfitAndLoss({
        company_id: companyId,
        from_date: fromDate,
        to_date: toDate
      });
      setReportData(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Profit & Loss Statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPL();
  }, [companyId, fromDate, toDate]);

  const trading = reportData?.trading_account;
  const pl = reportData?.profit_and_loss;

  const grossProfitNum = parseFloat(trading?.gross_profit || 0);
  const netProfitNum = parseFloat(pl?.net_profit || 0);
  const salesTotalNum = parseFloat(trading?.credit?.sales?.total || 0);
  const grossMargin = salesTotalNum > 0 ? ((grossProfitNum / salesTotalNum) * 100).toFixed(1) : '0.0';
  const netMargin = salesTotalNum > 0 ? ((netProfitNum / salesTotalNum) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Profit & Loss Account</h1>
            <p className="text-sm text-slate-500">
              Standard Indian GAAP Trading & Profit & Loss Statement for the period {fromDate} to {toDate}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-medium focus:outline-none"
            />
            <span className="text-xs text-slate-400">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-medium focus:outline-none"
            />
          </div>

          <button
            onClick={fetchPL}
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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales Revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹{salesTotalNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Direct Income</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Profit</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-bold ${grossProfitNum >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ₹{grossProfitNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-semibold text-slate-500">({grossMargin}%)</span>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Trading Gross Margin</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Closing Inventory Value</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹{parseFloat(trading?.credit?.closing_stock?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">RM + FG Valuation</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Profit / (Loss)</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-bold ${netProfitNum >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              ₹{netProfitNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-semibold text-slate-500">({netMargin}%)</span>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Carried to Balance Sheet</span>
        </div>
      </div>

      {/* Main Statement (Horizontal T-Shape Trading & P&L) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Debit Side (Expenses & Outflows) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Particulars (Debit Side)</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount (₹)</span>
            </div>

            <div className="p-6 space-y-6">
              {/* SECTION 1: TRADING DEBIT */}
              <div>
                <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">1. Trading Account (Direct Costs)</h3>
                
                {/* Opening Stock */}
                <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                  <span className="font-semibold text-slate-700">Opening Stock</span>
                  <span className="font-mono text-slate-900 font-medium">₹{parseFloat(trading?.debit?.opening_stock || 0).toFixed(2)}</span>
                </div>

                {/* Purchases */}
                <div className="py-2 border-b border-slate-100 text-sm">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Purchases (Direct)</span>
                    <span className="font-mono text-slate-900">₹{parseFloat(trading?.debit?.purchases?.total || 0).toFixed(2)}</span>
                  </div>
                  {trading?.debit?.purchases?.ledgers?.map(l => (
                    <div key={l.ledger_id} className="flex justify-between text-xs text-slate-500 pl-4 py-1">
                      <span>• {l.ledger_name}</span>
                      <span className="font-mono">₹{parseFloat(l.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Direct Expenses */}
                <div className="py-2 border-b border-slate-100 text-sm">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Direct Expenses (Manufacturing / Freight)</span>
                    <span className="font-mono text-slate-900">₹{parseFloat(trading?.debit?.direct_expenses?.total || 0).toFixed(2)}</span>
                  </div>
                  {trading?.debit?.direct_expenses?.ledgers?.map(l => (
                    <div key={l.ledger_id} className="flex justify-between text-xs text-slate-500 pl-4 py-1">
                      <span>• {l.ledger_name}</span>
                      <span className="font-mono">₹{parseFloat(l.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Gross Profit c/d (if positive) */}
                {grossProfitNum >= 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-200 text-sm bg-emerald-50/50 px-2 rounded-lg font-bold text-emerald-800 mt-2">
                    <span>Gross Profit c/d</span>
                    <span className="font-mono">₹{grossProfitNum.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* SECTION 2: P&L DEBIT */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3">2. Profit & Loss (Indirect Expenses)</h3>

                {/* Gross Loss b/d (if negative) */}
                {grossProfitNum < 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-200 text-sm bg-rose-50 px-2 rounded-lg font-bold text-rose-800 mb-2">
                    <span>Gross Loss b/d</span>
                    <span className="font-mono">₹{Math.abs(grossProfitNum).toFixed(2)}</span>
                  </div>
                )}

                {/* Indirect Expenses */}
                <div className="py-2 text-sm">
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Indirect Expenses (Admin / Scrap / Rework)</span>
                    <span className="font-mono text-slate-900">₹{parseFloat(pl?.debit?.indirect_expenses?.total || 0).toFixed(2)}</span>
                  </div>
                  {pl?.debit?.indirect_expenses?.ledgers?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic pl-4">No indirect expenses recorded.</p>
                  ) : (
                    pl?.debit?.indirect_expenses?.ledgers?.map(l => (
                      <div key={l.ledger_id} className="flex justify-between text-xs text-slate-500 pl-4 py-1">
                        <span>• {l.ledger_name}</span>
                        <span className="font-mono">₹{parseFloat(l.amount).toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Net Profit (if positive) */}
                {netProfitNum >= 0 && (
                  <div className="flex justify-between py-2.5 border border-indigo-200 text-sm bg-indigo-50/70 px-3 rounded-xl font-bold text-indigo-900 mt-4">
                    <span>Net Profit (Transferred to Capital / Reserves)</span>
                    <span className="font-mono">₹{netProfitNum.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center font-bold text-slate-900">
            <span className="text-xs uppercase tracking-wider">Total Debit Flow</span>
            <span className="font-mono text-base">₹{(parseFloat(trading?.debit?.total_debit || 0) + (grossProfitNum >= 0 ? grossProfitNum : 0) + parseFloat(pl?.debit?.total_debit || 0)).toFixed(2)}</span>
          </div>
        </div>

        {/* Right: Credit Side (Incomes & Inflows) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Particulars (Credit Side)</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount (₹)</span>
            </div>

            <div className="p-6 space-y-6">
              {/* SECTION 1: TRADING CREDIT */}
              <div>
                <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">1. Trading Account (Direct Revenues)</h3>

                {/* Sales */}
                <div className="py-2 border-b border-slate-100 text-sm">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Sales Revenue (Direct Income)</span>
                    <span className="font-mono text-slate-900">₹{parseFloat(trading?.credit?.sales?.total || 0).toFixed(2)}</span>
                  </div>
                  {trading?.credit?.sales?.ledgers?.map(l => (
                    <div key={l.ledger_id} className="flex justify-between text-xs text-slate-500 pl-4 py-1">
                      <span>• {l.ledger_name}</span>
                      <span className="font-mono">₹{parseFloat(l.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Closing Stock */}
                <div className="py-2 border-b border-slate-100 text-sm">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Closing Stock (Valuation)</span>
                    <span className="font-mono text-slate-900">₹{parseFloat(trading?.credit?.closing_stock?.total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 pl-4 py-1">
                    <span>• Raw Material Inventory Valuation</span>
                    <span className="font-mono">₹{parseFloat(trading?.credit?.closing_stock?.raw_materials || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 pl-4 py-1">
                    <span>• Finished Goods Inventory Valuation</span>
                    <span className="font-mono">₹{parseFloat(trading?.credit?.closing_stock?.finished_goods || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Gross Loss c/d (if negative) */}
                {grossProfitNum < 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-200 text-sm bg-rose-50 px-2 rounded-lg font-bold text-rose-800 mt-2">
                    <span>Gross Loss c/d</span>
                    <span className="font-mono">₹{Math.abs(grossProfitNum).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* SECTION 2: P&L CREDIT */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3">2. Profit & Loss (Incomes)</h3>

                {/* Gross Profit b/d */}
                {grossProfitNum >= 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-200 text-sm bg-emerald-50/50 px-2 rounded-lg font-bold text-emerald-800 mb-2">
                    <span>Gross Profit b/d</span>
                    <span className="font-mono">₹{grossProfitNum.toFixed(2)}</span>
                  </div>
                )}

                {/* Indirect Incomes */}
                <div className="py-2 text-sm">
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Indirect Incomes (Discounts / Scrap Sales)</span>
                    <span className="font-mono text-slate-900">₹{parseFloat(pl?.credit?.indirect_incomes?.total || 0).toFixed(2)}</span>
                  </div>
                  {pl?.credit?.indirect_incomes?.ledgers?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic pl-4">No indirect incomes recorded.</p>
                  ) : (
                    pl?.credit?.indirect_incomes?.ledgers?.map(l => (
                      <div key={l.ledger_id} className="flex justify-between text-xs text-slate-500 pl-4 py-1">
                        <span>• {l.ledger_name}</span>
                        <span className="font-mono">₹{parseFloat(l.amount).toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Net Loss (if negative) */}
                {netProfitNum < 0 && (
                  <div className="flex justify-between py-2.5 border border-rose-200 text-sm bg-rose-50 px-3 rounded-xl font-bold text-rose-900 mt-4">
                    <span>Net Loss (Deducted from Capital)</span>
                    <span className="font-mono">₹{Math.abs(netProfitNum).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center font-bold text-slate-900">
            <span className="text-xs uppercase tracking-wider">Total Credit Flow</span>
            <span className="font-mono text-base">₹{(parseFloat(trading?.credit?.total_credit || 0) + parseFloat(pl?.credit?.indirect_incomes?.total || 0) + (grossProfitNum >= 0 ? grossProfitNum : 0)).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitAndLoss;
