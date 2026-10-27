import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  sales as salesApi,
  customers as customersApi,
  products as productsApi,
  services as servicesApi
} from '../../services/api';
import toast from 'react-hot-toast';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Eye,
  Printer,
  Calendar,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  X,
  Trash2,
  FileCheck,
  ShieldCheck,
  CreditCard,
  Package,
  Wrench
} from 'lucide-react';

const SalesInvoiceManagement = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [invoices, setInvoices] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const initialForm = {
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    freight_charges: 0,
    other_charges: 0,
    items: [
      {
        item_type: 'PRODUCT',
        product_id: '',
        service_id: '',
        quantity: 1,
        unit_rate: 0,
        unit_of_measure: 'PCS',
        discount_percentage: 0,
        tax_rate: 18,
        hsn_sac_code: ''
      }
    ],
    quotation_id: '',
    quotation_edit_mode: false
  };
  const [form, setForm] = useState(initialForm);

  const fetchInvoices = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await salesApi.getInvoices({ company_id: companyId, search, payment_status: statusFilter });
      setInvoices(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load sales invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    if (!companyId) return;
    try {
      const [cRes, pRes, sRes, qRes] = await Promise.all([
        customersApi.getAll({ company_id: companyId, status: true }),
        productsApi.getAll({ company_id: companyId }),
        servicesApi.getAll({ company_id: companyId, status: 'Active' }),
        salesApi.getQuotations({ company_id: companyId })
      ]);
      setCustomersList(cRes.data.data || []);
      setProductsList(pRes.data.data || pRes.data || []);
      setServicesList(sRes.data.data || []);
      setQuotations(qRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchDropdowns();
  }, [companyId, search, statusFilter]);

  // Selected Customer details
  const selectedCustomer = useMemo(() => {
    return customersList.find(c => String(c.customer_id) === String(form.customer_id));
  }, [form.customer_id, customersList]);

  const availableQuotations = useMemo(
    () => quotations.filter(quotation => quotation.status === 'DRAFT'),
    [quotations]
  );

  const selectedQuotation = useMemo(
    () => availableQuotations.find(
      quotation => String(quotation.quotation_id) === String(form.quotation_id)
    ),
    [availableQuotations, form.quotation_id]
  );

  const quotationSelected = Boolean(selectedQuotation);
  const quotationEditMode = quotationSelected && form.quotation_edit_mode;

  const selectQuotation = (quotationId) => {
    const quotation = availableQuotations.find(
      item => String(item.quotation_id) === String(quotationId)
    );

    if (!quotation) {
      setForm({
        ...form,
        quotation_id: '',
        quotation_edit_mode: false
      });
      return;
    }

    setForm({
      ...form,
      quotation_id: quotationId,
      quotation_edit_mode: false,
      customer_id: String(quotation.customer_id),
      items: (quotation.items || []).map(item => ({
        item_type: item.item_type || (item.service_id ? 'SERVICE' : 'PRODUCT'),
        product_id: item.product_id ? String(item.product_id) : '',
        service_id: item.service_id ? String(item.service_id) : '',
        quantity: item.quantity,
        unit_rate: item.quoted_rate,
        unit_of_measure: item.unit_of_measure || (item.service_id ? 'HRS' : 'PCS'),
        discount_percentage: item.discount_percentage || 0,
        tax_rate: item.tax_rate,
        hsn_sac_code: item.hsn_sac_code || ''
      })),
      freight_charges: 0,
      other_charges: 0
    });
  };

  // Handle Item Row Change
  const updateItemRow = (index, field, value) => {
    const updated = [...form.items];
    updated[index][field] = value;

    if (field === 'item_type') {
      updated[index].product_id = '';
      updated[index].service_id = '';
      updated[index].unit_rate = 0;
      updated[index].unit_of_measure = value === 'SERVICE' ? 'HRS' : 'PCS';
      updated[index].hsn_sac_code = value === 'SERVICE' ? '9983' : '9988';
    }

    if (field === 'product_id') {
      const prod = productsList.find(p => String(p.product_id) === String(value));
      if (prod) {
        const masterPrice = parseFloat(prod.selling_price ?? prod.price ?? prod.cost_price ?? 0);
        updated[index].unit_rate = masterPrice;
        updated[index].tax_rate = parseFloat(prod.gst_rate ?? 18);
        updated[index].unit_of_measure = prod.unit_of_measure || 'PCS';
        updated[index].hsn_sac_code = prod.hsn_code || '9988';
      }
    }

    if (field === 'service_id') {
      const srv = servicesList.find(s => String(s.service_id) === String(value));
      if (srv) {
        const masterPrice = parseFloat(srv.service_charge ?? srv.selling_price ?? 0);
        updated[index].unit_rate = masterPrice;
        updated[index].tax_rate = parseFloat(srv.gst_rate ?? 18);
        updated[index].unit_of_measure = srv.unit_of_measure || 'HRS';
        updated[index].hsn_sac_code = srv.sac_code || srv.hsn_code || '9983';
      }
    }

    setForm({ ...form, items: updated });
  };

  const addItemRow = (type = 'PRODUCT') => {
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          item_type: type,
          product_id: '',
          service_id: '',
          quantity: 1,
          unit_rate: 0,
          unit_of_measure: type === 'SERVICE' ? 'HRS' : 'PCS',
          discount_percentage: 0,
          tax_rate: 18,
          hsn_sac_code: type === 'SERVICE' ? '9983' : '9988'
        }
      ]
    });
  };

  const removeItemRow = (index) => {
    if (form.items.length === 1) return;
    setForm({
      ...form,
      items: form.items.filter((_, idx) => idx !== index)
    });
  };

  // Live Invoice Computation
  const invoiceCalculation = useMemo(() => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (selectedQuotation && !quotationEditMode) {
      return {
        taxable: parseFloat(selectedQuotation.total_taxable_amount || 0),
        cgst: (selectedQuotation.items || []).reduce((sum, item) => sum + parseFloat(item.cgst_amount || 0), 0),
        sgst: (selectedQuotation.items || []).reduce((sum, item) => sum + parseFloat(item.sgst_amount || 0), 0),
        igst: (selectedQuotation.items || []).reduce((sum, item) => sum + parseFloat(item.igst_amount || 0), 0),
        roundOff: 0,
        total: parseFloat(selectedQuotation.net_amount || 0),
        isIntraState: selectedCustomer ? selectedCustomer.billing_state_code === '27' : true
      };
    }

    const isIntraState = selectedCustomer ? selectedCustomer.billing_state_code === '27' : true;

    form.items.forEach(it => {
      const qty = parseFloat(it.quantity) || 0;
      const rate = parseFloat(it.unit_rate) || 0;
      const disc = parseFloat(it.discount_percentage) || 0;
      const gross = qty * rate;
      const discAmt = gross * (disc / 100);
      const lineTaxable = gross - discAmt;
      const taxRate = parseFloat(it.tax_rate) || 18;

      taxable += lineTaxable;
      if (isIntraState) {
        cgst += lineTaxable * (taxRate / 200);
        sgst += lineTaxable * (taxRate / 200);
      } else {
        igst += lineTaxable * (taxRate / 100);
      }
    });

    const freight = parseFloat(form.freight_charges) || 0;
    const other = parseFloat(form.other_charges) || 0;
    const subtotal = taxable + cgst + sgst + igst + freight + other;
    const rounded = Math.round(subtotal);
    const roundOff = +(rounded - subtotal).toFixed(2);

    return {
      taxable: +taxable.toFixed(2),
      cgst: +cgst.toFixed(2),
      sgst: +sgst.toFixed(2),
      igst: +igst.toFixed(2),
      roundOff,
      total: rounded,
      isIntraState
    };
  }, [form.items, form.freight_charges, form.other_charges, selectedCustomer, selectedQuotation, quotationEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) {
      toast.error('Please select a Customer');
      return;
    }
    if (!form.quotation_id && form.items.some(it => {
      const isSrv = it.item_type === 'SERVICE';
      const missingId = isSrv ? !it.service_id : !it.product_id;
      return missingId || parseFloat(it.quantity) <= 0;
    })) {
      toast.error('All line items must have a Product or Service selected, and valid Quantity');
      return;
    }

    try {
      setSubmitting(true);
      await salesApi.createInvoice({
        ...form,
        company_id: companyId,
        branch_id: user?.branch_id || null
      });
      toast.success('Tax Invoice & Double-Entry Voucher posted successfully!');
      setIsCreateOpen(false);
      setForm(initialForm);
      await Promise.all([fetchInvoices(), fetchDropdowns()]);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create sales invoice');
    } finally {
      setSubmitting(false);
    }
  };

  // KPI Metrics
  const stats = useMemo(() => {
    const totalBilled = invoices.reduce((acc, i) => acc + parseFloat(i.net_total_amount || 0), 0);
    const totalPaid = invoices.reduce((acc, i) => acc + parseFloat(i.paid_amount || 0), 0);
    const totalOutstanding = invoices.reduce((acc, i) => acc + parseFloat(i.outstanding_amount || 0), 0);
    const count = invoices.length;
    return { totalBilled, totalPaid, totalOutstanding, count };
  }, [invoices]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Receipt className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Sales Invoices & Commercial Billing</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            GST-compliant automated tax billing with perpetual double-entry ledger integration and real-time ledger postings.
          </p>
        </div>
        <button
          onClick={() => { setForm(initialForm); setIsCreateOpen(true); }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Tax Invoice
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Invoiced (Gross)</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">₹{stats.totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs text-slate-500 mt-1">{stats.count} Total Invoices</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Payments Collected</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">₹{stats.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs text-slate-500 mt-1">Settled in Bank / Cash</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Outstanding Receivables</p>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">₹{stats.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs text-slate-500 mt-1">Pending customer settlement</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Voucher Auto-Posting</p>
          <h3 className="text-xl font-bold text-indigo-600 mt-1">Active (100%)</h3>
          <p className="text-xs text-slate-500 mt-1">Double entry DR = CR</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice #, customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">All Payment Statuses</option>
          <option value="UNPAID">UNPAID</option>
          <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
          <option value="PAID">PAID</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">Invoice # / Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Taxable Amount</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Outstanding Due</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Accounting Voucher</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">Loading sales invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No sales invoices found. Click "Create Tax Invoice" to bill your first customer!
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.sales_invoice_id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 font-mono">{inv.invoice_number}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{new Date(inv.invoice_date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{inv.customer_name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{inv.customer_code}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      ₹{parseFloat(inv.total_taxable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{parseFloat(inv.net_total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${parseFloat(inv.outstanding_amount) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        ₹{parseFloat(inv.outstanding_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        inv.payment_status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700'
                          : inv.payment_status === 'PARTIALLY_PAID'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-indigo-600 bg-indigo-50/60 px-2.5 py-1 rounded-lg w-max">
                        <FileCheck className="w-3.5 h-3.5" />
                        {inv.voucher_number || 'Posted'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={async () => {
                          const res = await salesApi.getInvoiceById(inv.sales_invoice_id);
                          setViewInvoice(res.data.data);
                        }}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition inline-flex items-center gap-1 text-xs"
                      >
                        <Eye className="w-4 h-4" />
                        Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Tax Invoice Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                New Tax Invoice & Accounting Voucher
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Header Info */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Take From Quotation (Optional)
                </label>
                <select
                  value={form.quotation_id}
                  onChange={(e) => selectQuotation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Create invoice manually</option>
                  {availableQuotations.map(quotation => (
                    <option key={quotation.quotation_id} value={quotation.quotation_id}>
                      {quotation.quotation_number} - {quotation.customer_name} - ₹{parseFloat(quotation.net_amount || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
                {selectedQuotation && (
                  <div className="flex items-center justify-between gap-3 mt-1">
                    <p className="text-[11px] text-slate-500">
                      Quotation values are loaded automatically and locked by default.
                    </p>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, quotation_edit_mode: !form.quotation_edit_mode })}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
                    >
                      {form.quotation_edit_mode ? 'Lock Quotation Values' : 'Edit Invoice'}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer *</label>
                  <select
                    required
                    value={form.customer_id}
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                    disabled={quotationSelected && !quotationEditMode}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Select Customer...</option>
                    {customersList.map(c => (
                      <option key={c.customer_id} value={c.customer_id}>
                        {c.trade_name} ({c.customer_code})
                      </option>
                    ))}
                  </select>
                  {selectedCustomer && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      GSTIN: {selectedCustomer.gstin || 'Unregistered'} | State: {selectedCustomer.billing_state_code}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={form.invoice_date}
                    onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    required
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Items Table with Product and Service Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Line Items (Products & Services)</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                      {form.items.length} item{form.items.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addItemRow('PRODUCT')}
                      disabled={quotationSelected && !quotationEditMode}
                      className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Product
                    </button>
                    <button
                      type="button"
                      onClick={() => addItemRow('SERVICE')}
                      disabled={quotationSelected && !quotationEditMode}
                      className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Service
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-2.5 w-36">Item Type</th>
                        <th className="p-2.5">Product / Service Selection</th>
                        <th className="p-2.5 w-24">Qty & UOM</th>
                        <th className="p-2.5 w-28">Rate (₹)</th>
                        <th className="p-2.5 w-16">Disc %</th>
                        <th className="p-2.5 w-20">GST %</th>
                        <th className="p-2.5 text-right w-28">Total (₹)</th>
                        <th className="p-2.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.items.map((row, idx) => {
                        const qty = parseFloat(row.quantity) || 0;
                        const rate = parseFloat(row.unit_rate) || 0;
                        const disc = parseFloat(row.discount_percentage) || 0;
                        const taxable = (qty * rate) * (1 - disc / 100);
                        const tax = taxable * ((parseFloat(row.tax_rate) || 18) / 100);
                        const rowTotal = quotationSelected && !quotationEditMode
                          ? parseFloat((selectedQuotation.items || [])[idx]?.total_amount || 0)
                          : taxable + tax;

                        const isService = row.item_type === 'SERVICE';

                        return (
                          <tr key={idx} className={`hover:bg-slate-50/50 ${isService ? 'bg-emerald-50/15' : ''}`}>
                            {/* Type Toggle Pill */}
                            <td className="p-2">
                              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 w-fit">
                                <button
                                  type="button"
                                  disabled={quotationSelected && !quotationEditMode}
                                  onClick={() => updateItemRow(idx, 'item_type', 'PRODUCT')}
                                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                                    !isService ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  <Package size={11} /> Product
                                </button>
                                <button
                                  type="button"
                                  disabled={quotationSelected && !quotationEditMode}
                                  onClick={() => updateItemRow(idx, 'item_type', 'SERVICE')}
                                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                                    isService ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  <Wrench size={11} /> Service
                                </button>
                              </div>
                            </td>

                            {/* Item Selector */}
                            <td className="p-2">
                              {isService ? (
                                <div>
                                  <select
                                    required
                                    value={row.service_id}
                                    onChange={(e) => updateItemRow(idx, 'service_id', e.target.value)}
                                    disabled={quotationSelected && !quotationEditMode}
                                    className="w-full px-2.5 py-1.5 bg-emerald-50/40 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium text-xs text-slate-800"
                                  >
                                    <option value="">-- Select Service --</option>
                                    {servicesList.map(s => (
                                      <option key={s.service_id} value={s.service_id}>
                                        {s.service_name} ({s.service_code || `SRV-${s.service_id}`}) - ₹{parseFloat(s.service_charge ?? s.selling_price ?? 0).toFixed(2)} / {s.unit_of_measure}
                                      </option>
                                    ))}
                                  </select>
                                  {row.hsn_sac_code && (
                                    <span className="text-[10px] text-emerald-700 font-mono font-semibold ml-1">
                                      SAC: {row.hsn_sac_code}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <select
                                    required
                                    value={row.product_id}
                                    onChange={(e) => updateItemRow(idx, 'product_id', e.target.value)}
                                    disabled={quotationSelected && !quotationEditMode}
                                    className="w-full px-2.5 py-1.5 bg-indigo-50/30 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-xs text-slate-800"
                                  >
                                    <option value="">-- Select Product --</option>
                                    {productsList.map(p => (
                                      <option key={p.product_id} value={p.product_id}>
                                        {p.product_name} ({p.sku || p.product_code || `P-${p.product_id}`}) - ₹{parseFloat(p.selling_price ?? p.price ?? 0).toFixed(2)}
                                      </option>
                                    ))}
                                  </select>
                                  {row.hsn_sac_code && (
                                    <span className="text-[10px] text-indigo-700 font-mono font-semibold ml-1">
                                      HSN: {row.hsn_sac_code}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Qty & Unit */}
                            <td className="p-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="any"
                                  value={row.quantity}
                                  onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                                  readOnly={quotationSelected && !quotationEditMode}
                                  className="w-14 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-right font-medium"
                                />
                                <span className="text-[10px] font-bold text-slate-500">{row.unit_of_measure || (isService ? 'HRS' : 'PCS')}</span>
                              </div>
                            </td>

                            {/* Unit Rate */}
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.unit_rate}
                                onChange={(e) => updateItemRow(idx, 'unit_rate', e.target.value)}
                                readOnly={quotationSelected && !quotationEditMode}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-right font-mono font-medium"
                              />
                            </td>

                            {/* Discount */}
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.discount_percentage}
                                onChange={(e) => updateItemRow(idx, 'discount_percentage', e.target.value)}
                                readOnly={quotationSelected && !quotationEditMode}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-right font-medium"
                              />
                            </td>

                            {/* Tax Rate */}
                            <td className="p-2">
                              <select
                                value={row.tax_rate}
                                onChange={(e) => updateItemRow(idx, 'tax_rate', e.target.value)}
                                disabled={quotationSelected && !quotationEditMode}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700"
                              >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>

                            {/* Row Total */}
                            <td className="p-2 text-right font-black text-slate-900">
                              ₹{rowTotal.toFixed(2)}
                            </td>

                            {/* Remove button */}
                            <td className="p-2 text-center">
                              {form.items.length > 1 && (!quotationSelected || quotationEditMode) && (
                                <button
                                  type="button"
                                  onClick={() => removeItemRow(idx)}
                                  className="text-rose-500 hover:text-rose-700 p-1"
                                  title="Remove Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary and Posting Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {/* Double-Entry Posting Preview */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Double-Entry Voucher Automation Preview
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between text-slate-800">
                      <span>DR: Customer Ledger ({selectedCustomer?.trade_name || 'Customer'})</span>
                      <span className="font-bold">₹{invoiceCalculation.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>CR: General Sales Revenue</span>
                      <span>₹{invoiceCalculation.taxable.toFixed(2)}</span>
                    </div>
                    {invoiceCalculation.isIntraState ? (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>CR: CGST Output (Central GST)</span>
                          <span>₹{invoiceCalculation.cgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>CR: SGST Output (State GST)</span>
                          <span>₹{invoiceCalculation.sgst.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-slate-600">
                        <span>CR: IGST Output (Integrated GST)</span>
                        <span>₹{invoiceCalculation.igst.toFixed(2)}</span>
                      </div>
                    )}
                    {invoiceCalculation.roundOff !== 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Round Off Difference</span>
                        <span>₹{invoiceCalculation.roundOff.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Value:</span>
                    <span className="font-semibold text-slate-800">₹{invoiceCalculation.taxable.toFixed(2)}</span>
                  </div>
                  {invoiceCalculation.isIntraState ? (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST Amount:</span>
                        <span className="text-slate-800">₹{invoiceCalculation.cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST Amount:</span>
                        <span className="text-slate-800">₹{invoiceCalculation.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST Amount:</span>
                      <span className="text-slate-800">₹{invoiceCalculation.igst.toFixed(2)}</span>
                    </div>
                  )}
                  {invoiceCalculation.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Round Off:</span>
                      <span>₹{invoiceCalculation.roundOff.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Net Invoice Total:</span>
                    <span className="text-indigo-600">₹{invoiceCalculation.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Posting Voucher...' : 'Generate Invoice & Post Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Printable Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Tax Invoice: {viewInvoice.invoice_number}</h3>
              </div>
              <button onClick={() => setViewInvoice(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Header Box */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">TAX INVOICE</h2>
                  <p className="text-xs text-slate-500 font-mono mt-1">Invoice #: {viewInvoice.invoice_number}</p>
                  <p className="text-xs text-slate-500">Date: {new Date(viewInvoice.invoice_date).toLocaleDateString()}</p>
                  <p className="text-xs text-slate-500">Due: {new Date(viewInvoice.due_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-800">Bill To: {viewInvoice.customer_name}</div>
                  <div className="text-xs text-slate-500">{viewInvoice.billing_address_line1}, {viewInvoice.billing_city}</div>
                  <div className="text-xs text-slate-500 font-mono">GSTIN: {viewInvoice.customer_gstin || 'Unregistered'}</div>
                  <div className="text-xs text-slate-500">Place of Supply: State {viewInvoice.place_of_supply_state_code}</div>
                </div>
              </div>

              {/* Items */}
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5">HSN / SAC</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Rate</th>
                    <th className="p-2.5 text-right">Taxable</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewInvoice.items?.map((item, idx) => {
                    const isSrv = item.item_type === 'SERVICE' || Boolean(item.service_id);
                    return (
                      <tr key={idx}>
                        <td className="p-2.5 text-slate-400">{idx + 1}</td>
                        <td className="p-2.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isSrv ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {isSrv ? 'SERVICE' : 'PRODUCT'}
                          </span>
                        </td>
                        <td className="p-2.5 font-medium text-slate-900">
                          {item.item_name || item.product_name}
                        </td>
                        <td className="p-2.5 font-mono text-slate-500">{item.hsn_sac_code || (isSrv ? '9983' : '9988')}</td>
                        <td className="p-2.5 text-right">{parseFloat(item.quantity)} {item.unit_of_measure}</td>
                        <td className="p-2.5 text-right">₹{parseFloat(item.unit_rate).toFixed(2)}</td>
                        <td className="p-2.5 text-right">₹{parseFloat(item.taxable_amount).toFixed(2)}</td>
                        <td className="p-2.5 text-right font-semibold text-slate-900">₹{parseFloat(item.total_amount).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Summary */}
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount:</span>
                    <span className="font-semibold text-slate-800">₹{parseFloat(viewInvoice.total_taxable_amount).toFixed(2)}</span>
                  </div>
                  {parseFloat(viewInvoice.total_cgst_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>CGST:</span>
                      <span>₹{parseFloat(viewInvoice.total_cgst_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(viewInvoice.total_sgst_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>SGST:</span>
                      <span>₹{parseFloat(viewInvoice.total_sgst_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(viewInvoice.total_igst_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST:</span>
                      <span>₹{parseFloat(viewInvoice.total_igst_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Net Invoice Total:</span>
                    <span className="text-indigo-600">₹{parseFloat(viewInvoice.net_total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <div className="text-xs text-slate-500 font-mono">
                Accounting Voucher: {viewInvoice.voucher_number || 'POSTED'}
              </div>
              <button
                onClick={() => setViewInvoice(null)}
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

export default SalesInvoiceManagement;
