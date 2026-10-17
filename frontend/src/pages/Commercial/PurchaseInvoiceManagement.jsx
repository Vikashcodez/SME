import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { purchases as purchaseApi, rawMaterials as rawMaterialApi, vendors as vendorsApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  FileText,
  Plus,
  Search,
  Filter,
  DollarSign,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  Trash2,
  Eye,
  Building,
  RefreshCw,
  X,
  CreditCard,
  PackageCheck
} from 'lucide-react';

const PurchaseInvoiceManagement = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'new-invoice' | 'payment-settlement'
  const [invoices, setInvoices] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [rawMaterialsList, setRawMaterialsList] = useState([]);
  const [pendingGrns, setPendingGrns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected invoice for detail modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // New Invoice Form State
  const [newInvoice, setNewInvoice] = useState({
    vendor_id: '',
    supplier_invoice_number: '',
    supplier_invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    place_of_supply_state_code: '27',
    other_charges: 0,
    items: [
      { raw_material_id: '', quantity: 1, unit_rate: 0, tax_rate: 18, hsn_code: '', unit_of_measure: 'PCS', batch_number: '' }
    ],
    grn_id: ''
  });

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    vendor_id: '',
    amount: '',
    payment_mode: 'BANK',
    instrument_type: 'NEFT',
    instrument_reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    narration: '',
    invoices_to_settle: [],
    selected_invoice_id: ''
  });
  const [unpaidBills, setUnpaidBills] = useState([]);

  // Fetch Invoices
  const fetchInvoices = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await purchaseApi.getInvoices({ company_id: companyId });
      setInvoices(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load purchase invoices');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Vendors and Raw Materials
  const fetchMasterData = async () => {
    if (!companyId) return;
    try {
      const [vRes, rmRes, grnRes] = await Promise.all([
        vendorsApi.getAll({ company_id: companyId, is_active: true }),
        rawMaterialApi.getAll({ company_id: companyId }),
        purchaseApi.getPendingGrns({ company_id: companyId })
      ]);
      setVendorsList(vRes.data.data || []);
      setRawMaterialsList(rmRes.data.data || rmRes.data || []);
      setPendingGrns(grnRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchMasterData();
  }, [companyId]);

  // Selected vendor details for place of supply
  const selectedVendorData = useMemo(() => {
    return vendorsList.find(v => v.vendor_id === parseInt(newInvoice.vendor_id) || v.vendor_profile_id === parseInt(newInvoice.vendor_id));
  }, [vendorsList, newInvoice.vendor_id]);

  useEffect(() => {
    if (selectedVendorData) {
      const stateCode = selectedVendorData.state || selectedVendorData.gstin?.substring(0, 2) || '27';
      setNewInvoice(prev => ({
        ...prev,
        place_of_supply_state_code: stateCode
      }));
    }
  }, [selectedVendorData]);

  // Live Invoice Totals Calculation
  const calculation = useMemo(() => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const isIntra = (selectedVendorData?.state || '27').toString().substring(0, 2) === '27';

    newInvoice.items.forEach(it => {
      const qty = parseFloat(it.quantity) || 0;
      const rate = parseFloat(it.unit_rate) || 0;
      const lineTaxable = +(qty * rate).toFixed(2);
      const taxRate = it.tax_rate === undefined || it.tax_rate === null || it.tax_rate === ''
        ? 18
        : parseFloat(it.tax_rate);

      taxable += lineTaxable;
      if (isIntra) {
        cgst += +((lineTaxable * (taxRate / 2)) / 100).toFixed(2);
        sgst += +((lineTaxable * (taxRate / 2)) / 100).toFixed(2);
      } else {
        igst += +((lineTaxable * taxRate) / 100).toFixed(2);
      }
    });

    const sub = taxable + cgst + sgst + igst + (parseFloat(newInvoice.other_charges) || 0);
    const rounded = Math.round(sub);
    const roundOff = +(rounded - sub).toFixed(2);

    return {
      taxable: taxable.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      igst: igst.toFixed(2),
      subTotal: sub.toFixed(2),
      roundOff: roundOff.toFixed(2),
      netTotal: rounded.toFixed(2),
      isIntra
    };
  }, [newInvoice.items, newInvoice.other_charges, selectedVendorData]);

  const handleGrnSelection = (grnId) => {
    const grn = pendingGrns.find(item => String(item.id) === String(grnId));
    if (!grn) {
      setNewInvoice(prev => ({ ...prev, grn_id: '' }));
      return;
    }

    setNewInvoice(prev => ({
      ...prev,
      grn_id: String(grn.id),
      vendor_id: String(grn.vendor_profile_id || grn.vendor_id),
      supplier_invoice_number: grn.invoice_number || grn.grn_number,
      supplier_invoice_date: grn.invoice_date || grn.received_date,
      due_date: grn.invoice_date || grn.received_date,
      items: (grn.items || []).map(item => ({
        raw_material_id: String(item.raw_material_id),
        quantity: parseFloat(item.received_quantity || 0) + parseFloat(item.free_quantity || 0),
        unit_rate: parseFloat(item.unit_cost || 0),
        tax_rate: 0,
        hsn_code: '8471',
        unit_of_measure: 'PCS',
        batch_number: item.batch_number || ''
      }))
    }));
  };

  const handlePayInvoice = (invoice) => {
    setPaymentForm(prev => ({
      ...prev,
      vendor_id: String(invoice.vendor_id),
      amount: String(parseFloat(invoice.outstanding_amount || 0)),
      invoices_to_settle: [{
        purchase_invoice_id: invoice.purchase_invoice_id,
        amount: parseFloat(invoice.outstanding_amount || 0)
      }],
      selected_invoice_id: String(invoice.purchase_invoice_id),
      narration: `Payment for purchase invoice ${invoice.supplier_invoice_number}`
    }));
    setUnpaidBills([invoice]);
    setActiveTab('payment-settlement');
  };

  // Handle Material Selection
  const handleMaterialChange = (idx, materialId) => {
    const mat = rawMaterialsList.find(m => m.material_id === parseInt(materialId));
    const updated = [...newInvoice.items];
    if (mat) {
      updated[idx] = {
        ...updated[idx],
        raw_material_id: materialId,
        unit_rate: parseFloat(mat.unit_price || mat.standard_cost || 0),
        tax_rate: parseFloat(mat.gst_rate || 18),
        hsn_code: mat.hsn_code || '8471',
        unit_of_measure: mat.unit_of_measure || mat.unit || 'PCS'
      };

    } else {
      updated[idx].raw_material_id = materialId;
    }
    setNewInvoice({ ...newInvoice, items: updated });
  };

  // Submit Purchase Invoice
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!newInvoice.vendor_id || !newInvoice.supplier_invoice_number) {
      toast.error('Please select Vendor and enter Supplier Invoice Number');
      return;
    }
    try {
      setLoading(true);
      await purchaseApi.createInvoice({
        ...newInvoice,
        company_id: companyId
      });
      toast.success('Purchase Invoice created & posted into Double-Entry Ledger!');
      setActiveTab('invoices');
      await Promise.all([fetchInvoices(), fetchMasterData()]);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Unpaid Bills on Vendor Selection in Payment Tab
  const handlePaymentVendorSelect = async (vId) => {
    setPaymentForm(prev => ({ ...prev, vendor_id: vId, selected_invoice_id: '', invoices_to_settle: [] }));
    if (!vId) {
      setUnpaidBills([]);
      return;
    }
    try {
      const res = await purchaseApi.getVendorBillsDue(vId, { company_id: companyId });
      setUnpaidBills(res.data.data || []);
      // Pre-fill amount with first bill's outstanding if available
      if (res.data.data?.length > 0) {
        const firstBill = res.data.data[0];
        setPaymentForm(prev => ({
          ...prev,
          amount: firstBill.outstanding_amount,
          selected_invoice_id: String(firstBill.purchase_invoice_id),
          invoices_to_settle: [{
            purchase_invoice_id: firstBill.purchase_invoice_id,
            amount: parseFloat(firstBill.outstanding_amount)
          }]
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Vendor Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.vendor_id || !parseFloat(paymentForm.amount)) {
      toast.error('Please select Vendor and valid amount');
      return;
    }
    try {
      setLoading(true);
      await purchaseApi.recordPayment({
        ...paymentForm,
        company_id: companyId
      });
      toast.success('Vendor payment recorded and allocated against bills!');
      setPaymentForm({
        vendor_id: '',
        amount: '',
        payment_mode: 'BANK',
        instrument_type: 'NEFT',
        instrument_reference_number: '',
        payment_date: new Date().toISOString().split('T')[0],
        narration: '',
        invoices_to_settle: [],
        selected_invoice_id: ''
      });
      setUnpaidBills([]);
      fetchInvoices();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (inv) => {
    try {
      const res = await purchaseApi.getInvoiceById(inv.purchase_invoice_id);
      setSelectedInvoice(res.data.data);
      setIsDetailModalOpen(true);
    } catch (err) {
      toast.error('Failed to load invoice details');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Purchase Invoices & Vendor Bills</h1>
            <p className="text-sm text-slate-500">
              Commercial Raw Material Purchases, Bill-Wise Sundry Creditor Tracking, and Double-Entry Inward Entries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === 'invoices' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            All Bills
          </button>
          <button
            onClick={() => setActiveTab('new-invoice')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === 'new-invoice' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            <Plus className="w-4 h-4" /> Record Purchase Bill
            {pendingGrns.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                {pendingGrns.length} GRN pending
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('payment-settlement')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === 'payment-settlement' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            <CreditCard className="w-4 h-4" /> Vendor Payment
          </button>
        </div>
      </div>

      {/* TAB 1: INVOICES LIST */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by vendor name or supplier bill number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Fully Paid</option>
              </select>
              <button onClick={fetchInvoices} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">Bill No</th>
                    <th className="py-3.5 px-4">Vendor</th>
                    <th className="py-3.5 px-4">Bill Date</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-right">Net Total (₹)</th>
                    <th className="py-3.5 px-4 text-right">Paid (₹)</th>
                    <th className="py-3.5 px-4 text-right">Balance Due (₹)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Loading purchase invoices...
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-400">
                        No purchase invoices recorded yet. Click "Record Purchase Bill" to add one.
                      </td>
                    </tr>
                  ) : (
                    invoices
                      .filter(inv => {
                        const matchStatus = statusFilter === 'ALL' || inv.payment_status === statusFilter;
                        const matchSearch = search ? (
                          inv.supplier_invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
                          inv.vendor_trade_name?.toLowerCase().includes(search.toLowerCase())
                        ) : true;
                        return matchStatus && matchSearch;
                      })
                      .map(inv => (
                        <tr key={inv.purchase_invoice_id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {inv.supplier_invoice_number}
                            <span className="block text-xs font-normal text-slate-400">{inv.voucher_number || inv.internal_entry_number}</span>
                            {inv.grn_number && (
                              <span className="block text-xs font-semibold text-indigo-600">GRN: {inv.grn_number}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {inv.vendor_trade_name}
                            <span className="block text-xs font-mono text-slate-400">GST: {inv.vendor_gstin || 'Unregistered'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{new Date(inv.supplier_invoice_date).toLocaleDateString()}</td>
                          <td className="py-3.5 px-4 text-slate-600">{new Date(inv.due_date).toLocaleDateString()}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{parseFloat(inv.net_total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-emerald-600">
                            ₹{parseFloat(inv.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                            ₹{parseFloat(inv.outstanding_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${inv.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : inv.payment_status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                              {inv.payment_status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleViewInvoice(inv)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="View Invoice & Items"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {parseFloat(inv.outstanding_amount || 0) > 0 && (
                              <button
                                onClick={() => handlePayInvoice(inv)}
                                className="ml-1 inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                                title="Pay pending amount"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                Pay
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECORD NEW PURCHASE BILL */}
      {activeTab === 'new-invoice' && (
        <form onSubmit={handleCreateInvoice} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  Create Bill From GRN
                </label>
                <select
                  value={newInvoice.grn_id}
                  onChange={(e) => handleGrnSelection(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-200 rounded-xl text-sm bg-white"
                >
                  <option value="">Select a pending GRN...</option>
                  {pendingGrns.map(grn => (
                    <option key={grn.id} value={grn.id}>
                      {grn.grn_number} - {grn.vendor_name || 'Supplier'} - ₹{parseFloat(grn.total_value || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-amber-900">
                <span className="font-semibold">Pending GRNs:</span> {pendingGrns.length}
              </div>
            </div>
            {newInvoice.grn_id && (
              <p className="mt-2 text-xs text-amber-800">
                GRN materials, quantities, unit costs, supplier, and amount are loaded automatically.
              </p>
            )}
          </div>

          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Purchase Invoice Builder</h2>
              <p className="text-xs text-slate-500">Record inward goods, vendor bill liability, and input GST tax credit</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Cancel & Return
            </button>
          </div>

          {/* Header Details */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Vendor (Sundry Creditor) *</label>
              <select
                value={newInvoice.vendor_id}
                onChange={(e) => setNewInvoice({ ...newInvoice, vendor_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none"
                required
              >
                <option value="">Select Vendor...</option>
                {vendorsList.map(v => (
                  <option key={v.vendor_profile_id || v.vendor_id} value={v.vendor_profile_id || v.vendor_id}>
                    {v.vendor_name || v.vendor_trade_name} ({v.vendor_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier Bill Number *</label>
              <input
                type="text"
                placeholder="e.g. INV-9982"
                value={newInvoice.supplier_invoice_number}
                onChange={(e) => setNewInvoice({ ...newInvoice, supplier_invoice_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier Bill Date *</label>
              <input
                type="date"
                value={newInvoice.supplier_invoice_date}
                onChange={(e) => setNewInvoice({ ...newInvoice, supplier_invoice_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Due Date *</label>
              <input
                type="date"
                value={newInvoice.due_date}
                onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raw Material Items</h3>
              <button
                type="button"
                onClick={() => setNewInvoice({
                  ...newInvoice,
                  items: [...newInvoice.items, { raw_material_id: '', quantity: 1, unit_rate: 0, tax_rate: 18, hsn_code: '', unit_of_measure: 'PCS', batch_number: '' }]
                })}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Material Line
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Raw Material</th>
                    <th className="py-2.5 px-3 w-28">Qty</th>
                    <th className="py-2.5 px-3 w-32">Unit Rate (₹)</th>
                    <th className="py-2.5 px-3 w-28">GST %</th>
                    <th className="py-2.5 px-3 w-36">Batch No</th>
                    <th className="py-2.5 px-3 text-right w-32">Line Total</th>
                    <th className="py-2.5 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {newInvoice.items.map((item, idx) => {
                    const lineAmt = ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_rate) || 0));
                    const taxAmt = lineAmt * ((parseFloat(item.tax_rate) || 0) / 100);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2">
                          <select
                            value={item.raw_material_id}
                            onChange={(e) => handleMaterialChange(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                            required
                          >
                            <option value="">Select Raw Material...</option>
                            {rawMaterialsList.map(rm => (
                              <option key={rm.material_id} value={rm.material_id}>
                                {rm.material_name} ({rm.material_code})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...newInvoice.items];
                              updated[idx].quantity = e.target.value;
                              setNewInvoice({ ...newInvoice, items: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                            required
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_rate}
                            onChange={(e) => {
                              const updated = [...newInvoice.items];
                              updated[idx].unit_rate = e.target.value;
                              setNewInvoice({ ...newInvoice, items: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                            required
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={item.tax_rate}
                            onChange={(e) => {
                              const updated = [...newInvoice.items];
                              updated[idx].tax_rate = e.target.value;
                              setNewInvoice({ ...newInvoice, items: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Optional Batch"
                            value={item.batch_number}
                            onChange={(e) => {
                              const updated = [...newInvoice.items];
                              updated[idx].batch_number = e.target.value;
                              setNewInvoice({ ...newInvoice, items: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-semibold text-slate-800">
                          ₹{(lineAmt + taxAmt).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          {newInvoice.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = newInvoice.items.filter((_, i) => i !== idx);
                                setNewInvoice({ ...newInvoice, items: updated });
                              }}
                              className="text-rose-500 hover:text-rose-700"
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

          {/* Live Double-Entry Voucher Preview & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            {/* Left: Double-Entry Posting Preview */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">Real-time Double-Entry Voucher Preview</span>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-700">
                  <span>Dr. Purchase Account (Taxable)</span>
                  <span className="font-bold">₹{calculation.taxable}</span>
                </div>
                {calculation.isIntra ? (
                  <>
                    <div className="flex justify-between text-slate-700">
                      <span>Dr. Input CGST Account</span>
                      <span className="font-bold">₹{calculation.cgst}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Dr. Input SGST Account</span>
                      <span className="font-bold">₹{calculation.sgst}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-700">
                    <span>Dr. Input IGST Account</span>
                    <span className="font-bold">₹{calculation.igst}</span>
                  </div>
                )}
                {parseFloat(calculation.roundOff) !== 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Dr/Cr. Round Off Adjustment</span>
                    <span className="font-bold">₹{calculation.roundOff}</span>
                  </div>
                )}
                <div className="flex justify-between text-indigo-950 font-bold border-t border-slate-300 pt-1.5">
                  <span>Cr. {selectedVendorData?.vendor_name || 'Vendor Ledger'} (Creditor)</span>
                  <span>₹{calculation.netTotal}</span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 block pt-1">
                ✓ Bill Allocation: NEW_REF for {newInvoice.supplier_invoice_number || 'bill'}
              </span>
            </div>

            {/* Right: Calculations Summary */}
            <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Value:</span>
                <span className="font-mono font-medium">₹{calculation.taxable}</span>
              </div>
              {calculation.isIntra ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST:</span>
                    <span className="font-mono">₹{calculation.cgst}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST:</span>
                    <span className="font-mono">₹{calculation.sgst}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>IGST:</span>
                  <span className="font-mono">₹{calculation.igst}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Round Off:</span>
                <span className="font-mono">₹{calculation.roundOff}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-300 pt-2">
                <span>Total Invoice Amount:</span>
                <span className="font-mono text-indigo-600">₹{calculation.netTotal}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
            >
              {loading ? 'Posting...' : 'Save & Post Purchase Bill'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: VENDOR PAYMENT & BILL SETTLEMENT */}
      {activeTab === 'payment-settlement' && (
        <form onSubmit={handleRecordPayment} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Vendor Payment Settlement (VCH-PAYMENT)</h2>
            <p className="text-xs text-slate-500">Record cash/bank disbursement against outstanding purchase bills (AGST_REF)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Select Vendor *</label>
              <select
                value={paymentForm.vendor_id}
                onChange={(e) => handlePaymentVendorSelect(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none"
                required
              >
                <option value="">Select Vendor...</option>
                {vendorsList.map(v => (
                  <option key={v.vendor_profile_id || v.vendor_id} value={v.vendor_profile_id || v.vendor_id}>
                    {v.vendor_name || v.vendor_trade_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Select Pending Invoice *</label>
              <select
                value={paymentForm.selected_invoice_id}
                onChange={(e) => {
                  const bill = unpaidBills.find(item => String(item.purchase_invoice_id) === e.target.value);
                  setPaymentForm(prev => ({
                    ...prev,
                    selected_invoice_id: e.target.value,
                    amount: bill ? String(parseFloat(bill.outstanding_amount || 0)) : '',
                    invoices_to_settle: bill ? [{
                      purchase_invoice_id: bill.purchase_invoice_id,
                      amount: parseFloat(bill.outstanding_amount || 0)
                    }] : []
                  }));
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none"
                required
              >
                <option value="">Select invoice...</option>
                {unpaidBills.map(bill => (
                  <option key={bill.purchase_invoice_id} value={bill.purchase_invoice_id}>
                    {bill.supplier_invoice_number} - Pending ₹{parseFloat(bill.outstanding_amount || 0).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="Enter Amount"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono bg-slate-50 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Mode</label>
              <select
                value={paymentForm.payment_mode}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none"
              >
                <option value="BANK">Bank Account (NEFT / RTGS / IMPS / UPI)</option>
                <option value="CASH">Cash in Hand</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Instrument Ref / UTR No</label>
              <input
                type="text"
                placeholder="Cheque No / UTR / Reference"
                value={paymentForm.instrument_reference_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, instrument_reference_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Narration</label>
              <input
                type="text"
                placeholder="Payment remarks..."
                value={paymentForm.narration}
                onChange={(e) => setPaymentForm({ ...paymentForm, narration: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Pending Bills List */}
          {unpaidBills.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unpaid Bills to be Settled (FIFO Priority)</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Bill Number</th>
                      <th className="py-2.5 px-3">Bill Date</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">Net Amount (₹)</th>
                      <th className="py-2.5 px-3 text-right">Outstanding (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unpaidBills.map(b => (
                      <tr key={b.purchase_invoice_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{b.supplier_invoice_number}</td>
                        <td className="py-2.5 px-3 text-slate-600">{new Date(b.supplier_invoice_date).toLocaleDateString()}</td>
                        <td className="py-2.5 px-3 text-slate-600">{new Date(b.due_date).toLocaleDateString()}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900">₹{parseFloat(b.net_total_amount).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">₹{parseFloat(b.outstanding_amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
            >
              {loading ? 'Processing...' : 'Disburse & Settle Bills'}
            </button>
          </div>
        </form>
      )}

      {/* Invoice Detail Modal */}
      {isDetailModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Purchase Bill Details</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">{selectedInvoice.supplier_invoice_number}</h2>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400">Vendor:</span>
                  <p className="font-semibold text-slate-800">{selectedInvoice.vendor_trade_name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Bill Date:</span>
                  <p className="font-semibold text-slate-800">{new Date(selectedInvoice.supplier_invoice_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-slate-400">Due Date:</span>
                  <p className="font-semibold text-slate-800">{new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-slate-400">Voucher No:</span>
                  <p className="font-semibold text-slate-800">{selectedInvoice.voucher_number || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400">GRN Reference:</span>
                  <p className="font-semibold text-indigo-700">{selectedInvoice.grn_number || 'Manual Bill'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed Items</h3>
                <table className="w-full text-left text-sm border-collapse border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items?.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {it.material_name || it.product_name}
                          <span className="block text-xs font-mono text-slate-400">{it.material_code || it.product_code}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{it.billed_quantity} {it.unit_of_measure}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{parseFloat(it.unit_rate).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-500">
                          ₹{(parseFloat(it.cgst_amount || 0) + parseFloat(it.sgst_amount || 0) + parseFloat(it.igst_amount || 0)).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹{parseFloat(it.total_amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition"
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

export default PurchaseInvoiceManagement;
