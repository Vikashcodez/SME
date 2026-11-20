import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Trash2, Edit3, Percent, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { taxes as taxApi } from '../../services/api';
import ExcelImportModal from '../../components/ExcelImportModal';

const TAX_IMPORT_COLUMNS = [
  { key: 'tax_name', label: 'Tax Name', required: true, example: 'GST 18%' },
  { key: 'tax_type', label: 'Tax Type (GST/IGST/TDS/CESS/VAT/OTHER)', required: false, example: 'GST' },
  { key: 'total_rate', label: 'Total Rate %', required: true, example: 18 },
  { key: 'cgst_rate', label: 'CGST %', required: false, example: 9 },
  { key: 'sgst_rate', label: 'SGST %', required: false, example: 9 },
  { key: 'igst_rate', label: 'IGST %', required: false, example: 18 },
  { key: 'cess_rate', label: 'CESS %', required: false, example: 0 },
  { key: 'is_active', label: 'Is Active (TRUE/FALSE)', required: false, example: 'TRUE' }
];

const TAX_IMPORT_SAMPLES = [
  {
    'Tax Name': 'GST 18%',
    'Tax Type (GST/IGST/TDS/CESS/VAT/OTHER)': 'GST',
    'Total Rate %': 18,
    'CGST %': 9,
    'SGST %': 9,
    'IGST %': 18,
    'CESS %': 0,
    'Is Active (TRUE/FALSE)': 'TRUE'
  },
  {
    'Tax Name': 'GST 12%',
    'Tax Type (GST/IGST/TDS/CESS/VAT/OTHER)': 'GST',
    'Total Rate %': 12,
    'CGST %': 6,
    'SGST %': 6,
    'IGST %': 12,
    'CESS %': 0,
    'Is Active (TRUE/FALSE)': 'TRUE'
  },
  {
    'Tax Name': 'GST 5%',
    'Tax Type (GST/IGST/TDS/CESS/VAT/OTHER)': 'GST',
    'Total Rate %': 5,
    'CGST %': 2.5,
    'SGST %': 2.5,
    'IGST %': 5,
    'CESS %': 0,
    'Is Active (TRUE/FALSE)': 'TRUE'
  }
];

const emptyTax = {
  tax_name: '',
  tax_type: 'GST',
  total_rate: '',
  cgst_rate: '',
  sgst_rate: '',
  igst_rate: '',
  cess_rate: '',
  is_active: true
};

export default function TaxMaster() {
  const { user } = useAuth();
  const [taxes, setTaxes] = useState([]);
  const [form, setForm] = useState(emptyTax);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const handleBulkImportTaxes = async (rows) => {
    const payload = {
      items: rows,
      company_id: user?.company_id
    };
    const res = await taxApi.bulkImport(payload);
    if (res?.data?.success) {
      await load();
      return {
        success: true,
        message: res.data.message || `Successfully processed ${rows.length} tax records!`
      };
    }
    return {
      success: false,
      message: res?.data?.message || 'Failed to import taxes.'
    };
  };

  const load = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      const response = await taxApi.getAll({ company_id: user.company_id });
      setTaxes(response.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load tax master');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.company_id]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form, company_id: user.company_id };
      if (editingId) {
        await taxApi.update(editingId, payload);
        toast.success('Tax master updated');
      } else {
        await taxApi.create(payload);
        toast.success('Tax master created');
      }
      setForm(emptyTax);
      setEditingId(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save tax');
    }
  };

  const edit = (tax) => {
    setEditingId(tax.tax_id);
    setForm({
      tax_name: tax.tax_name,
      tax_type: tax.tax_type,
      total_rate: tax.total_rate,
      cgst_rate: tax.cgst_rate,
      sgst_rate: tax.sgst_rate,
      igst_rate: tax.igst_rate,
      cess_rate: tax.cess_rate,
      is_active: tax.is_active
    });
  };

  const remove = async (tax) => {
    if (!window.confirm(`Deactivate ${tax.tax_name}?`)) return;
    try {
      await taxApi.remove(tax.tax_id, { company_id: user.company_id });
      toast.success('Tax deactivated');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to deactivate tax');
    }
  };

  const inputClass = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm';

  return (
    <main className="min-h-full bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-600 p-2.5 text-white"><Percent className="h-5 w-5" /></div>
            <div><h1 className="text-xl font-bold">Tax Master</h1><p className="text-xs text-slate-500">Create GST and statutory tax classifications</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Import Data</span>
            </button>
            <button onClick={load} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </header>

        <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">{editingId ? 'Edit Tax' : 'Create Tax'}</h2>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyTax); }} className="text-xs font-semibold text-slate-500">Cancel edit</button>}
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-xs font-semibold text-slate-600 md:col-span-2">Tax Name
              <input required placeholder="e.g. GST 18%" value={form.tax_name} onChange={e => setForm({ ...form, tax_name: e.target.value })} className={`${inputClass} mt-1`} />
            </label>
            <label className="text-xs font-semibold text-slate-600">Tax Type
              <select value={form.tax_type} onChange={e => setForm({ ...form, tax_type: e.target.value })} className={`${inputClass} mt-1`}>
                {['GST', 'IGST', 'TDS', 'CESS', 'VAT', 'OTHER'].map(type => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Total Rate %
              <input type="number" min="0" max="100" step="0.001" required value={form.total_rate} onChange={e => setForm({ ...form, total_rate: e.target.value })} className={`${inputClass} mt-1`} />
            </label>
            {[
              ['cgst_rate', 'CGST %'],
              ['sgst_rate', 'SGST %'],
              ['igst_rate', 'IGST %'],
              ['cess_rate', 'CESS %']
            ].map(([key, label]) => (
              <label key={key} className="text-xs font-semibold text-slate-600">{label}
                <input type="number" min="0" max="100" step="0.001" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className={`${inputClass} mt-1`} />
              </label>
            ))}
            <label className="flex items-end gap-2 text-xs font-semibold text-slate-600 pb-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active
            </label>
          </div>
          <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
            <Plus className="h-4 w-4" /> {editingId ? 'Update Tax' : 'Create Tax'}
          </button>
        </form>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Tax Name</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">CGST</th><th className="px-4 py-3 text-right">SGST</th><th className="px-4 py-3 text-right">IGST</th><th className="px-4 py-3 text-right">CESS</th><th className="px-4 py-3 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxes.map(tax => (
                <tr key={tax.tax_id} className={!tax.is_active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-semibold">{tax.tax_name}</td>
                  <td className="px-4 py-3">{tax.tax_type}</td>
                  <td className="px-4 py-3 text-right">{tax.total_rate}%</td>
                  <td className="px-4 py-3 text-right">{tax.cgst_rate}%</td>
                  <td className="px-4 py-3 text-right">{tax.sgst_rate}%</td>
                  <td className="px-4 py-3 text-right">{tax.igst_rate}%</td>
                  <td className="px-4 py-3 text-right">{tax.cess_rate}%</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => edit(tax)} className="p-1 text-indigo-600"><Edit3 className="h-4 w-4" /></button>
                    <button onClick={() => remove(tax)} className="ml-2 p-1 text-rose-500"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {!taxes.length && <tr><td colSpan="8" className="px-4 py-10 text-center text-slate-400">No taxes configured.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Taxes"
        moduleName="Tax Master"
        columns={TAX_IMPORT_COLUMNS}
        sampleData={TAX_IMPORT_SAMPLES}
        onImport={handleBulkImportTaxes}
      />
    </main>
  );
}
