import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { accounting as accountingApi } from '../../services/api';

const AccountingControls = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const [years, setYears] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');

  const selectedYear = useMemo(
    () => years.find((year) => String(year.financial_year_id) === String(selectedYearId)),
    [years, selectedYearId]
  );

  const loadData = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const [yearsResponse, auditResponse] = await Promise.all([
        accountingApi.getFinancialYears({ company_id: companyId }),
        accountingApi.getAccountingAuditLogs({ company_id: companyId, limit: 50 })
      ]);
      const nextYears = yearsResponse.data.data || [];
      setYears(nextYears);
      setAuditLogs(auditResponse.data.data || []);
      setSelectedYearId((current) => current || String(nextYears[0]?.financial_year_id || ''));
    } catch (error) {
      console.error(error);
      toast.error('Unable to load accounting controls');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    // Load controls when the authenticated company changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const updatePeriod = async (period) => {
    const action = period.is_locked ? 'unlock' : 'lock';
    if (!window.confirm(`${action === 'lock' ? 'Lock' : 'Unlock'} this accounting period?`)) return;
    try {
      setWorkingId(`period-${period.period_id}`);
      await accountingApi.setPeriodLock(period.period_id, { locked: !period.is_locked });
      toast.success(`Period ${period.is_locked ? 'unlocked' : 'locked'}`);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update accounting period');
    } finally {
      setWorkingId('');
    }
  };

  const closeYear = async () => {
    if (!selectedYear || !window.confirm(`Close financial year ${selectedYear.year_label}? This cannot be undone from this screen.`)) return;
    try {
      setWorkingId(`year-${selectedYear.financial_year_id}`);
      await accountingApi.closeFinancialYear(selectedYear.financial_year_id, { company_id: companyId });
      toast.success('Financial year closed');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to close financial year');
    } finally {
      setWorkingId('');
    }
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="border-b border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Accounting controls</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Periods, Closing & Audit</h1>
          <p className="mt-1 text-sm text-slate-500">Lock periods after review and close only a fully verified financial year.</p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <section className="border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Financial years</h2>
            </div>
            {loading ? (
              <p className="px-4 py-8 text-sm text-slate-500">Loading periods...</p>
            ) : years.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-500">No financial years configured.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {years.map((year) => (
                  <button
                    type="button"
                    key={year.financial_year_id}
                    onClick={() => setSelectedYearId(String(year.financial_year_id))}
                    className={`block w-full px-4 py-3 text-left ${String(year.financial_year_id) === String(selectedYearId) ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-900">{year.year_label}</span>
                      <span className={`text-xs font-semibold ${year.is_closed ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {year.is_closed ? 'Closed' : 'Open'}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {year.start_date} to {year.end_date} · {year.locked_period_count}/{year.period_count} periods locked
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Period controls</h2>
                <p className="mt-1 text-xs text-slate-500">{selectedYear?.year_label || 'Select a financial year'}</p>
              </div>
              <button
                type="button"
                onClick={closeYear}
                disabled={!selectedYear || selectedYear.is_closed || workingId !== ''}
                className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Close financial year
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Period</th>
                    <th className="px-4 py-2 font-semibold">Dates</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedYear?.periods || []).map((period) => (
                    <tr key={period.period_id}>
                      <td className="px-4 py-2 font-semibold text-slate-800">Period {period.period_number}</td>
                      <td className="px-4 py-2 text-slate-500">{period.start_date} to {period.end_date}</td>
                      <td className={`px-4 py-2 font-semibold ${period.is_locked ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {period.is_locked ? 'Locked' : 'Open'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          disabled={selectedYear.is_closed || workingId !== ''}
                          onClick={() => updatePeriod(period)}
                          className="font-semibold text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {workingId === `period-${period.period_id}` ? 'Saving...' : period.is_locked ? 'Unlock' : 'Lock'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Recent audit activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Time</th>
                  <th className="px-4 py-2 font-semibold">Action</th>
                  <th className="px-4 py-2 font-semibold">Entity</th>
                  <th className="px-4 py-2 font-semibold">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.audit_id}>
                    <td className="px-4 py-2 text-slate-500">{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 font-semibold text-slate-800">{log.action_type}</td>
                    <td className="px-4 py-2 text-slate-600">{log.entity_name} #{log.entity_id}</td>
                    <td className="px-4 py-2 text-slate-500">{log.performed_by_name || 'System'}</td>
                  </tr>
                ))}
                {!loading && auditLogs.length === 0 && (
                  <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">No audit activity found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AccountingControls;
