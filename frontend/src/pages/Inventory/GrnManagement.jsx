import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { grn as grnApi, vendors as vendorsApi, rawMaterials as rawMaterialsApi, branches as branchesApi, companies as companiesApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  FileText,
  Plus,
  Search,
  Eye,
  X,
  Check,
  Calendar,
  Layers,
  DollarSign,
  Boxes,
  Truck,
  Download,
  AlertCircle,
  FileCheck2,
  Trash2,
  Building,
  Building2,
  Clock,
  ChevronRight
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

const GrnManagement = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();

  // Scope filters
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  // Lists
  const [grnList, setGrnList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate unique batch code helper
  const generateBatchCode = () => `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const createEmptyItem = () => ({
    raw_material_id: '',
    batch_number: generateBatchCode(),
    received_quantity: '',
    free_quantity: 0,
    unit_cost: '',
    expiry_date: '',
    manufacturing_date: '',
    remarks: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    vendor_id: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    received_date: new Date().toISOString().split('T')[0],
    remarks: '',
    invoice_file: null,
    items: [createEmptyItem()]
  });

  // Load initial dropdowns
  useEffect(() => {
    fetchVendors();
    fetchMaterials();
    if (isSuperAdmin) fetchCompanies();
    if (isSuperAdmin || isCompanyAdmin) fetchBranches();
  }, [selectedCompanyId, selectedBranchId]);

  // Load GRNs
  useEffect(() => {
    fetchGrns();
  }, [selectedCompanyId, selectedBranchId, vendorFilter]);

  const fetchCompanies = async () => {
    try {
      const res = await companiesApi.getAll();
      setCompaniesList(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await branchesApi.getAll({ company_id: selectedCompanyId || undefined });
      setBranchesList(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await vendorsApi.getAll({ company_id: selectedCompanyId || undefined });
      setVendorsList(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await rawMaterialsApi.getAll({ company_id: selectedCompanyId || undefined });
      setMaterialsList(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGrns = async () => {
    setLoading(true);
    try {
      const params = {
        company_id: selectedCompanyId || undefined,
        branch_id: selectedBranchId !== 'all' ? selectedBranchId : undefined,
        vendor_id: vendorFilter !== 'all' ? vendorFilter : undefined
      };
      const res = await grnApi.getAll(params);
      setGrnList(res.data?.data || []);
    } catch (e) {
      toast.error('Failed to load GRN records');
    } finally {
      setLoading(false);
    }
  };

  // Add Item Line
  const handleAddItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        createEmptyItem()
      ]
    }));
  };

  // Remove Item Line
  const handleRemoveItemRow = (index) => {
    if (formData.items.length <= 1) {
      toast.error('At least one item is required in GRN');
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Update Item Line
  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      // Auto-fill price & batch if material is selected
      if (field === 'raw_material_id') {
        const selectedMat = materialsList.find(m => String(m.material_id) === String(value));
        if (selectedMat && (!newItems[index].unit_cost || newItems[index].unit_cost === '0')) {
          newItems[index].unit_cost = selectedMat.unit_price || 0;
        }
        if (!newItems[index].batch_number) {
          newItems[index].batch_number = generateBatchCode();
        }
      }
      return { ...prev, items: newItems };
    });
  };

  // Auto-generate batch number
  const handleGenerateBatch = (index) => {
    handleItemChange(index, 'batch_number', generateBatchCode());
  };

  // Calculate totals
  const formGrandTotal = useMemo(() => {
    return formData.items.reduce((sum, item) => {
      const qty = parseFloat(item.received_quantity) || 0;
      const cost = parseFloat(item.unit_cost) || 0;
      return sum + (qty * cost);
    }, 0);
  }, [formData.items]);

  const formTotalQuantity = useMemo(() => {
    return formData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.received_quantity) || 0);
    }, 0);
  }, [formData.items]);

  // Selected Vendor object
  const selectedVendorObj = useMemo(() => {
    return vendorsList.find(v => String(v.vendor_id) === String(formData.vendor_id));
  }, [vendorsList, formData.vendor_id]);

  // Submit GRN
  const handleCreateGrn = async (e) => {
    e.preventDefault();
    if (!formData.vendor_id) {
      toast.error('Please select a Vendor / Supplier');
      return;
    }

    if (!formData.items || formData.items.length === 0) {
      toast.error('Please add at least one Raw Material');
      return;
    }

    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.raw_material_id) {
        toast.error(`Please select Raw Material for item #${i + 1}`);
        return;
      }
      if (!item.received_quantity || parseFloat(item.received_quantity) <= 0) {
        toast.error(`Please enter valid received quantity for item #${i + 1}`);
        return;
      }
    }

    // Auto-fill batch number if empty so user is never blocked
    const finalizedItems = formData.items.map((item, idx) => ({
      ...item,
      batch_number: item.batch_number?.trim() || `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-${idx + 1}`
    }));

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('company_id', selectedCompanyId || user?.company_id || '');
      payload.append('branch_id', selectedBranchId || user?.branch_id || '');
      payload.append('vendor_id', formData.vendor_id);
      payload.append('invoice_number', formData.invoice_number);
      payload.append('invoice_date', formData.invoice_date);
      payload.append('received_date', formData.received_date);
      payload.append('remarks', formData.remarks);
      payload.append('items', JSON.stringify(finalizedItems));

      if (formData.invoice_file) {
        payload.append('invoice_file', formData.invoice_file);
      }

      const res = await grnApi.create(payload);
      if (res.data?.success) {
        toast.success('GRN recorded and Raw Material Inventory Batches updated successfully!');
        setShowCreateModal(false);
        // Reset form
        setFormData({
          vendor_id: '',
          invoice_number: '',
          invoice_date: new Date().toISOString().split('T')[0],
          received_date: new Date().toISOString().split('T')[0],
          remarks: '',
          invoice_file: null,
          items: [createEmptyItem()]
        });
        fetchGrns();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create GRN');
    } finally {
      setSubmitting(false);
    }
  };

  // View Details
  const handleViewGrn = async (grnItem) => {
    try {
      const res = await grnApi.getById(grnItem.id);
      setSelectedGrn(res.data?.data);
      setShowDetailModal(true);
    } catch (err) {
      toast.error('Failed to load GRN details');
    }
  };

  // Filtered List
  const filteredGrns = useMemo(() => {
    return grnList.filter(item => {
      const matchSearch =
        item.grn_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [grnList, searchTerm]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Goods Receipt Note (GRN)</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Vendor Inward → Raw Material Batch Ingress → Live Inventory Traceability
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Create New GRN
        </button>
      </div>

      {/* Scope and Search Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search GRN, invoice, vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Vendor Filter */}
        <div>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Vendors / Suppliers</option>
            {vendorsList.map(v => (
              <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
            ))}
          </select>
        </div>

        {/* Company Filter (Super Admin) */}
        {isSuperAdmin && (
          <div>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">All Companies</option>
              {companiesList.map(c => (
                <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Branch Filter */}
        {(isSuperAdmin || isCompanyAdmin) && (
          <div>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Branches</option>
              {branchesList.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* GRN Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">GRN Number</th>
                <th className="py-3 px-4">Vendor / Supplier</th>
                <th className="py-3 px-4">Supplier Invoice</th>
                <th className="py-3 px-4">Received Date</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Total Value</th>
                <th className="py-3 px-4">Received By</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-gray-400">Loading GRN records...</td>
                </tr>
              ) : filteredGrns.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-gray-400">
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No Goods Receipt Notes found. Click "Create New GRN" to receive raw materials.
                  </td>
                </tr>
              ) : (
                filteredGrns.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-semibold text-blue-600">{row.grn_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{row.vendor_name || '—'}</div>
                      <div className="text-[11px] text-gray-400">{row.vendor_code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-900 font-medium">{row.invoice_number || 'N/A'}</div>
                      {row.invoice_date && (
                        <div className="text-[11px] text-gray-400">{new Date(row.invoice_date).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">{new Date(row.received_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-medium text-[11px]">
                        {row.total_items} items
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      ₹{parseFloat(row.total_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{row.received_by_name || 'System Admin'}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleViewGrn(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md font-medium transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE GRN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-gray-900">Receive Goods / Create GRN</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateGrn} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* STEP 1: SELECT VENDOR / SUPPLIER */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>1. Select Vendor / Supplier <span className="text-red-500">*</span></span>
                  </label>
                  <span className="text-[11px] text-slate-500">One vendor can supply multiple raw materials below</span>
                </div>

                <select
                  required
                  value={formData.vendor_id}
                  onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                >
                  <option value="">-- Choose Vendor / Supplier --</option>
                  {vendorsList.map(v => (
                    <option key={v.vendor_id} value={v.vendor_id}>
                      {v.vendor_name} ({v.vendor_code || `VND-${v.vendor_id}`}) {v.city ? `— ${v.city}` : ''}
                    </option>
                  ))}
                </select>

                {selectedVendorObj && (
                  <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200/80 rounded-lg text-xs">
                    <div className="flex items-center gap-2 text-blue-900">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="font-semibold">{selectedVendorObj.vendor_name}</span>
                      <span className="text-blue-600 font-mono text-[11px]">({selectedVendorObj.vendor_code || `VND-${selectedVendorObj.vendor_id}`})</span>
                      {selectedVendorObj.city && <span className="text-slate-500 text-[11px]">· {selectedVendorObj.city}</span>}
                      {selectedVendorObj.phone && <span className="text-slate-500 text-[11px]">· 📞 {selectedVendorObj.phone}</span>}
                    </div>
                    <span className="text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-xs">
                      Active Supplier
                    </span>
                  </div>
                )}
              </div>

              {/* STEP 2: RAW MATERIALS RECEIVED FROM VENDOR */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-blue-500" />
                      <span>2. Raw Materials Received</span>
                    </h3>
                    <span className="text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                      {formData.items.length} {formData.items.length === 1 ? 'Material' : 'Materials'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Another Material</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 min-w-[200px]">Raw Material *</th>
                        <th className="py-2.5 px-3 w-32">Received Qty *</th>
                        <th className="py-2.5 px-3 w-32">Unit Price (₹)</th>
                        <th className="py-2.5 px-3 min-w-[150px]">Batch Number</th>
                        <th className="py-2.5 px-3 w-32">Expiry Date</th>
                        <th className="py-2.5 px-3 text-right w-28">Subtotal</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((item, index) => {
                        const selectedMat = materialsList.find(m => String(m.material_id) === String(item.raw_material_id));
                        const lineSubtotal = (parseFloat(item.received_quantity) || 0) * (parseFloat(item.unit_cost) || 0);
                        return (
                          <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                            {/* Raw Material Select */}
                            <td className="p-2.5">
                              <select
                                required
                                value={item.raw_material_id}
                                onChange={(e) => handleItemChange(index, 'raw_material_id', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800 outline-none"
                              >
                                <option value="">-- Select Material from Catalog --</option>
                                {materialsList.map(m => (
                                  <option key={m.material_id} value={m.material_id}>
                                    {m.material_name} ({m.material_code}) [{m.unit_of_measure}]
                                  </option>
                                ))}
                              </select>
                              {selectedMat && (
                                <div className="mt-1 flex items-center gap-2 text-[10.5px] text-slate-500">
                                  <span>UOM: <strong className="text-slate-700">{selectedMat.unit_of_measure}</strong></span>
                                  {selectedMat.hsn_code && <span>· HSN: {selectedMat.hsn_code}</span>}
                                  {selectedMat.gst_rate > 0 && <span>· GST: {selectedMat.gst_rate}%</span>}
                                </div>
                              )}
                            </td>

                            {/* Received Qty */}
                            <td className="p-2.5">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0.0001"
                                  step="any"
                                  required
                                  placeholder="0.00"
                                  value={item.received_quantity}
                                  onChange={(e) => handleItemChange(index, 'received_quantity', e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 outline-none pr-8"
                                />
                                {selectedMat && (
                                  <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-medium pointer-events-none">
                                    {selectedMat.unit_of_measure?.split(' ')[0] || ''}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Unit Cost */}
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0.00"
                                value={item.unit_cost}
                                onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 outline-none"
                              />
                            </td>

                            {/* Batch Number */}
                            <td className="p-2.5">
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  placeholder="Auto Batch"
                                  value={item.batch_number}
                                  onChange={(e) => handleItemChange(index, 'batch_number', e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-slate-700 outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleGenerateBatch(index)}
                                  title="Regenerate Batch Code"
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-md transition"
                                >
                                  Auto
                                </button>
                              </div>
                            </td>

                            {/* Expiry Date */}
                            <td className="p-2.5">
                              <input
                                type="date"
                                value={item.expiry_date}
                                onChange={(e) => handleItemChange(index, 'expiry_date', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-700 outline-none"
                              />
                            </td>

                            {/* Subtotal */}
                            <td className="p-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                              ₹{lineSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Delete line */}
                            <td className="p-2.5 text-center">
                              {formData.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemRow(index)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                                  title="Remove line item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary Row */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span>Total Materials: <strong className="text-slate-900 font-bold">{formData.items.length}</strong></span>
                    <span>Total Quantity: <strong className="text-slate-900 font-bold">{formTotalQuantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Grand GRN Valuation:</span>
                    <span className="text-base font-extrabold text-blue-700 font-mono">
                      ₹{formGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* STEP 3: DATE & INWARD DETAILS */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>3. Date & Inward Documentation Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Received Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.received_date}
                      onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Invoice / DC No.</label>
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-987"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Attach Invoice (PDF / Photo)</label>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => setFormData({ ...formData, invoice_file: e.target.files[0] })}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Note</label>
                    <input
                      type="text"
                      placeholder="Delivery or inspection remarks"
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <span className="text-xs text-slate-500">
                  Ready to ingest <strong className="text-slate-800">{formData.items.length} materials</strong> into inventory batches
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {submitting ? 'Recording GRN...' : 'Confirm & Ingest to Inventory'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW GRN DETAIL MODAL */}
      {showDetailModal && selectedGrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div>
                <span className="text-xs font-bold text-blue-600">{selectedGrn.grn_number}</span>
                <h2 className="text-sm font-bold text-gray-900">GRN Details & Inventory Batches</h2>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Header Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-blue-50/40 rounded-xl border border-blue-100/60 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Vendor / Supplier</span>
                  <span className="font-semibold text-gray-800">{selectedGrn.vendor_name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Invoice Reference</span>
                  <span className="font-semibold text-gray-800">{selectedGrn.invoice_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Received Date</span>
                  <span className="font-semibold text-gray-800">
                    {new Date(selectedGrn.received_date).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Invoice Document</span>
                  {selectedGrn.invoice_file ? (
                    <a
                      href={`${API_BASE_URL}${selectedGrn.invoice_file}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      View Invoice
                    </a>
                  ) : (
                    <span className="text-gray-400">None attached</span>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                  Ingested Material Batches
                </h3>
                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="py-2.5 px-3">Material</th>
                        <th className="py-2.5 px-3">Batch Number</th>
                        <th className="py-2.5 px-3 text-right">Received Qty</th>
                        <th className="py-2.5 px-3 text-right">Current Available</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                        <th className="py-2.5 px-3">Expiry Date</th>
                        <th className="py-2.5 px-3 text-center">Batch Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {selectedGrn.items?.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-3 font-medium text-gray-900">
                            {item.material_name}
                            <span className="text-gray-400 block text-[10px]">{item.material_code}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                            {item.batch_number}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {parseFloat(item.received_quantity)} {item.unit_of_measure}
                            {parseFloat(item.free_quantity) > 0 && (
                              <span className="text-[10px] text-green-600 block">+{item.free_quantity} Free</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-gray-900">
                            {parseFloat(item.current_available_qty || item.received_quantity)} {item.unit_of_measure}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            ₹{parseFloat(item.unit_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500">
                            {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              item.inventory_status === 'EXHAUSTED'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {item.inventory_status || 'AVAILABLE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg transition"
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

export default GrnManagement;
