import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  vendors as vendorsApi, 
  branches as branchesApi, 
  companies as companiesApi 
} from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Truck, 
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
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Filter, 
  Layers, 
  ChevronRight,
  Sparkles,
  Info,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  DollarSign,
  Download,
  LayoutGrid,
  Table as TableIcon,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';

const STATUS_COLORS = {
  'Active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Inactive': 'bg-slate-100 text-slate-600 border-slate-200',
  'Blacklisted': 'bg-rose-50 text-rose-700 border-rose-200'
};

const PAYMENT_TERMS_OPTIONS = [
  'Net 15 Days',
  'Net 30 Days',
  'Net 45 Days',
  'Net 60 Days',
  'Cash on Delivery (COD)',
  '100% Advance',
  '50% Advance / 50% on Delivery'
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi NCR', 'Chandigarh'
];

const VendorMaster = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();

  // Selected scope state
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  // Lists
  const [companiesList, setCompaniesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    total_vendors: 0,
    active_vendors: 0,
    inactive_vendors: 0,
    blacklisted_vendors: 0,
    total_opening_balance: 0
  });

  // Loading states
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters & View
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Active', 'Inactive', 'Blacklisted'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [copiedField, setCopiedField] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [activeVendor, setActiveVendor] = useState(null);

  // Form states
  const initialFormData = {
    company_id: user?.company_id || '',
    branch_id: user?.branch_id || '',
    vendor_code: '',
    vendor_name: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    phone: '',
    email: '',
    bank_account_no: '',
    ifsc_code: '',
    bank_name: '',
    payment_terms: 'Net 30 Days',
    opening_balance: '0.00',
    status: 'Active',
    is_active: true
  };

  const [formData, setFormData] = useState(initialFormData);
  const [editFormData, setEditFormData] = useState(initialFormData);

  // Fetch Companies (for Super Admin)
  useEffect(() => {
    if (isSuperAdmin) {
      fetchCompanies();
    }
  }, [isSuperAdmin]);

  // Fetch Branches when company changes
  useEffect(() => {
    const effectiveCompanyId = selectedCompanyId || user?.company_id;
    if (effectiveCompanyId) {
      fetchBranchesForCompany(effectiveCompanyId);
    }
  }, [selectedCompanyId, user?.company_id]);

  // Fetch Vendors and Stats when scope changes
  useEffect(() => {
    fetchVendors();
    fetchStats();
  }, [selectedCompanyId, selectedBranchId]);

  // If user is branch admin, sync their branch
  useEffect(() => {
    if (user?.branch_id) {
      setSelectedBranchId(user.branch_id);
    }
    if (user?.company_id) {
      setSelectedCompanyId(user.company_id);
    }
  }, [user]);

  const fetchCompanies = async () => {
    try {
      const response = await companiesApi.getAll();
      const list = response.data.data || response.data || [];
      setCompaniesList(list);
      if (list.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(list[0].company_id);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      toast.error('Failed to load companies');
    }
  };

  const fetchBranchesForCompany = async (companyId) => {
    setLoadingBranches(true);
    try {
      const response = await branchesApi.getByCompany(companyId);
      const list = response.data.data || response.data || [];
      setBranchesList(list);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      toast.error('Failed to load branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchVendors = async () => {
    setLoadingVendors(true);
    try {
      const params = {};
      if (selectedCompanyId) params.company_id = selectedCompanyId;
      if (selectedBranchId && selectedBranchId !== 'all') params.branch_id = selectedBranchId;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await vendorsApi.getAll(params);
      const list = response.data.data || [];
      setVendorsList(list);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoadingVendors(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {};
      if (selectedCompanyId) params.company_id = selectedCompanyId;
      if (selectedBranchId && selectedBranchId !== 'all') params.branch_id = selectedBranchId;
      const response = await vendorsApi.getStats(params);
      if (response.data?.data) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch vendor stats:', error);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard!`);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Handle Create Vendor
  const handleCreateVendor = async (andAddNew = false) => {
    if (!formData.vendor_name.trim()) {
      toast.error('Please enter Vendor Name');
      return;
    }
    if (!formData.address.trim() || !formData.city.trim() || !formData.state.trim()) {
      toast.error('Address, City, and State are required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        company_id: selectedCompanyId || user?.company_id,
        branch_id: formData.branch_id || selectedBranchId || null
      };

      const res = await vendorsApi.create(payload);
      toast.success(res.data.message || 'Vendor created successfully');

      fetchVendors();
      fetchStats();

      if (andAddNew) {
        setFormData({
          ...initialFormData,
          company_id: selectedCompanyId || user?.company_id,
          branch_id: selectedBranchId || ''
        });
      } else {
        setShowCreateModal(false);
        setFormData(initialFormData);
      }
    } catch (error) {
      console.error('Error creating vendor:', error);
      toast.error(error.response?.data?.message || 'Failed to create vendor');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Open
  const handleOpenEdit = (vendor) => {
    setActiveVendor(vendor);
    setEditFormData({
      company_id: vendor.company_id || '',
      branch_id: vendor.branch_id || '',
      vendor_code: vendor.vendor_code || '',
      vendor_name: vendor.vendor_name || '',
      gstin: vendor.gstin || '',
      pan: vendor.pan || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      pincode: vendor.pincode || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      bank_account_no: vendor.bank_account_no || '',
      ifsc_code: vendor.ifsc_code || '',
      bank_name: vendor.bank_name || '',
      payment_terms: vendor.payment_terms || 'Net 30 Days',
      opening_balance: vendor.opening_balance || '0.00',
      status: vendor.status || 'Active',
      is_active: vendor.is_active !== undefined ? vendor.is_active : true
    });
    setShowEditModal(true);
  };

  // Handle Update Vendor
  const handleUpdateVendor = async () => {
    if (!editFormData.vendor_name.trim()) {
      toast.error('Vendor Name is required');
      return;
    }
    if (!editFormData.address.trim() || !editFormData.city.trim() || !editFormData.state.trim()) {
      toast.error('Address, City, and State are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await vendorsApi.update(activeVendor.vendor_id, editFormData);
      toast.success(res.data.message || 'Vendor updated successfully');
      setShowEditModal(false);
      setActiveVendor(null);
      fetchVendors();
      fetchStats();
    } catch (error) {
      console.error('Error updating vendor:', error);
      toast.error(error.response?.data?.message || 'Failed to update vendor');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Toggle Active/Deactivate
  const handleToggleStatus = async (vendor) => {
    try {
      if (vendor.is_active && vendor.status === 'Active') {
        await vendorsApi.delete(vendor.vendor_id);
        toast.success(`Vendor ${vendor.vendor_name} deactivated`);
      } else {
        await vendorsApi.restore(vendor.vendor_id);
        toast.success(`Vendor ${vendor.vendor_name} activated`);
      }
      fetchVendors();
      fetchStats();
    } catch (error) {
      toast.error('Failed to change vendor status');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (vendorsList.length === 0) {
      toast.error('No vendor records to export');
      return;
    }

    const headers = [
      'Vendor ID', 'Vendor Code', 'Vendor Name', 'Branch', 'GSTIN', 'PAN',
      'Phone', 'Email', 'City', 'State', 'Payment Terms', 'Opening Balance', 'Status'
    ];

    const csvRows = [
      headers.join(','),
      ...vendorsList.map(v => [
        v.vendor_id,
        `"${v.vendor_code || ''}"`,
        `"${v.vendor_name || ''}"`,
        `"${v.branch_name || 'All Branches'}"`,
        `"${v.gstin || ''}"`,
        `"${v.pan || ''}"`,
        `"${v.phone || ''}"`,
        `"${v.email || ''}"`,
        `"${v.city || ''}"`,
        `"${v.state || ''}"`,
        `"${v.payment_terms || ''}"`,
        v.opening_balance || '0.00',
        `"${v.status || ''}"`
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vendor_Master_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Vendor list exported as CSV');
  };

  // Filtered List
  const filteredVendors = useMemo(() => {
    return vendorsList.filter(v => {
      const matchesSearch = !searchTerm || 
        v.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.vendor_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.gstin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.pan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.phone?.includes(searchTerm);

      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vendorsList, searchTerm, statusFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Master Data</span>
            <ChevronRight size={12} />
            <span className="text-blue-600">Vendor Master</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="text-blue-600" size={28} />
            VENDOR MASTER
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Maintains authoritative master records of all suppliers and vendors with multi-branch linking.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => { fetchVendors(); fetchStats(); }}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loadingVendors ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setFormData({
                ...initialFormData,
                company_id: selectedCompanyId || user?.company_id,
                branch_id: selectedBranchId || ''
              });
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg flex items-center gap-1.5 transition-all"
          >
            <Plus size={15} />
            <span>Add New Vendor</span>
          </button>
        </div>
      </div>

      {/* Scope Selectors Bar */}
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
                <option key={c.company_id} value={c.company_id}>{c.company_name} ({c.company_code})</option>
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
              <option value="all">All Branches (Global)</option>
              {branchesList.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name} ({b.branch_code})</option>
              ))}
            </select>
          </div>
        )}

        {isBranchAdmin && (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
            <Building2 size={14} className="text-blue-600" />
            <span>Branch: <strong className="text-slate-900">{user?.branch_name || 'My Branch'}</strong></span>
          </div>
        )}
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Vendors</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total_vendors || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Truck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Suppliers</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active_vendors || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inactive / Blacklisted</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">
              {(parseInt(stats.inactive_vendors, 10) || 0) + (parseInt(stats.blacklisted_vendors, 10) || 0)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <ShieldAlert size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Opening Balance</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              ₹ {parseFloat(stats.total_opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by vendor name, code, GSTIN, PAN, city, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
              <option value="Blacklisted">Blacklisted</option>
            </select>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 self-end md:self-auto bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
              viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Table View"
          >
            <TableIcon size={14} />
            <span className="hidden sm:inline">Table</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
              viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Grid View"
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">Cards</span>
          </button>
        </div>
      </div>

      {/* Main Vendor Content */}
      {loadingVendors ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <RefreshCw className="animate-spin text-blue-600 mx-auto mb-3" size={28} />
          <p className="text-sm font-semibold text-slate-700">Loading vendor records...</p>
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Truck size={30} />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Vendors Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            {searchTerm || statusFilter !== 'all'
              ? 'No records match your search query or filter. Try clearing the filter.'
              : 'Start by creating your first vendor master record.'}
          </p>
          <button
            onClick={() => {
              setFormData({
                ...initialFormData,
                company_id: selectedCompanyId || user?.company_id,
                branch_id: selectedBranchId || ''
              });
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Create Vendor</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Vendor Code / Name</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Statutory (GST / PAN)</th>
                  <th className="py-3 px-4">Contact & Location</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4 text-right">Opening Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.vendor_id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Code & Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {vendor.vendor_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{vendor.vendor_name}</span>
                            <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                              {vendor.vendor_code || `VND-${vendor.vendor_id}`}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">ID: {vendor.vendor_id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {vendor.branch_name ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          <Building2 size={11} />
                          {vendor.branch_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">All Branches</span>
                      )}
                    </td>

                    {/* Statutory GST / PAN */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        {vendor.gstin ? (
                          <span className="font-mono text-[11px] text-slate-700">
                            GST: <strong className="text-slate-900">{vendor.gstin}</strong>
                          </span>
                        ) : (
                          <span className="text-[10.5px] text-slate-400">No GSTIN</span>
                        )}
                        {vendor.pan && (
                          <span className="font-mono text-[10.5px] text-slate-500">
                            PAN: {vendor.pan}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Contact & Location */}
                    <td className="py-3 px-4">
                      <div className="text-slate-700 font-medium">
                        {vendor.city}, {vendor.state}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        {vendor.phone && <span className="flex items-center gap-1"><Phone size={10} />{vendor.phone}</span>}
                        {vendor.email && <span className="flex items-center gap-1"><Mail size={10} />{vendor.email}</span>}
                      </div>
                    </td>

                    {/* Payment Terms */}
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {vendor.payment_terms || 'Net 30 Days'}
                    </td>

                    {/* Opening Balance */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹ {parseFloat(vendor.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_COLORS[vendor.status] || STATUS_COLORS['Active']}`}>
                        {vendor.status || (vendor.is_active ? 'Active' : 'Inactive')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setActiveVendor(vendor); setShowDetailsModal(true); }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                          title="View Full Profile"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(vendor)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all"
                          title="Edit Vendor"
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(vendor)}
                          className={`p-1.5 rounded-md transition-all ${
                            vendor.is_active && vendor.status === 'Active'
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={vendor.is_active && vendor.status === 'Active' ? 'Deactivate' : 'Activate'}
                        >
                          {vendor.is_active && vendor.status === 'Active' ? <XCircle size={15} /> : <RotateCcw size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50/70 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>Showing {filteredVendors.length} of {vendorsList.length} vendors</span>
          </div>
        </div>
      ) : (
        /* Grid / Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <div key={vendor.vendor_id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                      {vendor.vendor_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">{vendor.vendor_name}</h4>
                      <span className="font-mono text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 inline-block mt-0.5">
                        {vendor.vendor_code || `VND-${vendor.vendor_id}`}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border shrink-0 ${STATUS_COLORS[vendor.status] || STATUS_COLORS['Active']}`}>
                    {vendor.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Branch:</span>
                    <span className="font-semibold text-slate-800">{vendor.branch_name || 'All Branches'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">GSTIN:</span>
                    <span className="font-mono font-semibold text-slate-800">{vendor.gstin || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Location:</span>
                    <span className="font-medium text-slate-800">{vendor.city}, {vendor.state}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Terms:</span>
                    <span className="font-medium text-slate-800">{vendor.payment_terms || 'Net 30 Days'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Opening Balance:</span>
                    <span className="font-bold text-slate-900">₹ {parseFloat(vendor.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                <button
                  onClick={() => { setActiveVendor(vendor); setShowDetailsModal(true); }}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
                >
                  <Eye size={13} />
                  <span>Details</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(vendor)}
                    className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(vendor)}
                    className={`p-1.5 rounded-lg transition-all ${
                      vendor.is_active && vendor.status === 'Active'
                        ? 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                        : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                    title={vendor.is_active && vendor.status === 'Active' ? 'Deactivate' : 'Activate'}
                  >
                    {vendor.is_active && vendor.status === 'Active' ? <XCircle size={14} /> : <RotateCcw size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CREATE VENDOR MODAL */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Truck size={22} className="text-blue-200" />
                <div>
                  <h3 className="text-base font-bold leading-tight">Create Vendor Master Record</h3>
                  <p className="text-xs text-blue-100">Add a new authoritative supplier / vendor to the master directory</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
              {/* Section 1: Basic & Branch Scope */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building2 size={14} className="text-blue-600" />
                  General & Scope Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vendor Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Industrial Supplies Pvt Ltd"
                      value={formData.vendor_name}
                      onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vendor Code <span className="text-slate-400 font-normal">(System or Custom)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Auto-generated if blank"
                      value={formData.vendor_code}
                      onChange={(e) => setFormData({ ...formData, vendor_code: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Branch ID / Branch Scope
                    </label>
                    <select
                      value={formData.branch_id}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    >
                      <option value="">All Branches (Company-wide)</option>
                      {branchesList.map(b => (
                        <option key={b.branch_id} value={b.branch_id}>{b.branch_name} ({b.branch_code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Status <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Blacklisted">Blacklisted</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    >
                      {PAYMENT_TERMS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Statutory Tax Data */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-blue-600" />
                  Statutory & Tax Identification
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      GSTIN <span className="text-slate-400 font-normal">(15 Characters)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="e.g. 27AABCA1234F1Z5"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 uppercase font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      PAN <span className="text-slate-400 font-normal">(10 Characters)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. AABCA1234F"
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 uppercase font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Contact & Address */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin size={14} className="text-blue-600" />
                  Address & Contact Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Address (Registered / Operating) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Plot/Shop No, Street, Industrial Area..."
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pune"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      State <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    >
                      {INDIAN_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. 411014"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="accounts@vendor.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Banking & Financial Details */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-blue-600" />
                  Banking & Ledger Balance
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank Ltd"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bank Account No
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 50200012345678"
                      value={formData.bank_account_no}
                      onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={formData.ifsc_code}
                      onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Opening Balance (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-all"
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                onClick={() => handleCreateVendor(true)}
                disabled={submitting}
                className="px-4 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-all"
              >
                Save & Add New
              </button>

              <button
                onClick={() => handleCreateVendor(false)}
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition-all"
              >
                {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDIT VENDOR MODAL */}
      {/* ========================================================================= */}
      {showEditModal && activeVendor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Edit3 size={20} className="text-amber-200" />
                <div>
                  <h3 className="text-base font-bold leading-tight">Edit Vendor Details</h3>
                  <p className="text-xs text-amber-100">Updating master profile for #{activeVendor.vendor_code || activeVendor.vendor_id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.vendor_name}
                    onChange={(e) => setEditFormData({ ...editFormData, vendor_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor Code
                  </label>
                  <input
                    type="text"
                    value={editFormData.vendor_code}
                    onChange={(e) => setEditFormData({ ...editFormData, vendor_code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 uppercase font-mono focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch Scope
                  </label>
                  <select
                    value={editFormData.branch_id || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, branch_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                  >
                    <option value="">All Branches</option>
                    {branchesList.map(b => (
                      <option key={b.branch_id} value={b.branch_id}>{b.branch_name} ({b.branch_code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Blacklisted">Blacklisted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={editFormData.payment_terms}
                    onChange={(e) => setEditFormData({ ...editFormData, payment_terms: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {PAYMENT_TERMS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={editFormData.gstin}
                    onChange={(e) => setEditFormData({ ...editFormData, gstin: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 uppercase font-mono focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PAN
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={editFormData.pan}
                    onChange={(e) => setEditFormData({ ...editFormData, pan: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 uppercase font-mono focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.opening_balance}
                    onChange={(e) => setEditFormData({ ...editFormData, opening_balance: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Address <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editFormData.state}
                    onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {INDIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={editFormData.pincode}
                    onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.bank_name}
                    onChange={(e) => setEditFormData({ ...editFormData, bank_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Account No
                  </label>
                  <input
                    type="text"
                    value={editFormData.bank_account_no}
                    onChange={(e) => setEditFormData({ ...editFormData, bank_account_no: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={editFormData.ifsc_code}
                    onChange={(e) => setEditFormData({ ...editFormData, ifsc_code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono uppercase focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateVendor}
                disabled={submitting}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition-all"
              >
                {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                <span>Update Vendor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DETAILS MODAL */}
      {/* ========================================================================= */}
      {showDetailsModal && activeVendor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Truck size={22} className="text-blue-400" />
                <div>
                  <h3 className="text-base font-bold leading-tight">{activeVendor.vendor_name}</h3>
                  <p className="text-xs text-slate-400">Master Record #{activeVendor.vendor_code || activeVendor.vendor_id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {/* Top Banner Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <p className="text-slate-400 text-[11px]">Status</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border mt-0.5 ${STATUS_COLORS[activeVendor.status] || STATUS_COLORS['Active']}`}>
                    {activeVendor.status}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">Branch Scope</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{activeVendor.branch_name || 'All Branches'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">Payment Terms</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{activeVendor.payment_terms || 'Net 30 Days'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">Opening Balance</p>
                  <p className="font-bold text-slate-900 mt-0.5">₹ {parseFloat(activeVendor.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {/* Statutory */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-800 mb-2.5 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-blue-600" />
                  Statutory & Tax
                </h4>
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10.5px] text-slate-400 block font-sans">GST Identification (GSTIN)</span>
                      <strong className="text-slate-900 text-xs">{activeVendor.gstin || 'NOT PROVIDED'}</strong>
                    </div>
                    {activeVendor.gstin && (
                      <button onClick={() => copyToClipboard(activeVendor.gstin, 'GSTIN')} className="text-slate-400 hover:text-blue-600">
                        <Copy size={13} />
                      </button>
                    )}
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10.5px] text-slate-400 block font-sans">PAN Number</span>
                      <strong className="text-slate-900 text-xs">{activeVendor.pan || 'NOT PROVIDED'}</strong>
                    </div>
                    {activeVendor.pan && (
                      <button onClick={() => copyToClipboard(activeVendor.pan, 'PAN')} className="text-slate-400 hover:text-blue-600">
                        <Copy size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Location & Address */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-800 mb-2.5 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <MapPin size={14} className="text-blue-600" />
                  Address & Contact Details
                </h4>
                <p className="text-slate-700 font-medium leading-relaxed mb-2">{activeVendor.address}</p>
                <div className="grid grid-cols-3 gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div><strong>City:</strong> {activeVendor.city}</div>
                  <div><strong>State:</strong> {activeVendor.state}</div>
                  <div><strong>Pincode:</strong> {activeVendor.pincode || 'N/A'}</div>
                  <div><strong>Phone:</strong> {activeVendor.phone || 'N/A'}</div>
                  <div className="col-span-2"><strong>Email:</strong> {activeVendor.email || 'N/A'}</div>
                </div>
              </div>

              {/* Banking */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-800 mb-2.5 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <CreditCard size={14} className="text-blue-600" />
                  Bank Account Information
                </h4>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-xs">
                  <div>
                    <span className="text-[10.5px] text-slate-400 block font-sans">Bank Name</span>
                    <strong className="text-slate-900 font-sans">{activeVendor.bank_name || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-slate-400 block font-sans">Account No</span>
                    <strong className="text-slate-900">{activeVendor.bank_account_no || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-slate-400 block font-sans">IFSC Code</span>
                    <strong className="text-slate-900">{activeVendor.ifsc_code || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* Audit Timestamps */}
              <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                <span>Created At: <strong>{new Date(activeVendor.created_at).toLocaleString()}</strong></span>
                <span>Updated At: <strong>{activeVendor.updated_at ? new Date(activeVendor.updated_at).toLocaleString() : 'N/A'}</strong></span>
                {activeVendor.created_by_name && <span>Created By: <strong>{activeVendor.created_by_name}</strong></span>}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleOpenEdit(activeVendor);
                }}
                className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-bold text-xs rounded-lg flex items-center gap-1.5"
              >
                <Edit3 size={13} />
                <span>Edit Vendor</span>
              </button>

              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg"
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

export default VendorMaster;
