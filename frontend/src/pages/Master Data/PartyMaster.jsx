import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Users, Truck, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { parties as partyApi } from '../../services/api';

const emptyForm = {
  party_code: '',
  party_name: '',
  party_type: 'BOTH',
  gstin: '',
  pan: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state_code: '27',
  postal_code: '',
  country: 'India',
  payment_terms: 'Net 30',
  credit_limit: 0,
  credit_period_days: 30,
  opening_balance: 0,
  opening_balance_type: 'DR'
};

const PartyMaster = () => {
  const { user } = useAuth();
  const [parties, setParties] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      const response = await partyApi.getAll({ company_id: user.company_id, search });
      setParties(response.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load party master');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.company_id]);
  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleGstinChange = (value) => {
    const gstin = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15);
    const derivedPan = gstin.length >= 12 ? gstin.substring(2, 12) : '';
    const derivedStateCode = gstin.length >= 2 ? gstin.substring(0, 2) : form.state_code;
    setForm(prev => ({
      ...prev,
      gstin,
      pan: derivedPan || prev.pan,
      state_code: derivedStateCode
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.party_name.trim()) return toast.error('Party name is required');
    setSaving(true);
    try {
      await partyApi.create({ ...form, company_id: user.company_id });
      toast.success('Party created for the selected transaction types');
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create party');
    } finally {
      setSaving(false);
    }
  };

  const visibleParties = useMemo(
    () => typeFilter === 'ALL' ? parties : parties.filter(party => party.party_type === typeFilter),
    [parties, typeFilter]
  );

  const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm';

  return (
    <main className="min-h-full bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-600 p-2.5 text-white"><Users className="h-5 w-5" /></div>
            <div>
              <h1 className="text-xl font-bold">Party Master</h1>
              <p className="text-xs text-slate-500">Create customers, suppliers, or parties for both transactions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="rounded-lg border border-slate-200 p-2 text-slate-500"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Add Party</button>
          </div>
        </header>

        {showForm && (
          <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">New Party</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-xs font-bold text-slate-500">Close</button>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-xs font-semibold text-slate-600">Party Type
                <select required value={form.party_type} onChange={e => setForm({ ...form, party_type: e.target.value })} className={inputClass}>
                  <option value="CUSTOMER">Customer</option>
                  <option value="SUPPLIER">Supplier</option>
                  <option value="BOTH">Customer + Supplier (Both)</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">Party Name
                <input required value={form.party_name} onChange={e => setForm({ ...form, party_name: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-600">Party Code
                <input value={form.party_code} onChange={e => setForm({ ...form, party_code: e.target.value.toUpperCase() })} placeholder="Auto generated" className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-600">GSTIN
                <input
                  maxLength={15}
                  value={form.gstin}
                  onChange={e => handleGstinChange(e.target.value)}
                  placeholder="Enter 15-character GSTIN"
                  className={inputClass}
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">PAN
                <input
                  maxLength={10}
                  value={form.pan}
                  onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                  placeholder="Auto-filled from GSTIN"
                  className={inputClass}
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">Phone
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-600">Email
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-600">Payment Terms
                <input value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-600 md:col-span-2">Address
                <input required value={form.address_line1} onChange={e => setForm({ ...form, address_line1: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-600">City
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-600">State Code
                <input value={form.state_code} onChange={e => setForm({ ...form, state_code: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-600">PIN Code
                <input value={form.postal_code} onChange={e => setForm({ ...form, postal_code: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-600">Opening Balance
                <input type="number" min="0" step="0.01" value={form.opening_balance} onChange={e => setForm({ ...form, opening_balance: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-600">Opening Balance Type
                <select value={form.opening_balance_type} onChange={e => setForm({ ...form, opening_balance_type: e.target.value })} className={inputClass}>
                  <option value="DR">DR</option>
                  <option value="CR">CR</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">Credit Limit
                <input type="number" min="0" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-slate-600">Credit Period Days
                <input type="number" min="0" value={form.credit_period_days} onChange={e => setForm({ ...form, credit_period_days: e.target.value })} className={inputClass} />
              </label>
            </div>
            <button disabled={saving} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save Party'}</button>
          </form>
        )}

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search party name, code or GSTIN" className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            {['ALL', 'CUSTOMER', 'SUPPLIER', 'BOTH'].map(type => (
              <button key={type} onClick={() => setTypeFilter(type)} className={`rounded-lg px-3 py-2 text-xs font-bold ${typeFilter === type ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{type}</button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Party</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">GSTIN</th><th className="px-4 py-3">City</th><th className="px-4 py-3 text-right">Opening</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {visibleParties.map(party => (
                  <tr key={party.party_id}>
                    <td className="px-4 py-3"><div className="font-semibold">{party.party_name}</div><div className="text-xs text-slate-400">{party.party_code}</div></td>
                    <td className="px-4 py-3">{party.party_type === 'BOTH' ? <span className="inline-flex items-center gap-1 text-violet-700"><UserRound className="h-3.5 w-3.5" /> Both</span> : party.party_type === 'CUSTOMER' ? <span className="text-indigo-700">Customer</span> : <span className="text-emerald-700">Supplier</span>}</td>
                    <td className="px-4 py-3">{party.gstin || '-'}</td>
                    <td className="px-4 py-3">{party.city || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{party.opening_balance} {party.opening_balance_type}</td>
                  </tr>
                ))}
                {!visibleParties.length && <tr><td colSpan="5" className="px-4 py-10 text-center text-slate-400">No parties found.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

export default PartyMaster;
