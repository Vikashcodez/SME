import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  assets as assetsApi, 
  departments as departmentsApi,
  employees as employeesApi,
  vendors as vendorsApi,
  branches as branchesApi, 
  companies as companiesApi 
} from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Shield, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  RotateCcw, 
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
  Download,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Wrench,
  AlertOctagon,
  History,
  Tag,
  User,
  MapPin,
  Truck,
  Monitor,
  Cpu,
  Armchair,
  Car,
  Settings2
} from 'lucide-react';

const ASSET_CATEGORIES = [
  'Heavy Machinery & Production Line',
  'IT Equipment & Computers',
  'Office Furniture & Fixtures',
  'Vehicles & Transport',
  'Tools & Precision Dies',
  'Electrical & Generators',
  'Safety & Security Equipment',
  'General Infrastructure'
];

const ASSET_STATUS_COLORS = {
  'In Use': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Under Maintenance': 'bg-amber-50 text-amber-700 border-amber-200',
  'In Storage': 'bg-blue-50 text-blue-700 border-blue-200',
  'Disposed / Scrapped': 'bg-rose-50 text-rose-700 border-rose-200',
  'Lost': 'bg-slate-100 text-slate-600 border-slate-200'
};

const CONDITION_COLORS = {
  'Excellent': 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'Good': 'text-blue-700 bg-blue-50 border-blue-200',
  'Fair': 'text-amber-700 bg-amber-50 border-amber-200',
  'Needs Repair': 'text-orange-700 bg-orange-50 border-orange-200',
  'Critical': 'text-rose-700 bg-rose-50 border-rose-200'
};

const AssetsInventory = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();

  // Scope
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  // Lists
  const [companiesList, setCompaniesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);

  // Data
  const [assetsList, setAssetsList] = useState([]);
  const [damageReturnsList, setDamageReturnsList] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    total_assets: 0,
    in_use_count: 0,
    maintenance_count: 0,
    disposed_count: 0,
    attention_needed_count: 0,
    total_purchase_cost: 0,
    total_current_value: 0,
    total_maintenance_spent: 0
  });

  // Active Tab: 'assets' | 'maintenance' | 'damage'
  const [activeTab, setActiveTab] = useState('assets');

  // Loading
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters & View
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [activeAsset, setActiveAsset] = useState(null);

  // Initial Forms
  const initialAssetForm = {
    company_id: user?.company_id || '',
    branch_id: user?.branch_id || '',
    department_id: '',
    assigned_employee_id: '',
    vendor_id: '',
    asset_tag: '',
    asset_name: '',
    asset_category: 'Heavy Machinery & Production Line',
    brand_model: '',
    serial_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_cost: '',
    current_value: '',
    depreciation_rate: '10',
    location: 'Floor 1, Bay A',
    asset_status: 'In Use',
    condition: 'Good',
    warranty_expiry_date: '',
    last_service_date: '',
    next_service_due: '',
    notes: '',
    is_active: true
  };

  const [formData, setFormData] = useState(initialAssetForm);
  const [editFormData, setEditFormData] = useState(initialAssetForm);

  // Maintenance Form
  const [maintenanceForm, setMaintenanceForm] = useState({
    service_date: new Date().toISOString().split('T')[0],
    service_type: 'Routine Maintenance',
    vendor_id: '',
    cost: '',
    description: '',
    performed_by: '',
    next_service_due: '',
    new_condition: 'Good',
    update_status_to_active: true
  });

  // Damage / Breakdown / Return Form
  const [damageForm, setDamageForm] = useState({
    event_type: 'Damage / Breakdown',
    damage_severity: 'Moderate',
    incident_date: new Date().toISOString().split('T')[0],
    reason_description: '',
    action_taken: 'Sent for Repair',
    salvage_value: '0.00',
    repair_cost_estimate: '',
    vendor_id: '',
    status: 'Under Inspection'
  });

  // Sync user scope
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
      fetchBranches(effectiveCompanyId);
      fetchSupportingData(effectiveCompanyId);
    }
  }, [selectedCompanyId, user?.company_id]);

  useEffect(() => {
    refreshAllData();
  }, [selectedCompanyId, selectedBranchId]);

  const fetchCompanies = async () => {
    try {
      const res = await companiesApi.getAll();
      setCompaniesList(res.data.data || res.data || []);
      if (res.data.data?.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(res.data.data[0].company_id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBranches = async (compVal) => {
    try {
      const res = await branchesApi.getByCompany(compVal);
      setBranchesList(res.data.data || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSupportingData = async (compVal) => {
    try {
      const [empRes, venRes] = await Promise.all([
        employeesApi.getAll({ company_id: compVal }),
        vendorsApi.getAll({ company_id: compVal })
      ]);
      setEmployeesList(empRes.data.data || []);
      setVendorsList(venRes.data.data || []);

      if (selectedBranchId && selectedBranchId !== 'all') {
        const deptRes = await departmentsApi.getByBranch(selectedBranchId);
        setDepartmentsList(deptRes.data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshAllData = () => {
    fetchAssets();
    fetchDamageReturns();
    fetchStats();
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCompanyId) params.company_id = selectedCompanyId;
      if (selectedBranchId && selectedBranchId !== 'all') params.branch_id = selectedBranchId;
      const res = await assetsApi.getAll(params);
      setAssetsList(res.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load assets inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchDamageReturns = async () => {
    try {
      const params = {};
      if (selectedCompanyId) params.company_id = selectedCompanyId;
      if (selectedBranchId && selectedBranchId !== 'all') params.branch_id = selectedBranchId;
      const res = await assetsApi.getDamageReturns(params);
      setDamageReturnsList(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {};
      if (selectedCompanyId) params.company_id = selectedCompanyId;
      if (selectedBranchId && selectedBranchId !== 'all') params.branch_id = selectedBranchId;
      const res = await assetsApi.getStats(params);
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Create Asset
  const handleCreateAsset = async () => {
    if (!formData.asset_name.trim() || !formData.asset_category) {
      toast.error('Asset Name and Category are required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        company_id: selectedCompanyId || user?.company_id,
        branch_id: formData.branch_id || selectedBranchId || null
      };

      const res = await assetsApi.create(payload);
      toast.success(res.data.message || 'Asset registered successfully');
      setShowCreateModal(false);
      setFormData(initialAssetForm);
      refreshAllData();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to register asset');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Open Edit
  const handleOpenEdit = (asset) => {
    setActiveAsset(asset);
    setEditFormData({
      company_id: asset.company_id || '',
      branch_id: asset.branch_id || '',
      department_id: asset.department_id || '',
      assigned_employee_id: asset.assigned_employee_id || '',
      vendor_id: asset.vendor_id || '',
      asset_tag: asset.asset_tag || '',
      asset_name: asset.asset_name || '',
      asset_category: asset.asset_category || 'Heavy Machinery & Production Line',
      brand_model: asset.brand_model || '',
      serial_number: asset.serial_number || '',
      purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : '',
      purchase_cost: asset.purchase_cost || '0.00',
      current_value: asset.current_value || '0.00',
      depreciation_rate: asset.depreciation_rate || '10',
      location: asset.location || '',
      asset_status: asset.asset_status || 'In Use',
      condition: asset.condition || 'Good',
      warranty_expiry_date: asset.warranty_expiry_date ? asset.warranty_expiry_date.split('T')[0] : '',
      last_service_date: asset.last_service_date ? asset.last_service_date.split('T')[0] : '',
      next_service_due: asset.next_service_due ? asset.next_service_due.split('T')[0] : '',
      notes: asset.notes || '',
      is_active: asset.is_active !== undefined ? asset.is_active : true
    });
    setShowEditModal(true);
  };

  // Handle Update Asset
  const handleUpdateAsset = async () => {
    if (!editFormData.asset_name.trim()) {
      toast.error('Asset Name is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await assetsApi.update(activeAsset.asset_id, editFormData);
      toast.success(res.data.message || 'Asset updated successfully');
      setShowEditModal(false);
      refreshAllData();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to update asset');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Full Details Modal with History
  const handleOpenDetails = async (asset) => {
    try {
      const res = await assetsApi.getById(asset.asset_id);
      setActiveAsset(res.data.data);
      setShowDetailsModal(true);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load asset details');
    }
  };

  // Open Maintenance Modal
  const handleOpenMaintenance = (asset) => {
    setActiveAsset(asset);
    setMaintenanceForm({
      service_date: new Date().toISOString().split('T')[0],
      service_type: 'Routine Maintenance',
      vendor_id: asset.vendor_id || '',
      cost: '',
      description: '',
      performed_by: '',
      next_service_due: '',
      new_condition: asset.condition || 'Good',
      update_status_to_active: true
    });
    setShowMaintenanceModal(true);
  };

  // Submit Maintenance
  const handleRecordMaintenance = async () => {
    setSubmitting(true);
    try {
      const res = await assetsApi.recordMaintenance(activeAsset.asset_id, maintenanceForm);
      toast.success(res.data.message || 'Service log recorded');
      setShowMaintenanceModal(false);
      refreshAllData();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to record maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Damage Modal
  const handleOpenDamage = (asset) => {
    setActiveAsset(asset);
    setDamageForm({
      event_type: 'Damage / Breakdown',
      damage_severity: 'Moderate',
      incident_date: new Date().toISOString().split('T')[0],
      reason_description: '',
      action_taken: 'Sent for Repair',
      salvage_value: '0.00',
      repair_cost_estimate: '',
      vendor_id: asset.vendor_id || '',
      status: 'Under Inspection'
    });
    setShowDamageModal(true);
  };

  // Submit Damage
  const handleRecordDamage = async () => {
    setSubmitting(true);
    try {
      const res = await assetsApi.recordDamageOrReturn(activeAsset.asset_id, damageForm);
      toast.success(res.data.message || 'Incident recorded');
      setShowDamageModal(false);
      refreshAllData();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to record incident');
    } finally {
      setSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (assetsList.length === 0) {
      toast.error('No assets to export');
      return;
    }

    const headers = ['Asset Tag', 'Asset Name', 'Category', 'Brand/Model', 'Serial No', 'Purchase Cost', 'Current Value', 'Location', 'Status', 'Condition'];
    const rows = assetsList.map(a => [
      `"${a.asset_tag}"`,
      `"${a.asset_name}"`,
      `"${a.asset_category}"`,
      `"${a.brand_model || ''}"`,
      `"${a.serial_number || ''}"`,
      a.purchase_cost,
      a.current_value,
      `"${a.location || ''}"`,
      `"${a.asset_status}"`,
      `"${a.condition}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Assets_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Assets register exported as CSV');
  };

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assetsList.filter(a => {
      const matchSearch = !searchTerm ||
        a.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.asset_tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.brand_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.location?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat = categoryFilter === 'all' || a.asset_category === categoryFilter;
      const matchStatus = statusFilter === 'all' || a.asset_status === statusFilter;
      const matchCond = conditionFilter === 'all' || a.condition === conditionFilter;

      return matchSearch && matchCat && matchStatus && matchCond;
    });
  }, [assetsList, searchTerm, categoryFilter, statusFilter, conditionFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Inventory Management</span>
            <ChevronRight size={12} />
            <span className="text-blue-600">Fixed Assets & Maintenance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="text-blue-600" size={28} />
            ASSETS INVENTORY & TRACKING
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Maintain fixed assets register, track depreciation valuation, schedule preventive maintenance, and manage breakdown / scrap returns.
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
            onClick={() => {
              setFormData({
                ...initialAssetForm,
                company_id: selectedCompanyId || user?.company_id,
                branch_id: selectedBranchId || ''
              });
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>Register Asset</span>
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
          <Tag size={14} className="text-blue-600" />
          <span>Active Plant Assets: <strong className="text-slate-900">{stats.in_use_count || 0}</strong></span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Plant Assets</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total_assets || 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Active Operation</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.in_use_count || 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Under Service / Repair</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.maintenance_count || 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Asset Valuation</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹ {parseFloat(stats.total_current_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('assets')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'assets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield size={15} />
          <span>Asset Register ({filteredAssets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('damage')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'damage' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertOctagon size={15} />
          <span>Breakdown, Damage & Returns ({damageReturnsList.length})</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by asset name, asset tag, serial number, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {ASSET_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="In Use">In Use</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="In Storage">In Storage</option>
            <option value="Disposed / Scrapped">Disposed / Scrapped</option>
          </select>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              <TableIcon size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-semibold ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ASSET REGISTER */}
      {/* ========================================================================= */}
      {activeTab === 'assets' && (
        viewMode === 'table' ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Asset Tag / Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Location / Room</th>
                    <th className="py-3 px-4">Department / Custodian</th>
                    <th className="py-3 px-4 text-right">Purchase Cost</th>
                    <th className="py-3 px-4 text-right">Current Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Condition</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssets.map((asset) => (
                    <tr key={asset.asset_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{asset.asset_name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10.5px]">
                          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                            {asset.asset_tag}
                          </span>
                          {asset.serial_number && <span className="text-slate-400">SN: {asset.serial_number}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {asset.asset_category}
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {asset.location || 'Branch Floor'}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{asset.department_name || 'General Operations'}</div>
                        {asset.employee_first_name && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <User size={10} />
                            {asset.employee_first_name} {asset.employee_last_name || ''}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        ₹ {parseFloat(asset.purchase_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹ {parseFloat(asset.current_value || asset.purchase_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                          ASSET_STATUS_COLORS[asset.asset_status] || ASSET_STATUS_COLORS['In Use']
                        }`}>
                          {asset.asset_status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-bold border ${
                          CONDITION_COLORS[asset.condition] || CONDITION_COLORS['Good']
                        }`}>
                          {asset.condition}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetails(asset)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Full Profile"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            onClick={() => handleOpenMaintenance(asset)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Log Service / Maintenance"
                          >
                            <Wrench size={15} />
                          </button>

                          <button
                            onClick={() => handleOpenDamage(asset)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Log Damage / Breakdown"
                          >
                            <AlertOctagon size={15} />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(asset)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                            title="Edit"
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => (
              <div key={asset.asset_id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{asset.asset_name}</h4>
                      <span className="font-mono text-[10.5px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 inline-block mt-0.5">
                        {asset.asset_tag}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border shrink-0 ${
                      ASSET_STATUS_COLORS[asset.asset_status] || ASSET_STATUS_COLORS['In Use']
                    }`}>
                      {asset.asset_status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3 mb-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Category:</span>
                      <span className="font-medium text-slate-800">{asset.asset_category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Value:</span>
                      <span className="font-bold text-slate-900">₹ {parseFloat(asset.current_value || asset.purchase_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Condition:</span>
                      <span className={`px-2 py-0.2 rounded font-bold text-[10.5px] ${CONDITION_COLORS[asset.condition] || ''}`}>{asset.condition}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Location:</span>
                      <span className="font-medium text-slate-800">{asset.location || 'Branch'}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => handleOpenDetails(asset)}
                    className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg text-center"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => handleOpenMaintenance(asset)}
                    className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg text-center"
                  >
                    + Service
                  </button>
                  <button
                    onClick={() => handleOpenDamage(asset)}
                    className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg"
                    title="Log Damage"
                  >
                    <AlertOctagon size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BREAKDOWN & RETURNS DISPOSAL */}
      {/* ========================================================================= */}
      {activeTab === 'damage' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Asset Tag / Name</th>
                  <th className="py-3 px-4">Incident Event</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Action Taken</th>
                  <th className="py-3 px-4 text-right">Salvage Value</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {damageReturnsList.map((dr) => (
                  <tr key={dr.damage_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {new Date(dr.incident_date).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{dr.asset_name}</div>
                      <span className="font-mono text-[10.5px] text-blue-600">{dr.asset_tag}</span>
                    </td>

                    <td className="py-3 px-4 font-bold text-rose-700">
                      {dr.event_type}
                      {dr.reason_description && (
                        <p className="text-[11px] text-slate-500 font-normal mt-0.5 max-w-xs truncate">{dr.reason_description}</p>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {dr.damage_severity}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {dr.action_taken}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹ {parseFloat(dr.salvage_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      {dr.vendor_name || 'N/A'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {dr.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. REGISTER ASSET MODAL */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl my-8 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield size={22} className="text-blue-200" />
                <div>
                  <h3 className="text-base font-bold">Register Plant Asset / Equipment</h3>
                  <p className="text-xs text-blue-100">Add capital equipment, machinery, IT hardware or vehicles</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Asset Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. CNC Milling Machine 5-Axis"
                    value={formData.asset_name}
                    onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Asset Tag (Auto if blank)</label>
                  <input
                    type="text"
                    placeholder="e.g. AST-MCH-01"
                    value={formData.asset_tag}
                    onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.asset_category}
                    onChange={(e) => setFormData({ ...formData, asset_category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    {ASSET_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand & Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Haas VF-2"
                    value={formData.brand_model}
                    onChange={(e) => setFormData({ ...formData, brand_model: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-99482710"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Cost (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.purchase_cost}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location / Floor</label>
                  <input
                    type="text"
                    placeholder="e.g. Shop Floor Bay 4"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Needs Repair">Needs Repair</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Custodian (Staff)</label>
                  <select
                    value={formData.assigned_employee_id}
                    onChange={(e) => setFormData({ ...formData, assigned_employee_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    <option value="">-- No Custodian --</option>
                    {employeesList.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name || ''} ({emp.employee_code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vendor / Manufacturer</label>
                  <select
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    <option value="">-- No Vendor Link --</option>
                    {vendorsList.map(v => (
                      <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Warranty Expiry Date</label>
                  <input
                    type="date"
                    value={formData.warranty_expiry_date}
                    onChange={(e) => setFormData({ ...formData, warranty_expiry_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Notes / Specifications</label>
                  <textarea
                    rows={2}
                    placeholder="Maintenance interval requirements, power rating, asset notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-lg">Cancel</button>
              <button onClick={handleCreateAsset} disabled={submitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5">
                {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                <span>Register Asset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAINTENANCE LOG MODAL */}
      {/* ========================================================================= */}
      {showMaintenanceModal && activeAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl my-8 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wrench size={20} className="text-emerald-200" />
                <div>
                  <h3 className="text-base font-bold">Log Maintenance Service</h3>
                  <p className="text-xs text-emerald-100">{activeAsset.asset_name} ({activeAsset.asset_tag})</p>
                </div>
              </div>
              <button onClick={() => setShowMaintenanceModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Date *</label>
                  <input
                    type="date"
                    value={maintenanceForm.service_date}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, service_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Type *</label>
                  <select
                    value={maintenanceForm.service_type}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, service_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Routine Maintenance">Routine Maintenance</option>
                    <option value="Emergency Repair">Emergency Repair</option>
                    <option value="Calibration & Testing">Calibration & Testing</option>
                    <option value="Safety Inspection">Safety Inspection</option>
                    <option value="Parts Replacement">Parts Replacement</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={maintenanceForm.cost}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Next Service Due Date</label>
                  <input
                    type="date"
                    value={maintenanceForm.next_service_due}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, next_service_due: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Performed By / Technician</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Tech Ramesh"
                    value={maintenanceForm.performed_by}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performed_by: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Updated Condition</label>
                  <select
                    value={maintenanceForm.new_condition}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, new_condition: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Service Description / Work Done</label>
                  <textarea
                    rows={2}
                    placeholder="Lubrication, oil change, belt alignment, parts checked..."
                    value={maintenanceForm.description}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button onClick={() => setShowMaintenanceModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-lg">Cancel</button>
              <button onClick={handleRecordMaintenance} disabled={submitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5">
                {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                <span>Save Service Log</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DAMAGE & DISPOSAL MODAL */}
      {/* ========================================================================= */}
      {showDamageModal && activeAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl my-8 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertOctagon size={20} className="text-rose-200" />
                <div>
                  <h3 className="text-base font-bold">Log Asset Breakdown / Scrap / Return</h3>
                  <p className="text-xs text-rose-100">{activeAsset.asset_name} ({activeAsset.asset_tag})</p>
                </div>
              </div>
              <button onClick={() => setShowDamageModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Incident Event Type *</label>
                  <select
                    value={damageForm.event_type}
                    onChange={(e) => setDamageForm({ ...damageForm, event_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    <option value="Damage / Breakdown">Damage / Breakdown</option>
                    <option value="Return to Vendor (Warranty/RMA)">Return to Vendor (Warranty/RMA)</option>
                    <option value="Scrapped / Write-Off">Scrapped / Write-Off (Disposal)</option>
                    <option value="Lost / Stolen">Lost / Stolen</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Damage Severity</label>
                  <select
                    value={damageForm.damage_severity}
                    onChange={(e) => setDamageForm({ ...damageForm, damage_severity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    <option value="Minor">Minor</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe / Total Loss">Severe / Total Loss</option>
                    <option value="Beyond Economical Repair">Beyond Economical Repair</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Action Taken *</label>
                  <select
                    value={damageForm.action_taken}
                    onChange={(e) => setDamageForm({ ...damageForm, action_taken: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    <option value="Sent for Repair">Sent for Repair</option>
                    <option value="Returned to Vendor for Replacement">Returned to Vendor for Replacement</option>
                    <option value="Scrapped & Written Off">Scrapped & Written Off</option>
                    <option value="Insurance Claim Filed">Insurance Claim Filed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Salvage Value (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={damageForm.salvage_value}
                    onChange={(e) => setDamageForm({ ...damageForm, salvage_value: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Incident Cause & Reason</label>
                  <textarea
                    rows={2}
                    placeholder="Describe breakdown reason, damage cause, inspection notes..."
                    value={damageForm.reason_description}
                    onChange={(e) => setDamageForm({ ...damageForm, reason_description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button onClick={() => setShowDamageModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-lg">Cancel</button>
              <button onClick={handleRecordDamage} disabled={submitting} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5">
                {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                <span>Log Incident</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DETAILS MODAL */}
      {/* ========================================================================= */}
      {showDetailsModal && activeAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield size={22} className="text-blue-400" />
                <div>
                  <h3 className="text-base font-bold">{activeAsset.asset_name}</h3>
                  <p className="text-xs text-slate-400 font-mono">Asset Tag #{activeAsset.asset_tag}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[11px] block">Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border mt-0.5 ${ASSET_STATUS_COLORS[activeAsset.asset_status]}`}>
                    {activeAsset.asset_status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Condition</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border mt-0.5 ${CONDITION_COLORS[activeAsset.condition]}`}>
                    {activeAsset.condition}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Purchase Cost</span>
                  <strong className="text-slate-900">₹ {parseFloat(activeAsset.purchase_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Current Value</span>
                  <strong className="text-emerald-700">₹ {parseFloat(activeAsset.current_value || activeAsset.purchase_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              {/* Maintenance History */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-800 mb-2.5 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Wrench size={14} className="text-emerald-600" />
                  Service & Maintenance History
                </h4>
                {activeAsset.maintenance_history && activeAsset.maintenance_history.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                    {activeAsset.maintenance_history.map(m => (
                      <div key={m.maintenance_id} className="p-2.5 bg-slate-50 flex items-center justify-between">
                        <div>
                          <strong className="text-slate-900">{m.service_type}</strong>
                          <div className="text-slate-500 text-[11px]">{new Date(m.service_date).toLocaleDateString()} · {m.performed_by || 'Tech'}</div>
                        </div>
                        <div className="text-right">
                          <strong className="text-slate-900">₹ {parseFloat(m.cost || 0).toFixed(2)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No maintenance service records logged yet.</p>
                )}
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

export default AssetsInventory;
