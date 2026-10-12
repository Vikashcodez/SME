import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { customers as customersApi, companies as companiesApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Search,
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Eye,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  FileText,
  DollarSign,
  X
} from 'lucide-react';

const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
];

const GST_REG_TYPES = ['REGULAR', 'COMPOSITION', 'UNREGISTERED', 'CONSUMER', 'OVERSEAS', 'SEZ'];

const CustomerMaster = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [customerList, setCustomerList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewCustomer, setViewCustomer] = useState(null);

  // Form State
  const initialForm = {
    trade_name: '',
    legal_name: '',
    customer_code: '',
    gstin: '',
    gst_registration_type: 'UNREGISTERED',
    pan: '',
    primary_contact_name: '',
    email: '',
    phone: '',
    billing_address_line1: '',
    billing_city: '',
    billing_state_code: '27',
    billing_postal_code: '',
    credit_limit: 0,
    credit_period_days: 30,
    opening_balance: 0,
    opening_balance_type: 'DR'
  };
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const fetchCustomers = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await customersApi.getAll({ company_id: companyId, search, status: statusFilter });
      setCustomerList(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [companyId, search, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = customerList.length;
    const active = customerList.filter(c => c.is_active).length;
    const totalOutstanding = customerList.reduce((acc, c) => acc + (parseFloat(c.total_outstanding_due) || 0), 0);
    const totalBalance = customerList.reduce((acc, c) => acc + (parseFloat(c.current_balance) || 0), 0);
    return { total, active, totalOutstanding, totalBalance };
  }, [customerList]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.trade_name || !form.billing_address_line1 || !form.billing_city || !form.billing_postal_code) {
      toast.error('Please fill required fields (Trade Name, Address, City, Pincode)');
      return;
    }

    try {
      setSaving(true);
      await customersApi.create({ ...form, company_id: companyId });
      toast.success('Customer profile and Sundry Debtors ledger created!');
      setIsModalOpen(false);
      setForm(initialForm);
      fetchCustomers();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error creating customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Customer Master</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Commercial customer profiles linked 1:1 with unified double-entry Chart of Accounts (Sundry Debtors).
          </p>
        </div>
        <button
          onClick={() => { setForm(initialForm); setIsModalOpen(true); }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Customers</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</h3>
            <p className="text-xs text-emerald-600 mt-1 font-medium">{stats.active} Active accounts</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ledger Balance (DR)</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">₹{stats.totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs text-slate-500 mt-1">Aggregated receivable</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unpaid Invoices Due</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">₹{stats.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs text-slate-500 mt-1">Pending bill clearances</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tally Ledger Status</p>
            <h3 className="text-xl font-bold text-emerald-600 mt-1">Synced</h3>
            <p className="text-xs text-slate-500 mt-1">Auto bill-wise enabled</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer name, GSTIN, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">Customer / Code</th>
                <th className="px-6 py-4">GSTIN & State</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Credit Terms</th>
                <th className="px-6 py-4">Current Balance</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">Loading customers...</td>
                </tr>
              ) : customerList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No customers found. Click "Add Customer" to create one.
                  </td>
                </tr>
              ) : (
                customerList.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{c.trade_name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{c.customer_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800 font-mono text-xs">{c.gstin || 'Unregistered'}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{c.billing_city}, State: {c.billing_state_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800 text-xs flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {c.phone || 'N/A'}
                      </div>
                      {c.email && (
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {c.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-800 font-medium">{c.default_credit_period_days} Days</div>
                      <div className="text-xs text-slate-400">Limit: ₹{(parseFloat(c.credit_limit) || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        ₹{(parseFloat(c.current_balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {c.current_balance_type}
                      </div>
                      {parseFloat(c.total_outstanding_due) > 0 && (
                        <div className="text-xs text-amber-600 font-medium mt-0.5">
                          Due: ₹{parseFloat(c.total_outstanding_due).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={async () => {
                          const res = await customersApi.getById(c.customer_id);
                          setViewCustomer(res.data.data);
                        }}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition inline-flex items-center gap-1 text-xs"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Add New Customer Profile
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trade Name *</label>
                  <input
                    type="text"
                    required
                    value={form.trade_name}
                    onChange={(e) => setForm({ ...form, trade_name: e.target.value })}
                    placeholder="e.g. Acme Industries Ltd"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Legal Name</label>
                  <input
                    type="text"
                    value={form.legal_name}
                    onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                    placeholder="Official registration name"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Registration Type</label>
                  <select
                    value={form.gst_registration_type}
                    onChange={(e) => setForm({ ...form, gst_registration_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {GST_REG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={form.gstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      const panVal = val.length >= 12 ? val.substring(2, 12) : form.pan;
                      const stateVal = val.length >= 2 ? val.substring(0, 2) : form.billing_state_code;
                      setForm({ ...form, gstin: val, pan: panVal, billing_state_code: stateVal });
                    }}
                    placeholder="e.g. 27AABCT3518Q1ZV"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={form.pan}
                    onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                    placeholder="e.g. AABCT3518Q"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Contact Person</label>
                  <input
                    type="text"
                    value={form.primary_contact_name}
                    onChange={(e) => setForm({ ...form, primary_contact_name: e.target.value })}
                    placeholder="Contact name"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="billing@customer.com"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Billing Address */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Billing Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address *</label>
                    <input
                      type="text"
                      required
                      value={form.billing_address_line1}
                      onChange={(e) => setForm({ ...form, billing_address_line1: e.target.value })}
                      placeholder="Plot No, Street, Industrial Area"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={form.billing_city}
                      onChange={(e) => setForm({ ...form, billing_city: e.target.value })}
                      placeholder="City"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State Code (GST)</label>
                    <select
                      value={form.billing_state_code}
                      onChange={(e) => setForm({ ...form, billing_state_code: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {INDIAN_STATES.map(s => (
                        <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode *</label>
                    <input
                      type="text"
                      required
                      value={form.billing_postal_code}
                      onChange={(e) => setForm({ ...form, billing_postal_code: e.target.value })}
                      placeholder="400001"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Accounting & Credit Controls */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Accounting & Credit Controls</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Limit (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.credit_limit}
                      onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Days</label>
                    <input
                      type="number"
                      min="0"
                      value={form.credit_period_days}
                      onChange={(e) => setForm({ ...form, credit_period_days: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.opening_balance}
                      onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Customer & Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Customer Details Modal */}
      {viewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewCustomer.trade_name}</h3>
                <p className="text-xs text-slate-500 font-mono">Code: {viewCustomer.customer_code} | Ledger: {viewCustomer.ledger_name}</p>
              </div>
              <button
                onClick={() => setViewCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="text-xs text-slate-400">Current Balance</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    ₹{parseFloat(viewCustomer.current_balance || 0).toLocaleString()} {viewCustomer.current_balance_type}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Credit Limit</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">₹{parseFloat(viewCustomer.credit_limit || 0).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Credit Days</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{viewCustomer.default_credit_period_days} Days</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">GST Registration</span>
                  <p className="text-xs font-semibold text-indigo-600 mt-1">{viewCustomer.gst_registration_type}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Registration & Tax</h4>
                <div className="text-xs space-y-1 text-slate-700">
                  <p><span className="font-semibold">GSTIN:</span> {viewCustomer.gstin || 'None'}</p>
                  <p><span className="font-semibold">PAN:</span> {viewCustomer.pan || 'None'}</p>
                  <p><span className="font-semibold">Billing Address:</span> {viewCustomer.billing_address_line1}, {viewCustomer.billing_city}, State Code: {viewCustomer.billing_state_code} - {viewCustomer.billing_postal_code}</p>
                </div>
              </div>

              {viewCustomer.recent_invoices && viewCustomer.recent_invoices.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recent Invoices</h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="p-2.5">Invoice #</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Total</th>
                          <th className="p-2.5">Balance Due</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewCustomer.recent_invoices.map(inv => (
                          <tr key={inv.invoice_id}>
                            <td className="p-2.5 font-mono font-medium text-slate-800">{inv.invoice_number}</td>
                            <td className="p-2.5 text-slate-500">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                            <td className="p-2.5 font-semibold text-slate-900">₹{parseFloat(inv.total_amount).toLocaleString()}</td>
                            <td className="p-2.5 text-amber-600 font-semibold">₹{parseFloat(inv.balance_due || inv.outstanding_amount || 0).toLocaleString()}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                inv.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {inv.payment_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setViewCustomer(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMaster;
