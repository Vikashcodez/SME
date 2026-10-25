import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { accounting as accountingApi } from '../../services/api';

const AccountingManagement = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('bank');
  const [banks, setBanks] = useState([]);
  const [reconciliation, setReconciliation] = useState([]);
  const [costCentres, setCostCentres] = useState([]);
  const [years, setYears] = useState([]);
  const [variance, setVariance] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [costCentreForm, setCostCentreForm] = useState({ category_name: '', cost_centre_name: '', cost_centre_code: '' });
  const [loading, setLoading] = useState(true);

  const companyId = user?.company_id;

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const [bankResponse, reconciliationResponse, centreResponse, yearResponse] = await Promise.all([
        accountingApi.getBankAccounts({ company_id: companyId }),
        accountingApi.getBankReconciliation({ company_id: companyId }),
        accountingApi.getCostCentres({ company_id: companyId }),
        accountingApi.getFinancialYears({ company_id: companyId })
      ]);
      setBanks(bankResponse.data.data || []);
      setReconciliation(reconciliationResponse.data.data || []);
      setCostCentres(centreResponse.data.data || []);
      const nextYears = yearResponse.data.data || [];
      setYears(nextYears);
      setSelectedYear((current) => current || String(nextYears[0]?.financial_year_id || ''));
    } catch (error) {
      console.error(error);
      toast.error('Unable to load accounting management data');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    // Data loading is intentionally started when the authenticated company changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (!companyId || !selectedYear) return;
    accountingApi.getBudgetVariance({ company_id: companyId, financial_year_id: selectedYear })
      .then((response) => setVariance(response.data.data || []))
      .catch((error) => {
        console.error(error);
        toast.error('Unable to load budget variance');
      });
  }, [companyId, selectedYear]);

  const updateStatus = async (entry, status) => {
    try {
      await accountingApi.updateBankReconciliation({
        company_id: companyId,
        voucher_line_id: entry.line_id,
        bank_account_id: entry.bank_account_id,
        reconciliation_status: status,
        bank_statement_reference: entry.bank_statement_reference
      });
      toast.success('Reconciliation status updated');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update reconciliation');
    }
  };

  const createCentre = async (event) => {
    event.preventDefault();
    try {
      await accountingApi.createCostCentre({ company_id: companyId, ...costCentreForm });
      setCostCentreForm({ category_name: '', cost_centre_name: '', cost_centre_code: '' });
      toast.success('Cost centre created');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create cost centre');
    }
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="border-b border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Management accounting</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Banking, Cost Centres & Budgets</h1>
          <p className="mt-1 text-sm text-slate-500">Match bank entries, organize management dimensions, and review budget performance.</p>
        </header>

        <nav className="flex border-b border-slate-200 bg-white">
          {[['bank', 'Bank reconciliation'], ['cost', 'Cost centres'], ['budget', 'Budget variance']].map(([key, label]) => (
            <button type="button" key={key} onClick={() => setTab(key)} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {label}
            </button>
          ))}
        </nav>

        {loading ? <div className="border border-slate-200 bg-white px-5 py-10 text-sm text-slate-500">Loading accounting data...</div> : (
          <>
            {tab === 'bank' && (
              <section className="border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Bank reconciliation register</h2>
                    <p className="mt-1 text-xs text-slate-500">Only posted, non-reversed bank ledger entries are shown.</p>
                  </div>
                  <select value={selectedBank} onChange={(event) => setSelectedBank(event.target.value)} className="border border-slate-300 px-3 py-2 text-xs">
                    <option value="">All bank accounts</option>
                    {banks.map((bank) => <option key={bank.bank_account_id} value={bank.bank_account_id}>{bank.bank_name} · {bank.account_number.slice(-4)}</option>)}
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-500"><tr><th className="px-4 py-2">Voucher</th><th className="px-4 py-2">Date</th><th className="px-4 py-2">Bank</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {reconciliation.filter((entry) => !selectedBank || String(entry.bank_account_id) === selectedBank).map((entry) => (
                        <tr key={entry.reconciliation_id}>
                          <td className="px-4 py-2 font-semibold text-slate-800">{entry.voucher_number}</td>
                          <td className="px-4 py-2 text-slate-500">{entry.voucher_date}</td>
                          <td className="px-4 py-2 text-slate-600">{entry.bank_name} · {entry.account_number.slice(-4)}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-800">₹{Number(entry.debit_amount || entry.credit_amount || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 font-semibold text-slate-600">{entry.reconciliation_status}</td>
                          <td className="px-4 py-2 text-right">
                            <button type="button" onClick={() => updateStatus(entry, entry.reconciliation_status === 'CLEARED' ? 'UNCLEARED' : 'CLEARED')} className="font-semibold text-indigo-600 hover:text-indigo-800">{entry.reconciliation_status === 'CLEARED' ? 'Unclear' : 'Clear'}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {tab === 'cost' && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
                <form onSubmit={createCentre} className="space-y-3 border border-slate-200 bg-white p-4">
                  <h2 className="text-sm font-semibold text-slate-900">Create cost centre</h2>
                  {Object.entries(costCentreForm).map(([field, value]) => (
                    <input key={field} required value={value} onChange={(event) => setCostCentreForm({ ...costCentreForm, [field]: event.target.value })} placeholder={field.replaceAll('_', ' ')} className="w-full border border-slate-300 px-3 py-2 text-sm" />
                  ))}
                  <button type="submit" className="w-full bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Create cost centre</button>
                </form>
                <section className="border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold text-slate-900">Cost centre register</h2></div>
                  <div className="divide-y divide-slate-100">{costCentres.map((centre) => <div key={centre.cost_centre_id} className="flex items-center justify-between px-4 py-3 text-sm"><span className="font-semibold text-slate-800">{centre.cost_centre_name} <span className="ml-2 font-mono text-xs text-slate-400">{centre.cost_centre_code}</span></span><span className="text-xs text-slate-500">{centre.category_name}</span></div>)}</div>
                </section>
              </div>
            )}

            {tab === 'budget' && (
              <section className="border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold text-slate-900">Budget variance</h2><select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="border border-slate-300 px-3 py-2 text-xs">{years.map((year) => <option key={year.financial_year_id} value={year.financial_year_id}>{year.year_label}</option>)}</select></div>
                <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-slate-200 bg-slate-50 text-slate-500"><tr><th className="px-4 py-2">Budget</th><th className="px-4 py-2">Ledger / Group</th><th className="px-4 py-2 text-right">Allocated</th><th className="px-4 py-2 text-right">Actual</th><th className="px-4 py-2 text-right">Variance</th><th className="px-4 py-2 text-right">Used</th></tr></thead><tbody className="divide-y divide-slate-100">{variance.map((row) => <tr key={row.budget_id}><td className="px-4 py-2 font-semibold text-slate-800">{row.budget_name}</td><td className="px-4 py-2 text-slate-600">{row.ledger_name || row.group_name || 'All accounts'}</td><td className="px-4 py-2 text-right font-mono">₹{Number(row.allocated_amount).toFixed(2)}</td><td className="px-4 py-2 text-right font-mono">₹{Number(row.actual_amount).toFixed(2)}</td><td className="px-4 py-2 text-right font-mono text-indigo-700">₹{row.variance_amount}</td><td className="px-4 py-2 text-right font-mono">{row.utilization_percentage}%</td></tr>)}</tbody></table></div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AccountingManagement;
