import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  sales as salesApi,
  customers as customersApi,
  products as productsApi
} from '../../services/api';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  FileSpreadsheet,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  Eye,
  FileText
} from 'lucide-react';

const SalesOrderManagement = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [activeTab, setActiveTab] = useState('ORDERS'); // 'ORDERS' or 'QUOTATIONS'
  const [orders, setOrders] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_id: '',
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference: '',
    items: [{ product_id: '', quantity: 1, unit_rate: 0, tax_rate: 18 }]
  });

  const fetchData = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const [ordRes, qtnRes, custRes, prodRes] = await Promise.all([
        salesApi.getOrders({ company_id: companyId }),
        salesApi.getQuotations({ company_id: companyId }),
        customersApi.getAll({ company_id: companyId }),
        productsApi.getAll({ company_id: companyId })
      ]);
      setOrders(ordRes.data.data || []);
      setQuotations(qtnRes.data.data || []);
      setCustomersList(custRes.data.data || []);
      setProductsList(prodRes.data.data || prodRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load commercial orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const updateItemRow = (index, field, value) => {
    const updated = [...form.items];
    updated[index][field] = value;
    if (field === 'product_id') {
      const prod = productsList.find(p => String(p.product_id) === String(value));
      if (prod) {
        updated[index].unit_rate = parseFloat(prod.price) || 0;
        updated[index].tax_rate = parseFloat(prod.gst_rate) || 18;
      }
    }
    setForm({ ...form, items: updated });
  };

  const addItemRow = () => {
    setForm({
      ...form,
      items: [...form.items, { product_id: '', quantity: 1, unit_rate: 0, tax_rate: 18 }]
    });
  };

  const removeItemRow = (index) => {
    if (form.items.length === 1) return;
    setForm({ ...form, items: form.items.filter((_, idx) => idx !== index) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) {
      toast.error('Please select a Customer');
      return;
    }
    if (form.items.some(it => !it.product_id || parseFloat(it.quantity) <= 0)) {
      toast.error('Please fill product and quantities for all lines');
      return;
    }

    try {
      setSubmitting(true);
      if (activeTab === 'ORDERS') {
        await salesApi.createOrder({
          company_id: companyId,
          customer_id: form.customer_id,
          order_date: form.date,
          delivery_due_date: form.due_date,
          customer_po_reference: form.reference,
          items: form.items
        });
        toast.success('Sales Order created successfully!');
      } else {
        await salesApi.createQuotation({
          company_id: companyId,
          customer_id: form.customer_id,
          quotation_date: form.date,
          valid_until: form.due_date,
          items: form.items.map(it => ({ ...it, quoted_rate: it.unit_rate }))
        });
        toast.success('Quotation created successfully!');
      }

      setIsModalOpen(false);
      setForm({
        customer_id: '',
        date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reference: '',
        items: [{ product_id: '', quantity: 1, unit_rate: 0, tax_rate: 18 }]
      });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error creating document');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShoppingCart className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Quotations & Sales Orders</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Commercial pipeline management from initial Price Estimates to confirmed Sales Orders.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'ORDERS' ? 'New Sales Order' : 'New Quotation'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'ORDERS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Sales Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('QUOTATIONS')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'QUOTATIONS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Quotations / Estimates ({quotations.length})
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">Doc Number</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Taxable Value</th>
                <th className="px-6 py-4">Total Net Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">Loading...</td>
                </tr>
              ) : (activeTab === 'ORDERS' ? orders : quotations).length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No {activeTab === 'ORDERS' ? 'sales orders' : 'quotations'} found. Click button above to create one.
                  </td>
                </tr>
              ) : (
                (activeTab === 'ORDERS' ? orders : quotations).map((item) => (
                  <tr key={item.sales_order_id || item.quotation_id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                      {item.order_number || item.quotation_number}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(item.order_date || item.quotation_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {item.customer_name}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      ₹{parseFloat(item.total_taxable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{parseFloat(item.net_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order / Quotation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">
                Create New {activeTab === 'ORDERS' ? 'Sales Order' : 'Quotation'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer *</label>
                  <select
                    required
                    value={form.customer_id}
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">Select Customer...</option>
                    {customersList.map(c => (
                      <option key={c.customer_id} value={c.customer_id}>{c.trade_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {activeTab === 'ORDERS' ? 'Delivery Due Date' : 'Valid Until Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">Items</h4>
                  <button type="button" onClick={addItemRow} className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5 w-20">Qty</th>
                        <th className="p-2.5 w-28">Rate (₹)</th>
                        <th className="p-2.5 w-24">Tax Rate</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.items.map((row, idx) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <select
                              required
                              value={row.product_id}
                              onChange={(e) => updateItemRow(idx, 'product_id', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                            >
                              <option value="">Select Finished Good...</option>
                              {productsList.map(p => (
                                <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-right text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.unit_rate}
                              onChange={(e) => updateItemRow(idx, 'unit_rate', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-right text-xs font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={row.tax_rate}
                              onChange={(e) => updateItemRow(idx, 'tax_rate', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="p-2 text-right font-semibold text-slate-800">
                            ₹{((parseFloat(row.quantity) || 0) * (parseFloat(row.unit_rate) || 0) * (1 + (parseFloat(row.tax_rate) || 18) / 100)).toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            {form.items.length > 1 && (
                              <button type="button" onClick={() => removeItemRow(idx)} className="text-rose-500 hover:text-rose-700">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : `Create ${activeTab === 'ORDERS' ? 'Sales Order' : 'Quotation'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOrderManagement;
