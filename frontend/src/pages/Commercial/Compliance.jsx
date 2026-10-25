import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, FileText, IndianRupee, Plus, RefreshCw, Settings, ShieldCheck, Trash2, WalletCards } from 'lucide-react';
import { compliance as complianceApi, employees as employeesApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const today = new Date().toISOString().split('T')[0];
const currentFy = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
const inputClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100';
const tabs = [
  { id: 'tds', label: 'TDS', description: 'Tax deduction & challans', icon: FileText },
  { id: 'pf', label: 'PF', description: 'Provident fund', icon: ShieldCheck },
  { id: 'form60', label: 'Form 60', description: 'Declarations', icon: FileText },
  { id: '24q1', label: '24Q1', description: 'Quarterly salary return', icon: WalletCards },
  { id: 'form16', label: 'Form 16', description: 'Employee certificates', icon: FileText }
];

const currency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const employeeName = (employee) => `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.employee_code;

const Compliance = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tds');
  const [dashboard, setDashboard] = useState(null);
  const [records, setRecords] = useState({ payroll_runs: [], challans: [], returns: [] });
  const [employees, setEmployees] = useState([]);
  const [form16Records, setForm16Records] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ financial_year: currentFy, pf_enabled: false, tax_regime: 'NEW' });
  const [payroll, setPayroll] = useState({ period_start: today, period_end: today, payment_date: today, financial_year: currentFy, employees: [] });
  const [challan, setChallan] = useState({ challan_type: 'TDS', period_start: today, period_end: today, amount: '', payment_date: '' });
  const [form16Employee, setForm16Employee] = useState('');

  const load = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      const [summary, list, config, employeeList, forms] = await Promise.all([
        complianceApi.getDashboard({ company_id: user.company_id }),
        complianceApi.getRecords({ company_id: user.company_id }),
        complianceApi.getSettings({ company_id: user.company_id }),
        employeesApi.getAll({ company_id: user.company_id }),
        complianceApi.getForm16({ company_id: user.company_id })
      ]);
      setDashboard(summary.data.data);
      setRecords(list.data.data);
      setEmployees(employeeList.data.data || []);
      setForm16Records(forms.data.data || []);
      if (config.data.data?.[0]) setSettings(config.data.data[0]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.company_id]);

  const addEmployee = () => {
    const available = employees.find(employee => !payroll.employees.some(item => String(item.employee_id) === String(employee.employee_id)));
    if (!available) return toast.error('All employees are already added.');
    setPayroll({ ...payroll, employees: [...payroll.employees, { employee_id: available.employee_id, gross_amount: '', basic_amount: '', tds_amount: '', pf_applicable: settings.pf_enabled, professional_tax_amount: '' }] });
  };

  const updatePayrollEmployee = (index, key, value) => {
    const next = payroll.employees.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item);
    setPayroll({ ...payroll, employees: next });
  };

  const payrollTotal = useMemo(() => payroll.employees.reduce((sum, item) => sum + Number(item.gross_amount || 0), 0), [payroll.employees]);

  const submitPayroll = async (event) => {
    event.preventDefault();
    if (!payroll.employees.length) return toast.error('Add at least one employee to the payroll run.');
    try {
      await complianceApi.createPayroll({ ...payroll, company_id: user.company_id });
      toast.success('Payroll posted to accounts');
      setPayroll({ ...payroll, employees: [] });
      load();
    } catch (error) { toast.error(error.response?.data?.message || 'Payroll posting failed'); }
  };

  const submitChallan = async (event) => {
    event.preventDefault();
    try {
      await complianceApi.createChallan({ ...challan, company_id: user.company_id });
      toast.success(`${challan.challan_type} challan recorded`);
      setChallan({ ...challan, amount: '' });
      load();
    } catch (error) { toast.error(error.response?.data?.message || 'Challan failed'); }
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    try {
      await complianceApi.saveSettings({ ...settings, company_id: user.company_id });
      toast.success('Compliance policy saved');
      load();
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to save policy'); }
  };

  const generateForm16 = async () => {
    if (!form16Employee) return toast.error('Select an employee first.');
    try {
      await complianceApi.generateForm16({ company_id: user.company_id, employee_id: form16Employee, financial_year: settings.financial_year || currentFy });
      toast.success('Form 16 generated');
      load();
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to generate Form 16'); }
  };

  const payrollSummary = dashboard?.payroll || { count: 0, gross: 0, tds: 0, pf: 0 };
  const challans = records.challans.filter(item => activeTab === 'pf' ? item.challan_type === 'PF' : item.challan_type === 'TDS');

  return (
    <main className="min-h-full bg-slate-50 px-4 py-4 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-[1440px] space-y-4">
        <header className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3"><div className="rounded-lg bg-indigo-600 p-2.5 text-white"><ShieldCheck className="h-5 w-5" /></div><div><div className="flex items-center gap-2"><h1 className="text-xl font-bold">Compliance</h1><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Accounts linked</span></div><p className="text-xs text-slate-500">Manage statutory deductions, returns and employee certificates</p></div></div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-indigo-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </header>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[['Payroll runs', payrollSummary.count, WalletCards], ['Gross payroll', currency(payrollSummary.gross), IndianRupee], ['TDS payable', currency(payrollSummary.tds), FileText], ['PF payable', currency(payrollSummary.pf), ShieldCheck]].map(([label, value, Icon]) => <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div><Icon className="h-5 w-5 text-indigo-500" /></div>)}
        </section>

        <section className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {tabs.map(({ id, label, description, icon: Icon }) => <button key={id} onClick={() => setActiveTab(id)} className={`flex min-w-[135px] items-center gap-2 rounded-lg px-3 py-2 text-left transition ${activeTab === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4" /><span><span className="block text-xs font-bold">{label}</span><span className={`block text-[10px] ${activeTab === id ? 'text-indigo-100' : 'text-slate-400'}`}>{description}</span></span></button>)}
        </section>

        {activeTab === 'tds' || activeTab === 'pf' ? (
          <>
          {activeTab === 'tds' ? <form onSubmit={submitPayroll} className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold">Monthly payroll</h2><p className="text-xs text-slate-500">Select employees and enter payroll amounts. No technical data entry is required.</p></div><div className="flex gap-2"><button type="button" onClick={addEmployee} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"><Plus className="h-3.5 w-3.5" /> Add employee</button><button className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Post payroll</button></div></div>
          <div className="grid grid-cols-3 gap-3 px-5 py-3"><label className="text-[11px] font-semibold text-slate-500">Period from<input type="date" className={`${inputClass} mt-1`} value={payroll.period_start} onChange={e => setPayroll({ ...payroll, period_start: e.target.value })} required /></label><label className="text-[11px] font-semibold text-slate-500">Period to<input type="date" className={`${inputClass} mt-1`} value={payroll.period_end} onChange={e => setPayroll({ ...payroll, period_end: e.target.value })} required /></label><label className="text-[11px] font-semibold text-slate-500">Payment date<input type="date" className={`${inputClass} mt-1`} value={payroll.payment_date} onChange={e => setPayroll({ ...payroll, payment_date: e.target.value })} required /></label></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="px-5 py-2.5">Employee</th><th className="px-3 py-2.5 text-right">Gross</th><th className="px-3 py-2.5 text-right">Basic</th><th className="px-3 py-2.5 text-right">TDS</th><th className="px-3 py-2.5 text-center">PF</th><th className="px-3 py-2.5 text-right">PT</th><th className="px-5 py-2.5"></th></tr></thead><tbody className="divide-y divide-slate-100">{payroll.employees.map((item, index) => <tr key={`${item.employee_id}-${index}`}><td className="px-5 py-2"><select className={`${inputClass} min-w-44`} value={item.employee_id} onChange={e => updatePayrollEmployee(index, 'employee_id', e.target.value)} required><option value="">Select employee</option>{employees.map(employee => <option key={employee.employee_id} value={employee.employee_id}>{employeeName(employee)} · {employee.employee_code}</option>)}</select></td>{['gross_amount', 'basic_amount', 'tds_amount', 'professional_tax_amount'].map(field => <td key={field} className="px-3 py-2"><input type="number" min="0" step="0.01" className={`${inputClass} min-w-24 text-right`} value={item[field]} onChange={e => updatePayrollEmployee(index, field, e.target.value)} required={field === 'gross_amount'} /></td>)}<td className="px-3 py-2 text-center"><input type="checkbox" checked={item.pf_applicable || false} onChange={e => updatePayrollEmployee(index, 'pf_applicable', e.target.checked)} title="PF applicable" /></td><td className="px-5 py-2 text-right"><button type="button" onClick={() => setPayroll({ ...payroll, employees: payroll.employees.filter((_, itemIndex) => itemIndex !== index) })} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></td></tr>)}{!payroll.employees.length && <tr><td colSpan="7" className="px-5 py-8 text-center text-slate-400">Click “Add employee” to start this payroll run.</td></tr>}</tbody></table></div>
          <div className="flex justify-end border-t border-slate-100 px-5 py-3 text-xs font-bold text-slate-600">Gross total: <span className="ml-2 text-slate-900">{currency(payrollTotal)}</span></div>
          </form> : null}
          <section className="grid items-start gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold">{activeTab === 'tds' ? 'TDS challans & payroll deductions' : 'Provident Fund challans'}</h2><p className="text-xs text-slate-500">Every paid challan is posted to the accounting ledgers.</p></div><span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><FileText className="h-4 w-4" /></span></div>
              <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="px-5 py-3">Type</th><th className="px-5 py-3">Period</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{challans.map(item => <tr key={item.challan_id} className="hover:bg-slate-50"><td className="px-5 py-3 font-semibold">{item.challan_type} challan</td><td className="px-5 py-3 text-slate-500">{item.period_start} – {item.period_end}</td><td className="px-5 py-3 text-right font-semibold">{currency(item.amount)}</td><td className="px-5 py-3"><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-700">{item.status}</span></td></tr>)}{!challans.length && <tr><td colSpan="4" className="px-5 py-10 text-center text-slate-400">No {activeTab.toUpperCase()} challans recorded.</td></tr>}</tbody></table></div>
            </div>
            <form onSubmit={submitChallan} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Record {activeTab.toUpperCase()} challan</h2><p className="mb-4 mt-1 text-xs text-slate-500">Use this after the liability has been reviewed.</p><input type="hidden" value={challan.challan_type} /><label className="block text-[11px] font-semibold text-slate-500">Period start<input type="date" className={`${inputClass} mt-1`} value={challan.period_start} onChange={e => setChallan({ ...challan, challan_type: activeTab === 'pf' ? 'PF' : 'TDS', period_start: e.target.value })} required /></label><label className="mt-3 block text-[11px] font-semibold text-slate-500">Period end<input type="date" className={`${inputClass} mt-1`} value={challan.period_end} onChange={e => setChallan({ ...challan, challan_type: activeTab === 'pf' ? 'PF' : 'TDS', period_end: e.target.value })} required /></label><label className="mt-3 block text-[11px] font-semibold text-slate-500">Amount<input type="number" min="0.01" step="0.01" className={`${inputClass} mt-1`} value={challan.amount} onChange={e => setChallan({ ...challan, challan_type: activeTab === 'pf' ? 'PF' : 'TDS', amount: e.target.value })} required /></label><label className="mt-3 block text-[11px] font-semibold text-slate-500">Payment date<input type="date" className={`${inputClass} mt-1`} value={challan.payment_date} onChange={e => setChallan({ ...challan, challan_type: activeTab === 'pf' ? 'PF' : 'TDS', payment_date: e.target.value })} /></label><button className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white">Save challan</button></form>
          </section>
          </>
        ) : null}

        {activeTab === 'form60' ? <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Form 60 declarations</h2><p className="mt-1 text-sm text-slate-500">Capture and review declarations for persons who do not quote PAN. Declarations should be retained with the related transaction record.</p><div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><AlertCircle className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-2 text-sm font-semibold text-slate-600">No Form 60 declarations recorded</p><p className="mt-1 text-xs text-slate-400">Declarations will appear here after they are captured against a transaction.</p></div></section> : null}

        {activeTab === '24q1' ? <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold">Form 24Q Part I</h2><p className="text-xs text-slate-500">Quarterly salary TDS return workspace for April–June (Q1).</p></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="px-5 py-3">Return</th><th className="px-5 py-3">Period</th><th className="px-5 py-3">Due date</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{records.returns.filter(item => item.return_type === 'TDS_24Q').map(item => <tr key={item.return_id}><td className="px-5 py-3 font-semibold">TDS 24Q Part I</td><td className="px-5 py-3">{item.period_start} – {item.period_end}</td><td className="px-5 py-3">{item.due_date}</td><td className="px-5 py-3">{item.status}</td></tr>)}{!records.returns.some(item => item.return_type === 'TDS_24Q') && <tr><td colSpan="4" className="px-5 py-10 text-center text-slate-400">No Form 24Q Part I return prepared for this period.</td></tr>}</tbody></table></div></section> : null}

        {activeTab === 'form16' ? <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold">Form 16 certificates</h2><p className="text-xs text-slate-500">Generate certificates from posted payroll and TDS records.</p></div><div className="flex gap-2"><select className={`${inputClass} w-48`} value={form16Employee} onChange={e => setForm16Employee(e.target.value)}><option value="">Select employee</option>{employees.map(employee => <option key={employee.employee_id} value={employee.employee_id}>{employeeName(employee)}</option>)}</select><button onClick={generateForm16} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Generate</button></div></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Financial year</th><th className="px-5 py-3 text-right">Gross salary</th><th className="px-5 py-3 text-right">TDS deducted</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{form16Records.map(item => <tr key={item.form16_id}><td className="px-5 py-3 font-semibold">{`${item.first_name || ''} ${item.last_name || ''}`.trim() || item.employee_code}</td><td className="px-5 py-3">{item.financial_year}</td><td className="px-5 py-3 text-right">{currency(item.gross_salary)}</td><td className="px-5 py-3 text-right">{currency(item.tds_deducted)}</td><td className="px-5 py-3">{item.status}</td></tr>)}{!form16Records.length && <tr><td colSpan="5" className="px-5 py-10 text-center text-slate-400">No Form 16 certificates generated.</td></tr>}</tbody></table></div></section> : null}

        <form onSubmit={saveSettings} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><Settings className="h-4 w-4 text-slate-400" /><span className="text-sm font-bold">Policy</span><input className={`${inputClass} w-28`} value={settings.financial_year || ''} onChange={e => setSettings({ ...settings, financial_year: e.target.value })} pattern="\d{4}-\d{4}" title="Use YYYY-YYYY" required /><select className={`${inputClass} w-24`} value={settings.tax_regime || 'NEW'} onChange={e => setSettings({ ...settings, tax_regime: e.target.value })}><option>NEW</option><option>OLD</option></select><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={settings.pf_enabled || false} onChange={e => setSettings({ ...settings, pf_enabled: e.target.checked })} /> PF enabled</label><button className="ml-auto rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Save policy</button></form>
     </div>
    </main>
  );
};

export default Compliance;
