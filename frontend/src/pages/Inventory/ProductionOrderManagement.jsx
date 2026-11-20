import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { productionOrders as orderApi, productionMasters as bomApi, products as productsApi, branches as branchesApi, companies as companiesApi } from '../../services/api';
import { formatProductionTime, formatDuration } from '../../utils/productionTime';
import toast from 'react-hot-toast';
import {
  Factory,
  Plus,
  Search,
  Eye,
  X,
  Play,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Clock,
  Users,
  DollarSign,
  Package,
  Layers,
  Check,
  ChevronRight,
  TrendingUp,
  FileCheck
} from 'lucide-react';

const ProductionOrderManagement = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();

  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  const [ordersList, setOrdersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedBatchForCompletion, setSelectedBatchForCompletion] = useState(null);
  const [producedQuantityInput, setProducedQuantityInput] = useState('');
  const [physicalQuantityInput, setPhysicalQuantityInput] = useState('');
  const [workforceExpenseInput, setWorkforceExpenseInput] = useState('');
  const [wastageReasonInput, setWastageReasonInput] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Form & Live Calculation State
  const [createForm, setCreateForm] = useState({
    product_id: '',
    production_master_id: '',
    planned_quantity: 100,
    planned_start_date: new Date().toISOString().split('T')[0],
    planned_end_date: ''
  });

  const [calcPreview, setCalcPreview] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    if (isSuperAdmin) fetchCompanies();
    if (isSuperAdmin || isCompanyAdmin) fetchBranches();
  }, [selectedCompanyId, selectedBranchId]);

  useEffect(() => {
    fetchOrders();
  }, [selectedCompanyId, selectedBranchId, statusFilter]);

  // Live trigger calculate requirements whenever product or planned_quantity changes
  useEffect(() => {
    if (createForm.product_id && createForm.planned_quantity > 0) {
      handleCalculateRequirements();
    } else {
      setCalcPreview(null);
    }
  }, [createForm.product_id, createForm.planned_quantity, createForm.production_master_id]);

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

  const fetchProducts = async () => {
    try {
      const res = await productsApi.getAll({ company_id: selectedCompanyId || undefined });
      setProductsList(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {
        company_id: selectedCompanyId || undefined,
        branch_id: selectedBranchId !== 'all' ? selectedBranchId : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      };
      const res = await orderApi.getAll(params);
      setOrdersList(res.data?.data || []);
    } catch (e) {
      toast.error('Failed to load Production Orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRequirements = async () => {
    setCalcLoading(true);
    try {
      const res = await orderApi.calculateRequirements({
        product_id: createForm.product_id,
        production_master_id: createForm.production_master_id || undefined,
        planned_quantity: createForm.planned_quantity,
        branch_id: selectedBranchId !== 'all' ? selectedBranchId : undefined
      });
      setCalcPreview(res.data);
    } catch (e) {
      setCalcPreview(null);
    } finally {
      setCalcLoading(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!createForm.product_id) {
      toast.error('Please select a product');
      return;
    }
    if (!calcPreview?.has_bom) {
      toast.error('Selected product has no BOM / Production Master configured. Please create BOM first.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        company_id: selectedCompanyId || user?.company_id || '',
        branch_id: selectedBranchId || user?.branch_id || '',
        product_id: createForm.product_id,
        production_master_id: calcPreview.production_master?.id,
        planned_quantity: createForm.planned_quantity,
        planned_start_date: createForm.planned_start_date,
        planned_end_date: createForm.planned_end_date || null,
        workforce_count: calcPreview.planned_workforce_count,
        planned_time_minutes: calcPreview.planned_time_minutes,
        planned_expense: calcPreview.planned_expense
      };

      const res = await orderApi.create(payload);
      if (res.data?.success) {
        toast.success('Production Order created successfully!');
        setShowCreateModal(false);
        fetchOrders();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create Production Order');
    } finally {
      setSubmitting(false);
    }
  };

  // Start Production Order (Executes FIFO/FEFO raw material consumption)
  const handleStartProduction = async (order) => {
    if (!window.confirm(`Start Production for ${order.production_number}? This will automatically deduct required raw materials from inventory batches via FIFO/FEFO.`)) {
      return;
    }

    try {
      const res = await orderApi.start(order.id);
      if (res.data?.success) {
        toast.success(`Production started! Finished Goods batch ${res.data.data.batch?.batch_number} created.`);
        fetchOrders();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start production');
    }
  };

  // Complete Production Batch
  const handleCompleteBatchSubmit = async (e) => {
    e.preventDefault();
    const producedQty = parseFloat(producedQuantityInput);
    if (isNaN(producedQty) || producedQty < 0) {
      toast.error('Please enter valid produced / generated quantity');
      return;
    }

    const physQty = physicalQuantityInput !== '' ? parseFloat(physicalQuantityInput) : producedQty;
    if (isNaN(physQty) || physQty < 0) {
      toast.error('Please enter valid physical quantity');
      return;
    }

    if (physQty < producedQty && (!wastageReasonInput || !wastageReasonInput.trim())) {
      toast.error('Please enter a reason for the shortfall / wasted goods (e.g. "good wasted")');
      return;
    }

    try {
      const res = await orderApi.completeBatch(selectedBatchForCompletion.id, {
        produced_quantity: producedQty,
        physical_quantity: physQty,
        workforce_cost: parseFloat(workforceExpenseInput) || 0,
        wastage_reason: wastageReasonInput ? wastageReasonInput.trim() : null
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Production batch completed! Sent to Quality Check inspection.');
        setShowCompleteModal(false);
        fetchOrders();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete production batch');
    }
  };

  const handleViewOrder = async (order) => {
    try {
      const res = await orderApi.getById(order.id);
      setSelectedOrder(res.data?.data);
      setShowDetailModal(true);
    } catch (err) {
      toast.error('Failed to load order details');
    }
  };

  const filteredOrders = useMemo(() => {
    return ordersList.filter(o => {
      return (
        o.production_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [ordersList, searchTerm]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Factory className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Production Execution & Orders</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              BOM Auto-Calculation • FEFO/FIFO Material Consumption • Batch Tracking • Quality Assurance Gateway
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          New Production Order
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search order number or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
          >
            <option value="all">All Order Statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {(isSuperAdmin || isCompanyAdmin) && (
          <div>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            >
              <option value="all">All Branches</option>
              {branchesList.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">Order Number</th>
                <th className="py-3 px-4">Finished Product</th>
                <th className="py-3 px-4 text-right">Planned Qty</th>
                <th className="py-3 px-4 text-right">Produced Qty</th>
                <th className="py-3 px-4 text-right">Physical Verified</th>
                <th className="py-3 px-4 text-right">Wastage / Loss</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Batches</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-gray-400">Loading production orders...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-gray-400">
                    <Factory className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No Production Orders found. Click "New Production Order" to plan and execute manufacturing.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-semibold text-amber-600 font-mono">
                      <div>{order.production_number}</div>
                      {order.voucher_number && (
                        <span className="text-[10px] text-indigo-600 font-mono block">Vch #{order.voucher_number}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{order.product_name}</div>
                      <div className="text-[11px] text-gray-400">{order.product_code} • {order.bom_name}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {parseFloat(order.planned_quantity)} {order.product_unit}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      {parseFloat(order.total_produced_quantity || 0)} {order.product_unit}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {parseFloat(order.total_physical_quantity || order.physical_quantity || 0) > 0
                        ? `${parseFloat(order.total_physical_quantity || order.physical_quantity)} ${order.product_unit}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {parseFloat(order.total_wastage_quantity || order.wastage_quantity || 0) > 0 ? (
                        <div>
                          <span className="font-bold text-rose-600 block">
                            {parseFloat(order.total_wastage_quantity || order.wastage_quantity)} {order.product_unit}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            ₹{parseFloat(order.total_wastage_cost || order.wastage_cost || 0).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(order.planned_start_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        order.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : order.status === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px]">
                        {order.batches_count} batch
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {order.status === 'PLANNED' && (
                          <button
                            onClick={() => handleStartProduction(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium shadow-2xs transition"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Start Run
                          </button>
                        )}
                        {order.status === 'IN_PROGRESS' && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await orderApi.getById(order.id);
                                const fullOrder = res.data?.data;
                                setSelectedOrder(fullOrder);
                                const pendingBatch = fullOrder?.batches?.find(b => b.status === 'IN_PRODUCTION');
                                if (pendingBatch) {
                                  setSelectedBatchForCompletion(pendingBatch);
                                  setProducedQuantityInput(pendingBatch.planned_quantity || order.planned_quantity);
                                  setPhysicalQuantityInput(pendingBatch.planned_quantity || order.planned_quantity);
                                  setWorkforceExpenseInput('');
                                  setWastageReasonInput('');
                                  setShowCompleteModal(true);
                                } else {
                                  setShowDetailModal(true);
                                }
                              } catch (err) {
                                toast.error('Failed to load order details');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-amber-600 hover:bg-amber-700 text-white rounded font-medium shadow-2xs transition"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Mark Produced
                          </button>
                        )}
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PRODUCTION ORDER MODAL (WITH LIVE BOM AUTO-CALCULATION & INVENTORY PREVIEW) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-bold text-gray-900">Plan Production Order</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Product and Planned Qty */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select Product to Manufacture <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={createForm.product_id}
                    onChange={(e) => setCreateForm({ ...createForm, product_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                  >
                    <option value="">Choose product...</option>
                    {productsList.map(p => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.product_name} ({p.product_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Planned Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={createForm.planned_quantity}
                    onChange={(e) => setCreateForm({ ...createForm, planned_quantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Planned Start Date</label>
                  <input
                    type="date"
                    required
                    value={createForm.planned_start_date}
                    onChange={(e) => setCreateForm({ ...createForm, planned_start_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Target Completion Date</label>
                  <input
                    type="date"
                    value={createForm.planned_end_date}
                    onChange={(e) => setCreateForm({ ...createForm, planned_end_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* AUTOMATIC BOM CALCULATION PREVIEW */}
              {calcLoading ? (
                <div className="py-8 text-center text-xs text-gray-400">Calculating material requirements & checking FEFO batches...</div>
              ) : calcPreview && calcPreview.has_bom ? (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-amber-50/60 rounded-xl border border-amber-100 text-xs">
                    <div>
                      <span className="text-gray-500 text-[11px] block">Planned Quantity</span>
                      <span className="font-bold text-gray-900">{calcPreview.planned_quantity} units</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[11px] block">Total Cycle Time</span>
                      <span className="font-bold text-gray-900 block">
                        {calcPreview.formatted_planned_time || formatDuration(0, 0, calcPreview.planned_time_minutes).full}
                      </span>
                      {parseFloat(calcPreview.planned_time_minutes || 0) > 0 && (
                        <span className="text-[10px] text-gray-500 font-semibold block">
                          ({parseFloat(calcPreview.planned_time_minutes || 0).toLocaleString()} mins)
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500 text-[11px] block">Workforce Required</span>
                      <span className="font-bold text-gray-900">{calcPreview.planned_workforce_count} workers</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[11px] block">Planned Expenses</span>
                      <span className="font-bold text-amber-700">₹{parseFloat(calcPreview.planned_expense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Stock Availability Indicator */}
                  {!calcPreview.can_produce && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        <strong>Raw Material Shortage Alert:</strong> Some materials do not have sufficient stock in available inventory batches. Please generate a GRN before executing this run.
                      </span>
                    </div>
                  )}

                  {/* Materials Table with FEFO breakdown */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-amber-600" />
                      Automatically Calculated Raw Material Requirements & Batch Allocation
                    </h3>
                    <div className="overflow-x-auto border border-gray-100 rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                          <tr>
                            <th className="py-2.5 px-3">Raw Material</th>
                            <th className="py-2.5 px-3 text-right">Required Qty</th>
                            <th className="py-2.5 px-3 text-right">Available in Stock</th>
                            <th className="py-2.5 px-3 text-center">Batch Source (FEFO/FIFO)</th>
                            <th className="py-2.5 px-3 text-center">Sufficiency</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {calcPreview.materials?.map(m => (
                            <tr key={m.raw_material_id} className="hover:bg-gray-50/50">
                              <td className="py-2.5 px-3">
                                <span className="font-medium text-gray-900">{m.material_name}</span>
                                <span className="text-[10px] text-gray-400 block">{m.material_code}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                                {m.total_required_quantity} {m.unit}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-gray-600">
                                {m.total_available_stock} {m.unit}
                              </td>
                              <td className="py-2.5 px-3">
                                {m.allocated_batches?.length > 0 ? (
                                  <div className="space-y-1">
                                    {m.allocated_batches.map((b, bi) => (
                                      <div key={bi} className="text-[10px] bg-gray-50 px-2 py-0.5 rounded border border-gray-200/60 font-mono">
                                        {b.batch_number} → <span className="font-semibold text-blue-600">{b.will_consume} {m.unit}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-center block text-[11px]">No available batches</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {m.is_sufficient ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">
                                    <Check className="w-3 h-3" /> Sufficient
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded-full">
                                    <AlertTriangle className="w-3 h-3" /> Short by {m.shortage_quantity}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : createForm.product_id ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 text-center">
                  No active Production Master (BOM) found for this product. Please configure a BOM in Master Data first.
                </div>
              ) : null}

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !calcPreview?.has_bom}
                  className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {submitting ? 'Creating Order...' : 'Confirm Production Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ORDER DETAIL MODAL */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600">{selectedOrder.production_number}</span>
                <h2 className="text-sm font-bold text-gray-900">{selectedOrder.product_name} Production Order</h2>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Order Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg text-xs">
                <div>
                  <span className="text-gray-400 text-[11px] block">Planned Qty</span>
                  <span className="font-bold text-gray-800">{parseFloat(selectedOrder.planned_quantity)} {selectedOrder.product_unit}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Order Status</span>
                  <span className="font-bold text-amber-600">{selectedOrder.status}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Workforce Count</span>
                  <span className="font-bold text-gray-800">{parseFloat(selectedOrder.workforce_count || 1)} Workers</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Planned Expense</span>
                  <span className="font-bold text-gray-800">₹{parseFloat(selectedOrder.planned_expense || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Batches Section */}
              <div>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Production Batches</h3>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="py-2 px-3">Batch Number</th>
                        <th className="py-2 px-3">Production Date</th>
                        <th className="py-2 px-3 text-right">Planned Qty</th>
                        <th className="py-2 px-3 text-right">Produced Qty</th>
                        <th className="py-2 px-3 text-right">Physical Verified</th>
                        <th className="py-2 px-3 text-right">Wastage / Loss</th>
                        <th className="py-2 px-3 text-right">Workforce Cost</th>
                        <th className="py-2 px-3 text-right">Total Cost</th>
                        <th className="py-2 px-3 text-center">Batch Status</th>
                        <th className="py-2 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedOrder.batches?.map(b => (
                        <tr key={b.id} className="hover:bg-gray-50/50">
                          <td className="py-2 px-3">
                            <span className="font-mono font-bold text-blue-600 block">{b.batch_number}</span>
                            {b.voucher_number && (
                              <span className="font-mono text-[10px] text-indigo-600 block">Vch #{b.voucher_number}</span>
                            )}
                          </td>
                          <td className="py-2 px-3">{new Date(b.production_date).toLocaleDateString()}</td>
                          <td className="py-2 px-3 text-right">{parseFloat(b.planned_quantity)}</td>
                          <td className="py-2 px-3 text-right font-medium text-gray-800">{parseFloat(b.produced_quantity || 0)}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            {b.physical_quantity !== null && b.physical_quantity !== undefined ? parseFloat(b.physical_quantity) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {parseFloat(b.wastage_quantity || 0) > 0 ? (
                              <div>
                                <span className="font-bold text-rose-600 block">{parseFloat(b.wastage_quantity)} units</span>
                                <span className="text-[10px] text-gray-500 block">₹{parseFloat(b.wastage_cost || 0).toFixed(2)} ({b.wastage_reason})</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-purple-700">
                            ₹{parseFloat(b.workforce_cost || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900">
                            ₹{parseFloat(b.total_production_cost || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold text-[10px] rounded-full">
                              {b.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {b.status === 'IN_PRODUCTION' && (
                              <button
                                onClick={() => {
                                  setSelectedBatchForCompletion(b);
                                  setProducedQuantityInput(b.planned_quantity);
                                  setPhysicalQuantityInput(b.planned_quantity);
                                  setWorkforceExpenseInput('');
                                  setWastageReasonInput('');
                                  setShowCompleteModal(true);
                                }}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold rounded transition"
                              >
                                Mark Produced
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Raw Material Consumptions Section */}
              <div>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Raw Material Batches Consumed</h3>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="py-2 px-3">Raw Material</th>
                        <th className="py-2 px-3">Batch Number</th>
                        <th className="py-2 px-3 text-right">Consumed Quantity</th>
                        <th className="py-2 px-3 text-right">Unit Cost</th>
                        <th className="py-2 px-3 text-right">Total Cost</th>
                        <th className="py-2 px-3">Consumed At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedOrder.consumptions?.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50/50">
                          <td className="py-2 px-3 font-medium text-gray-900">{c.material_name}</td>
                          <td className="py-2 px-3 font-mono text-gray-600">{c.batch_number}</td>
                          <td className="py-2 px-3 text-right font-semibold text-gray-900">
                            {parseFloat(c.consumed_quantity)} {c.rm_unit}
                          </td>
                          <td className="py-2 px-3 text-right">₹{parseFloat(c.unit_cost).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-gray-800">₹{parseFloat(c.total_cost).toFixed(2)}</td>
                          <td className="py-2 px-3 text-gray-400">{new Date(c.consumed_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

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

      {/* COMPLETE BATCH MODAL */}
      {showCompleteModal && selectedBatchForCompletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-lg p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <Factory className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Complete Production Batch</h2>
                  <p className="text-[11px] font-mono text-gray-500">Batch #{selectedBatchForCompletion.batch_number}</p>
                </div>
              </div>
              <button onClick={() => setShowCompleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Verify actual manufactured count, enter workforce labor expenses, and record physical verification. Shortfalls will be automatically recorded as loss expense in Accounts.
            </p>

            <form onSubmit={handleCompleteBatchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Generated / System Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={producedQuantityInput}
                    onChange={(e) => {
                      setProducedQuantityInput(e.target.value);
                      if (!physicalQuantityInput || physicalQuantityInput === producedQuantityInput) {
                        setPhysicalQuantityInput(e.target.value);
                      }
                    }}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                  />
                  <span className="text-[10px] text-gray-400 block mt-0.5">Planned: {selectedBatchForCompletion.planned_quantity} units</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Workforce Charges (₹)</span>
                    <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1 rounded">Direct Expense</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 1500.00"
                    value={workforceExpenseInput}
                    onChange={(e) => setWorkforceExpenseInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                  />
                  <span className="text-[10px] text-gray-400 block mt-0.5">Debited to Direct Wages & added to product cost</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Physical Verified Quantity</span>
                  <span className="text-[10px] text-emerald-600 font-medium">Actual good items counted</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={physicalQuantityInput}
                  onChange={(e) => setPhysicalQuantityInput(e.target.value)}
                  placeholder="e.g. 95"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold text-gray-900"
                />
              </div>

              {/* Live Shortfall & Wastage Section */}
              {(() => {
                const genQty = parseFloat(producedQuantityInput) || 0;
                const physQty = physicalQuantityInput !== '' ? parseFloat(physicalQuantityInput) : genQty;
                const shortfall = genQty > physQty ? +(genQty - physQty).toFixed(4) : 0;
                const wfCost = parseFloat(workforceExpenseInput) || 0;
                const matCost = selectedOrder?.consumptions?.reduce((sum, c) => sum + parseFloat(c.total_cost || 0), 0) || 0;
                const totalCost = matCost + wfCost;
                const unitCost = genQty > 0 ? (totalCost / genQty) : 0;
                const wastageCost = +(shortfall * unitCost).toFixed(2);

                if (shortfall <= 0) return null;

                return (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-rose-900">
                          Shortfall Detected: {shortfall} units wasted / missing
                        </h4>
                        <p className="text-[11px] text-rose-700 mt-0.5">
                          Generated quantity ({genQty}) is greater than physical quantity ({physQty}). Please enter the wastage reason.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-rose-900 mb-1">
                        Reason for Loss / Wastage <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={wastageReasonInput}
                        onChange={(e) => setWastageReasonInput(e.target.value)}
                        placeholder='e.g. good wasted, defect during production'
                        className="w-full px-3 py-2 text-xs border border-rose-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                      />
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-rose-100 flex items-center justify-between text-xs">
                      <span className="text-gray-600">Calculated Wastage Expense:</span>
                      <div className="text-right">
                        <span className="font-extrabold text-rose-700 block">₹{wastageCost.toFixed(2)}</span>
                        <span className="text-[10px] text-gray-500">Noted as expense in Accounts (LED-LOSS-SPOILAGE)</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Confirm & Move to QC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionOrderManagement;
