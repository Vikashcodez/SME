import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { 
  production as productionApi, 
  products as productsApi, 
  rawMaterialInventory as inventoryApi,
  branches as branchesApi, 
  companies as companiesApi 
} from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Factory, 
  Plus, 
  Search, 
  Eye, 
  X, 
  Check, 
  Building2, 
  Building, 
  Calendar, 
  AlertTriangle, 
  RefreshCw, 
  Filter, 
  Layers, 
  ChevronRight,
  DollarSign, 
  FileSpreadsheet, 
  Boxes, 
  Package, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  SlidersHorizontal,
  Sun,
  CalendarDays,
  History,
  TrendingUp,
  MapPin,
  ClipboardList
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

const PERIOD_TYPES = ['Daily', 'Monthly', 'Weekly', 'Custom Batch'];

const ProductionInventory = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();
  const location = useLocation();

  // Selected Scope
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  // Lists
  const [companiesList, setCompaniesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [productionRunsList, setProductionRunsList] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    total_batches: 0,
    total_units_produced: 0,
    total_production_cost: 0,
    distinct_products_manufactured: 0,
    daily_units_produced: 0,
    monthly_units_produced: 0
  });

  // Loading
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingBOM, setCheckingBOM] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeRun, setActiveRun] = useState(null);

  // Form State
  const initialFormState = {
    product_id: '',
    production_quantity: '1',
    production_date: new Date().toISOString().split('T')[0],
    production_period_type: 'Daily',
    batch_number: '',
    warehouse_location: 'Main Store',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Live BOM Simulation Preview
  const [bomSimulation, setBomSimulation] = useState({
    has_bom: false,
    can_produce: true,
    total_material_cost: 0,
    materials: []
  });

  // Sync with Auth Context
  useEffect(() => {
    if (user?.branch_id) setSelectedBranchId(user.branch_id);
    if (user?.company_id) setSelectedCompanyId(user.company_id);
  }, [user]);

  useEffect(() => {
    if (isSuperAdmin) fetchCompanies();
  }, [isSuperAdmin]);

  useEffect(() => {
    const effectiveCompanyId = selectedCompanyId || user?.company_id;
    if (effectiveCompanyId) {
      fetchBranchesForCompany(effectiveCompanyId);
      fetchProductsList(effectiveCompanyId);
    }
  }, [selectedCompanyId, user?.company_id]);

  useEffect(() => {
    refreshAllData();
  }, [selectedCompanyId, selectedBranchId]);

  // Handle pre-selected product if navigated from Product Master
  useEffect(() => {
    if (location.state?.preSelectedProductId && productsList.length > 0) {
      handleOpenCreateModal(location.state.preSelectedProductId);
    }
  }, [location.state, productsList]);

  const fetchCompanies = async () => {
    try {
      const res = await companiesApi.getAll();
      const list = res.data.data || res.data || [];
      setCompaniesList(list);
      if (list.length > 0 && !selectedCompanyId) setSelectedCompanyId(list[0].company_id);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBranchesForCompany = async (compVal) => {
    try {
      const res = await branchesApi.getByCompany(compVal);
      setBranchesList(res.data.data || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProductsList = async (compVal) => {
    try {
      const res = await productsApi.getAll({ company_id: compVal });
      setProductsList(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshAllData = () => {
    fetchProductionRuns();
    fetchStats();
  };

  const fetchProductionRuns = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCompanyId) params.company_id = selectedCompanyId;
      if (selectedBranchId && selectedBranchId !== 'all') params.branch_id = selectedBranchId;
      const res = await productionApi.getAll(params);
      setProductionRunsList(res.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load production runs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {};
      if (selectedCompanyId) params.company_id = selectedCompanyId;
      if (selectedBranchId && selectedBranchId !== 'all') params.branch_id = selectedBranchId;
      const res = await productionApi.getStats(params);
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Check and simulate BOM requirements whenever product or quantity changes in modal
  const checkBomStockSimulation = async (productId, quantity) => {
    if (!productId || !quantity || parseFloat(quantity) <= 0) {
      setBomSimulation({ has_bom: false, can_produce: false, total_material_cost: 0, materials: [] });
      return;
    }

    setCheckingBOM(true);
    try {
      const effectiveBranch = selectedBranchId !== 'all' ? selectedBranchId : (user?.branch_id || branchesList[0]?.branch_id || null);
      const res = await productionApi.checkMaterials({
        product_id: productId,
        production_quantity: quantity,
        branch_id: effectiveBranch
      });

      setBomSimulation(res.data || { has_bom: false, can_produce: false, total_material_cost: 0, materials: [] });
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingBOM(false);
    }
  };

  // Open Create Production Modal
  const handleOpenCreateModal = (preSelectId = null) => {
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const defaultBatch = `BATCH-${todayStr}-${Math.floor(100 + Math.random() * 900)}`;

    const selectedId = preSelectId || (productsList.length > 0 ? productsList[0].product_id : '');

    setFormData({
      ...initialFormState,
      product_id: selectedId,
      batch_number: defaultBatch,
      production_date: new Date().toISOString().split('T')[0],
      production_period_type: 'Daily'
    });

    if (selectedId) {
      checkBomStockSimulation(selectedId, '1');
    }

    setShowCreateModal(true);
  };

  // Submit Production Run
  const handleRecordProduction = async () => {
    if (!formData.product_id) {
      toast.error('Please select a finished product.');
      return;
    }

    if (!formData.production_quantity || parseFloat(formData.production_quantity) <= 0) {
      toast.error('Please enter a valid production quantity.');
      return;
    }

    if (!bomSimulation.has_bom) {
      toast.error('This product does not have a BOM recipe. Add BOM in Product Master first.');
      return;
    }

    if (!bomSimulation.can_produce) {
      toast.error('Cannot proceed: Insufficient raw material inventory stock for this production run.');
      return;
    }

    const effectiveCompany = selectedCompanyId || user?.company_id;
    const effectiveBranch = selectedBranchId !== 'all' ? selectedBranchId : (user?.branch_id || branchesList[0]?.branch_id || null);

    if (!effectiveBranch) {
      toast.error('Please select a specific Branch for production inventory deduction.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        company_id: effectiveCompany,
        branch_id: effectiveBranch
      };

      const res = await productionApi.recordRun(payload);
      toast.success(res.data.message || 'Production run recorded and raw materials deducted from inventory!');
      setShowCreateModal(false);
      refreshAllData();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to record production run');
    } finally {
      setSubmitting(false);
    }
  };

  // View Run Details
  const handleOpenDetails = async (run) => {
    try {
      const res = await productionApi.getById(run.production_id);
      setActiveRun(res.data.data || run);
      setShowDetailsModal(true);
    } catch (e) {
      console.error(e);
      setActiveRun(run);
      setShowDetailsModal(true);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredProductionRuns.length === 0) {
      toast.error('No production records to export');
      return;
    }

    const headers = ['Date', 'Period', 'Batch Number', 'Production Code', 'Product Name', 'SKU Code', 'Quantity Produced', 'Total Material Cost', 'Warehouse'];
    const rows = filteredProductionRuns.map(r => [
      `"${new Date(r.production_date).toLocaleDateString()}"`,
      `"${r.production_period_type}"`,
      `"${r.batch_number || ''}"`,
      `"${r.production_code}"`,
      `"${r.product_name}"`,
      `"${r.product_code}"`,
      r.production_quantity,
      r.total_material_cost,
      `"${r.warehouse_location || 'Main Store'}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Production_Runs_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Production log exported');
  };

  // Filtered Production Runs
  const filteredProductionRuns = useMemo(() => {
    return productionRunsList.filter(r => {
      const itemText = (r.product_name || '') + ' ' + (r.product_code || '') + ' ' + (r.batch_number || '') + ' ' + (r.production_code || '');
      const matchSearch = !searchTerm || itemText.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPeriod = periodFilter === 'all' || r.production_period_type === periodFilter;
      const matchProduct = productFilter === 'all' || r.product_id.toString() === productFilter;
      const matchStart = !startDate || r.production_date >= startDate;
      const matchEnd = !endDate || r.production_date <= endDate;

      return matchSearch && matchPeriod && matchProduct && matchStart && matchEnd;
    });
  }, [productionRunsList, searchTerm, periodFilter, productFilter, startDate, endDate]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Inventory Management</span>
            <ChevronRight size={12} />
            <span className="text-blue-600">Raw Material Production & Manufacturing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Factory className="text-blue-600" size={28} />
            RAW MATERIAL PRODUCTION
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Log daily or monthly production batches. Selecting finished products and quantities automatically deducts required raw materials from warehouse inventory according to Bill of Materials (BOM) recipes.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={refreshAllData}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus size={15} />
            <span>+ Log Production Batch</span>
          </button>
        </div>
      </div>

      {/* Scope Selectors */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        {isSuperAdmin && (
          <div className="flex items-center gap-2 min-w-[220px]">
            <Building className="text-slate-400" size={16} />
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Company:</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            >
              {companiesList.map(c => (
                <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
              ))}
            </select>
          </div>
        )}

        {(isSuperAdmin || isCompanyAdmin) && (
          <div className="flex items-center gap-2 min-w-[220px]">
            <Building2 className="text-slate-400" size={16} />
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Branch Scope:</label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            >
              <option value="all">All Branches</option>
              {branchesList.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="text-xs text-slate-500 font-medium ml-auto flex items-center gap-1.5">
          <Boxes size={14} className="text-blue-600" />
          <span>Total Batches Run: <strong className="text-slate-900">{stats.total_batches || 0}</strong></span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Manufactured Units</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {parseFloat(stats.total_units_produced || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">{stats.total_batches || 0} production batches</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Daily Output Units</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {parseFloat(stats.daily_units_produced || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">From daily production runs</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Monthly Batch Output</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">
            {parseFloat(stats.monthly_units_produced || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">From monthly production batches</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Raw Material Consumed</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            ₹ {parseFloat(stats.total_production_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Inventory deduction valuation</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search batch#, product, production code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          >
            <option value="all">All Period Types</option>
            {PERIOD_TYPES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium max-w-[200px] truncate"
          >
            <option value="all">All Products</option>
            {productsList.map(prod => (
              <option key={prod.product_id} value={prod.product_id}>{prod.product_name}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 text-xs text-slate-500">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2 py-1 outline-none text-xs"
              title="From Date"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2 py-1 outline-none text-xs"
              title="To Date"
            />
          </div>
        </div>
      </div>

      {/* Production History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Production Date</th>
                <th className="py-3 px-4">Period Type</th>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Manufactured Product</th>
                <th className="py-3 px-4 text-right">Units Produced</th>
                <th className="py-3 px-4 text-right">Material Cost Deducted</th>
                <th className="py-3 px-4">Storage Location</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProductionRuns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                    No production runs recorded yet. Click "+ Log Production Batch" to start manufacturing.
                  </td>
                </tr>
              ) : filteredProductionRuns.map((run) => (
                <tr key={run.production_id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {new Date(run.production_date).toLocaleDateString()}
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                      run.production_period_type === 'Daily' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      run.production_period_type === 'Monthly' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {run.production_period_type === 'Daily' && '☀️ '}
                      {run.production_period_type === 'Monthly' && '📅 '}
                      {run.production_period_type}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-900">{run.batch_number}</span>
                    <span className="text-[10px] text-slate-400 block">{run.production_code}</span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{run.product_name}</div>
                    <span className="font-mono text-[10.5px] text-blue-600 bg-blue-50 px-1 rounded border border-blue-100">
                      {run.product_code}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                    {parseFloat(run.production_quantity).toLocaleString()} {run.product_uom || 'Units'}
                  </td>

                  <td className="py-3 px-4 text-right font-bold text-emerald-700">
                    ₹ {parseFloat(run.total_material_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  <td className="py-3 px-4 text-slate-600 font-medium">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="text-slate-400" />
                      <span>{run.warehouse_location || 'Main Store'}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {run.production_status || 'Completed'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleOpenDetails(run)}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-[11px] flex items-center justify-center gap-1 mx-auto"
                      title="View Raw Material Consumption Lines"
                    >
                      <Eye size={12} />
                      <span>BOM Log</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. LOG PRODUCTION BATCH MODAL (With Live BOM Simulator) */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Factory size={22} className="text-blue-200" />
                <div>
                  <h3 className="text-base font-bold">Log Raw Material Production Run</h3>
                  <p className="text-xs text-blue-100">Select finished product & batch quantity to automatically deduct required raw materials from stock</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Top Period Selector */}
              <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, production_period_type: 'Daily' })}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    formData.production_period_type === 'Daily'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Sun size={14} />
                  <span>☀️ Daily Production Run</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, production_period_type: 'Monthly' })}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    formData.production_period_type === 'Monthly'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <CalendarDays size={14} />
                  <span>📅 Monthly Production Batch</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, production_period_type: 'Custom Batch' })}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    formData.production_period_type === 'Custom Batch'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <SlidersHorizontal size={14} />
                  <span>Custom Batch</span>
                </button>
              </div>

              {/* Product Selection & Production Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Select Finished Product *</label>
                  <select
                    value={formData.product_id}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setFormData({ ...formData, product_id: newId });
                      checkBomStockSimulation(newId, formData.production_quantity);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Choose Product to Manufacture --</option>
                    {productsList.map(p => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.product_name} ({p.product_code}) — [{p.unit_of_measure}] — (Selling: ₹{parseFloat(p.selling_price || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Production Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 50"
                    value={formData.production_quantity}
                    onChange={(e) => {
                      const newQty = e.target.value;
                      setFormData({ ...formData, production_quantity: newQty });
                      checkBomStockSimulation(formData.product_id, newQty);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Production Date</label>
                  <input
                    type="date"
                    value={formData.production_date}
                    onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch / Lot Number</label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Store / Warehouse</label>
                  <input
                    type="text"
                    value={formData.warehouse_location}
                    onChange={(e) => setFormData({ ...formData, warehouse_location: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* ============================================================== */}
              {/* LIVE BOM REQUIREMENT & STOCK DEDUCTION SIMULATOR */}
              {/* ============================================================== */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Boxes size={16} className="text-blue-600" />
                    <span className="font-bold text-blue-900">
                      Live BOM Deduction Simulator & Inventory Availability
                    </span>
                  </div>
                  {checkingBOM && (
                    <span className="text-[11px] text-blue-600 flex items-center gap-1">
                      <RefreshCw size={11} className="animate-spin" />
                      Checking inventory...
                    </span>
                  )}
                </div>

                {!formData.product_id ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">
                    Select a finished product above to view required raw materials.
                  </p>
                ) : !bomSimulation.has_bom ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2.5">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <strong className="block font-bold">No BOM Recipe Configured!</strong>
                      <p className="text-[11px] mt-0.5">
                        This product does not have any raw materials assigned in its Bill of Materials recipe. Please go to Product Master and configure the required raw materials first.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-white/80 text-slate-600 font-bold border-b border-slate-200">
                            <th className="py-2 px-3">Raw Material</th>
                            <th className="py-2 px-3 text-right">Recipe Rate (1 unit)</th>
                            <th className="py-2 px-3 text-right">Total Deduction Required</th>
                            <th className="py-2 px-3 text-right">Warehouse Stock</th>
                            <th className="py-2 px-3 text-right">Est. Material Cost</th>
                            <th className="py-2 px-3 text-center">Availability</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100/60 bg-white">
                          {bomSimulation.materials.map((m) => (
                            <tr key={m.material_id} className={m.has_sufficient_stock ? '' : 'bg-rose-50/50'}>
                              <td className="py-2.5 px-3">
                                <strong className="text-slate-900 block">{m.material_name}</strong>
                                <span className="font-mono text-[10.5px] text-blue-600">{m.material_code}</span>
                              </td>

                              <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                                {m.unit_quantity_required} {m.unit_of_measure}
                              </td>

                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                {m.total_quantity_required} {m.unit_of_measure}
                              </td>

                              <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                                {m.current_stock.toLocaleString()} {m.unit_of_measure}
                              </td>

                              <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                                ₹ {m.total_cost.toFixed(2)}
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                {m.has_sufficient_stock ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Check size={11} />
                                    <span>Stock OK</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                    <X size={11} />
                                    <span>Short by {m.shortage_quantity} {m.unit_of_measure}</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Total Deduction Valuation */}
                    <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-slate-300 text-xs block">Total Production Raw Material Cost:</span>
                        <span className="text-[10.5px] text-slate-400">Calculated across all BOM materials</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-emerald-400">
                          ₹ {bomSimulation.total_material_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {!bomSimulation.can_produce && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                        <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                        <span>
                          <strong>Stock Shortage Detected:</strong> You cannot execute this production run because one or more raw materials do not have sufficient warehouse stock. Please replenish inventory via GRN Inward.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shift Remarks & Production Notes</label>
                <textarea
                  rows={2}
                  placeholder="Enter shift details, machine line, operator names..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordProduction}
                disabled={submitting || !bomSimulation.can_produce || !bomSimulation.has_bom}
                className={`px-5 py-2 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md ${
                  bomSimulation.can_produce && bomSimulation.has_bom
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={15} />}
                <span>Confirm & Deduct Raw Materials</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PRODUCTION RUN DETAILS & CONSUMPTION LOG MODAL */}
      {/* ========================================================================= */}
      {showDetailsModal && activeRun && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Factory size={22} className="text-blue-400" />
                <div>
                  <h3 className="text-base font-bold">Production Batch #{activeRun.batch_number}</h3>
                  <p className="text-xs text-slate-400 font-mono">Code #{activeRun.production_code}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[11px] block">Manufactured Item</span>
                  <strong className="text-slate-900 font-bold block">{activeRun.product_name}</strong>
                  <span className="font-mono text-[10.5px] text-blue-600">{activeRun.product_code}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Units Manufactured</span>
                  <strong className="text-blue-700 font-bold text-sm">
                    {parseFloat(activeRun.production_quantity).toLocaleString()} {activeRun.product_uom || 'Units'}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Total Material Cost</span>
                  <strong className="text-emerald-700 font-bold text-sm">
                    ₹ {parseFloat(activeRun.total_material_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Period & Date</span>
                  <strong className="text-slate-900 block">{activeRun.production_period_type}</strong>
                  <span className="text-slate-500 font-mono">{new Date(activeRun.production_date).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Consumed Materials Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>Raw Materials Deducted from Inventory</span>
                  <span className="text-emerald-700 font-bold">
                    {activeRun.materials_consumed?.length || 0} Materials Consumed
                  </span>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 text-slate-500 font-semibold border-b border-slate-200">
                      <th className="py-2 px-3">Material SKU</th>
                      <th className="py-2 px-3 text-right">Unit Required</th>
                      <th className="py-2 px-3 text-right">Total Qty Deducted</th>
                      <th className="py-2 px-3 text-right">Unit Cost</th>
                      <th className="py-2 px-3 text-right">Total Line Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!activeRun.materials_consumed || activeRun.materials_consumed.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                          No material consumption line items recorded.
                        </td>
                      </tr>
                    ) : activeRun.materials_consumed.map((m) => (
                      <tr key={m.consumption_id}>
                        <td className="py-2.5 px-3">
                          <strong className="text-slate-900 block">{m.material_name}</strong>
                          <span className="font-mono text-[10.5px] text-blue-600">{m.material_code}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {parseFloat(m.unit_quantity_required).toFixed(4)} {m.unit_of_measure}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                          - {parseFloat(m.total_quantity_deducted).toFixed(2)} {m.unit_of_measure}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          ₹ {parseFloat(m.unit_cost || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹ {parseFloat(m.total_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setShowDetailsModal(false)} className="px-5 py-2 bg-slate-800 text-white font-bold rounded-lg text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionInventory;
