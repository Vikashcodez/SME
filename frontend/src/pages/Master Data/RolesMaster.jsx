import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { roles as rolesApi, branches as branchesApi, companies as companiesApi } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  RotateCcw, 
  Eye, 
  X, 
  Check, 
  Building, 
  Briefcase, 
  Calendar, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Filter, 
  Layers, 
  ChevronRight,
  UserCheck,
  CheckCircle2,
  FileText,
  Sparkles,
  Info
} from 'lucide-react';

const COMMON_ROLE_PRESETS = [
  { name: 'Store Manager', desc: 'Overall branch supervision, inventory approvals, and team management' },
  { name: 'Assistant Manager', desc: 'Assists store manager in daily branch operations and customer handling' },
  { name: 'Sales Executive', desc: 'Handles direct sales, lead generation, and customer client relations' },
  { name: 'Inventory Specialist', desc: 'Manages warehouse stocks, replenishment, incoming orders and audits' },
  { name: 'Accountant', desc: 'Handles daily book-keeping, branch billing, expenses, and invoices' },
  { name: 'Cashier / POS Operator', desc: 'Processes point-of-sale checkout transactions and daily cash registers' },
  { name: 'Quality Controller', desc: 'Inspects outgoing shipments, inventory standards, and compliance' },
  { name: 'Field Executive', desc: 'Handles field deliveries, on-site service support, and local operations' }
];

const RolesMaster = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();

  // Selected scope state
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');
  
  // Lists
  const [companiesList, setCompaniesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [rolesList, setRolesList] = useState([]);

  // Loading states
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeRole, setActiveRole] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    company_id: user?.company_id || '',
    branch_id: user?.branch_id || '',
    role_name: '',
    role_description: '',
    is_active: true
  });

  const [editFormData, setEditFormData] = useState({
    company_id: '',
    branch_id: '',
    role_name: '',
    role_description: '',
    is_active: true
  });

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

  // Fetch Roles when branch changes or is selected
  useEffect(() => {
    if (selectedBranchId) {
      fetchRoles(selectedBranchId);
    } else {
      setRolesList([]);
    }
  }, [selectedBranchId]);

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
      const list = response.data.data || [];
      setBranchesList(list);

      // If user is not locked to a branch, select the first branch if current isn't valid
      if (!user?.branch_id) {
        const isCurrentBranchValid = list.some(b => String(b.branch_id) === String(selectedBranchId));
        if (!isCurrentBranchValid) {
          setSelectedBranchId(list.length > 0 ? list[0].branch_id : '');
        }
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      toast.error('Failed to load branches for this company');
      setBranchesList([]);
      setSelectedBranchId('');
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchRoles = async (branchId) => {
    if (!branchId) return;
    setLoadingRoles(true);
    try {
      const response = await rolesApi.getByBranch(branchId);
      if (response.data?.success) {
        setRolesList(response.data.data || []);
      } else {
        setRolesList([]);
      }
    } catch (error) {
      // 404 means no roles exist yet for this branch
      if (error.response?.status === 404) {
        setRolesList([]);
      } else {
        console.error('Failed to fetch roles:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch roles');
      }
    } finally {
      setLoadingRoles(false);
    }
  };

  // Create Role Handler
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!formData.role_name.trim()) {
      toast.error('Role name is required');
      return;
    }

    const payload = {
      company_id: parseInt(selectedCompanyId || user?.company_id),
      branch_id: parseInt(formData.branch_id || selectedBranchId),
      role_name: formData.role_name.trim(),
      role_description: formData.role_description.trim() || null,
      is_active: formData.is_active
    };

    if (!payload.company_id || !payload.branch_id) {
      toast.error('Company ID and Branch ID are required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await rolesApi.create(payload);
      if (response.data.success) {
        toast.success(response.data.message || 'Role created successfully!');
        setShowCreateModal(false);
        resetCreateForm();
        fetchRoles(payload.branch_id);
      }
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error(error.response?.data?.message || 'Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Role Handler
  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!activeRole) return;
    if (!editFormData.role_name.trim()) {
      toast.error('Role name is required');
      return;
    }

    const payload = {
      company_id: parseInt(editFormData.company_id || selectedCompanyId || user?.company_id),
      branch_id: parseInt(editFormData.branch_id || selectedBranchId),
      role_name: editFormData.role_name.trim(),
      role_description: editFormData.role_description.trim() || null,
      is_active: editFormData.is_active
    };

    setSubmitting(true);
    try {
      const response = await rolesApi.update(activeRole.role_id, payload);
      if (response.data.success) {
        toast.success(response.data.message || 'Role updated successfully!');
        setShowEditModal(false);
        setActiveRole(null);
        fetchRoles(payload.branch_id);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(error.response?.data?.message || 'Failed to update role');
    } finally {
      setSubmitting(false);
    }
  };

  // Soft Delete Handler
  const handleSoftDeleteRole = async () => {
    if (!activeRole) return;
    setSubmitting(true);
    try {
      const response = await rolesApi.softDelete(activeRole.role_id);
      if (response.data.success) {
        toast.success(response.data.message || 'Role deactivated successfully');
        setShowDeleteModal(false);
        setActiveRole(null);
        if (selectedBranchId) {
          fetchRoles(selectedBranchId);
        }
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error(error.response?.data?.message || 'Failed to deactivate role');
    } finally {
      setSubmitting(false);
    }
  };

  // Restore Role Handler
  const handleRestoreRole = async (role) => {
    try {
      const response = await rolesApi.restore(role.role_id);
      if (response.data.success) {
        toast.success(response.data.message || 'Role restored to active successfully!');
        if (selectedBranchId) {
          fetchRoles(selectedBranchId);
        }
      }
    } catch (error) {
      console.error('Error restoring role:', error);
      toast.error(error.response?.data?.message || 'Failed to restore role');
    }
  };

  const resetCreateForm = () => {
    setFormData({
      company_id: selectedCompanyId || user?.company_id || '',
      branch_id: selectedBranchId || user?.branch_id || '',
      role_name: '',
      role_description: '',
      is_active: true
    });
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const openEditModal = (role) => {
    setActiveRole(role);
    setEditFormData({
      company_id: role.company_id || selectedCompanyId || user?.company_id || '',
      branch_id: role.branch_id || selectedBranchId || '',
      role_name: role.role_name || '',
      role_description: role.role_description || '',
      is_active: role.is_active !== undefined ? role.is_active : true
    });
    setShowEditModal(true);
  };

  const openDetailsModal = (role) => {
    setActiveRole(role);
    setShowDetailsModal(true);
  };

  const openDeleteModal = (role) => {
    setActiveRole(role);
    setShowDeleteModal(true);
  };

  const copyToClipboard = (text, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} to clipboard!`, { id: 'clipboard-toast' });
  };

  const applyPreset = (preset, isEdit = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        role_name: preset.name,
        role_description: preset.desc
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        role_name: preset.name,
        role_description: preset.desc
      }));
    }
  };

  // Filtered roles based on search and status
  const filteredRoles = useMemo(() => {
    return rolesList.filter(role => {
      // Search matching
      const matchesSearch = 
        role.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (role.role_description && role.role_description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        String(role.role_id).includes(searchTerm);

      // Status matching
      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? role.is_active === true :
        role.is_active === false;

      return matchesSearch && matchesStatus;
    });
  }, [rolesList, searchTerm, statusFilter]);

  // Statistics
  const totalRolesCount = rolesList.length;
  const activeRolesCount = rolesList.filter(r => r.is_active === true).length;
  const inactiveRolesCount = rolesList.filter(r => r.is_active === false).length;

  const currentBranchObj = branchesList.find(b => String(b.branch_id) === String(selectedBranchId));

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#111827] font-sans antialiased p-6 sm:p-8">
      {/* Top Header & Breadcrumbs */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              <span>Master Data</span>
              <ChevronRight size={12} className="text-gray-400" />
              <span className="text-blue-600">Roles Management</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
              <Shield className="text-blue-600" size={26} />
              Roles Master
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure branch-level user roles, functional designations, and access profiles.
            </p>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => fetchRoles(selectedBranchId)}
              disabled={loadingRoles || !selectedBranchId}
              className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reload role records"
            >
              <RefreshCw size={15} className={loadingRoles ? 'animate-spin text-blue-600' : 'text-gray-500'} />
              <span>Refresh</span>
            </button>

            <button
              onClick={openCreateModal}
              disabled={!selectedBranchId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              <span>Add New Role</span>
            </button>
          </div>
        </div>

        {/* Scope Selector Card (Company / Branch selector) */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            
            {/* Super Admin Company Selector */}
            {isSuperAdmin && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building size={14} className="text-gray-400" />
                  Select Company
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="" disabled>Choose Company</option>
                  {companiesList.map(c => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name} ({c.company_code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Branch Selector */}
            <div className={isSuperAdmin ? 'md:col-span-2' : isCompanyAdmin ? 'md:col-span-2' : 'md:col-span-3'}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase size={14} className="text-gray-400" />
                  {isBranchAdmin ? 'Your Assigned Branch' : 'Active Branch Scope'}
                </label>
                {currentBranchObj && (
                  <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-medium inline-block">
                    Code: {currentBranchObj.branch_code}
                  </span>
                )}
              </div>

              {isBranchAdmin ? (
                <div className="px-3.5 py-2.5 bg-blue-50/70 border border-blue-100 rounded-lg text-sm font-semibold text-blue-900 flex items-center justify-between">
                  <span>{user?.branch_name || currentBranchObj?.branch_name || `Branch #${selectedBranchId}`}</span>
                  <span className="text-xs font-normal text-blue-600">Locked to your logged-in branch</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    disabled={loadingBranches || branchesList.length === 0}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                  >
                    {branchesList.length === 0 ? (
                      <option value="">No branches found for this company</option>
                    ) : (
                      branchesList.map(b => (
                        <option key={b.branch_id} value={b.branch_id}>
                          {b.branch_name} ({b.branch_code}) {b.address ? `• ${b.address}` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
            </div>

            {/* Context Summary for Company Admin */}
            {isCompanyAdmin && (
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs text-gray-600 flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {user?.company_name ? user.company_name.charAt(0) : 'C'}
                </div>
                <div className="truncate">
                  <div className="font-semibold text-gray-900 truncate">{user?.company_name || 'Your Company'}</div>
                  <div className="text-gray-500 truncate">{branchesList.length} total branches registered</div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Stats Metrics Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white border border-gray-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Roles</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalRolesCount}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Defined for this branch</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers size={20} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Roles</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{activeRolesCount}</h3>
              <p className="text-xs text-emerald-600/70 mt-0.5">Ready for assignment</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Archived / Inactive</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">{inactiveRolesCount}</h3>
              <p className="text-xs text-amber-600/70 mt-0.5">Soft-deleted records</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert size={20} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Branch Scope</p>
              <h3 className="text-base font-bold text-gray-900 mt-1 truncate max-w-[140px]" title={currentBranchObj?.branch_name}>
                {currentBranchObj?.branch_name || 'No Branch Selected'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {currentBranchObj ? `Code: ${currentBranchObj.branch_code}` : 'Select a branch'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building size={20} />
            </div>
          </div>

        </div>

        {/* Toolbar & Filter Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by role name, description, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-lg border border-gray-200/60 self-start md:self-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({totalRolesCount})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'active'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-gray-600 hover:text-emerald-700'
              }`}
            >
              Active ({activeRolesCount})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-gray-600 hover:text-amber-700'
              }`}
            >
              Inactive ({inactiveRolesCount})
            </button>
          </div>

        </div>

        {/* Roles Table Section */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          
          {loadingRoles ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-9 w-9 border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-sm font-medium text-gray-500">Loading branch role records...</p>
            </div>
          ) : !selectedBranchId ? (
            <div className="p-12 text-center">
              <Building className="mx-auto text-gray-300 mb-3" size={48} />
              <h3 className="text-base font-semibold text-gray-900">No Branch Selected</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                Please choose a branch above to view and configure its roles.
              </p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Shield size={28} />
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                {searchTerm || statusFilter !== 'all' ? 'No matching roles found' : 'No roles created yet'}
              </h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search criteria or filter tags.'
                  : `There are currently no custom roles created for ${currentBranchObj?.branch_name || 'this branch'}. Create your first role to start defining team responsibilities.`}
              </p>
              
              {!searchTerm && statusFilter === 'all' && (
                <div className="mt-5">
                  <button
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all inline-flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Create First Role
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Role Title & ID
                    </th>
                    <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Description & Responsibilities
                    </th>
                    <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Branch & Company
                    </th>
                    <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Created Date
                    </th>
                    <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRoles.map((role) => {
                    const isActive = role.is_active === true;
                    return (
                      <tr 
                        key={role.role_id} 
                        className={`hover:bg-gray-50/80 transition-colors ${!isActive ? 'bg-gray-50/30' : ''}`}
                      >
                        {/* Role Name & ID */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              isActive 
                                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs' 
                                : 'bg-gray-200 text-gray-500'
                            }`}>
                              <Shield size={16} />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                                <span>{role.role_name}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] font-mono text-gray-400">
                                  ID: #{role.role_id}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(role.role_id, 'Role ID copied')}
                                  className="text-gray-300 hover:text-gray-500 transition-colors"
                                  title="Copy Role ID"
                                >
                                  <Copy size={11} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-5 max-w-xs md:max-w-md">
                          {role.role_description ? (
                            <p className="text-xs text-gray-600 line-clamp-2" title={role.role_description}>
                              {role.role_description}
                            </p>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No description provided</span>
                          )}
                        </td>

                        {/* Branch & Company */}
                        <td className="py-3.5 px-5 hidden md:table-cell">
                          <div className="text-xs font-medium text-gray-800">
                            {role.branch_name || currentBranchObj?.branch_name || `Branch #${role.branch_id}`}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate">
                            {role.company_name || user?.company_name || `Company #${role.company_id}`}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-5">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-5 hidden lg:table-cell">
                          <div className="text-xs text-gray-600 font-medium">
                            {role.created_at ? new Date(role.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'N/A'}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {role.created_at ? new Date(role.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openDetailsModal(role)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Role Details"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              onClick={() => openEditModal(role)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Role"
                            >
                              <Edit size={15} />
                            </button>

                            {isActive ? (
                              <button
                                onClick={() => openDeleteModal(role)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Deactivate / Soft Delete Role"
                              >
                                <Trash2 size={15} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRestoreRole(role)}
                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Restore / Activate Role"
                              >
                                <RotateCcw size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer count information */}
          {!loadingRoles && filteredRoles.length > 0 && (
            <div className="py-3 px-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Showing {filteredRoles.length} of {rolesList.length} total roles</span>
              <span className="font-medium">Branch: {currentBranchObj?.branch_name || selectedBranchId}</span>
            </div>
          )}

        </div>

      </div>

      {/* CREATE ROLE MODAL */}
      {showCreateModal && (
        <Modal 
          title="Create New Role" 
          subtitle="Define a new operational role with functional permissions"
          onClose={() => setShowCreateModal(false)}
        >
          <form onSubmit={handleCreateRole} className="space-y-4">
            
            {/* Presets Quick Picker */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                Quick Role Presets
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-gray-50 border border-gray-200 rounded-lg">
                {COMMON_ROLE_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p, false)}
                    className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 rounded-md transition-colors text-gray-700 font-medium"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Senior Inventory Supervisor"
                value={formData.role_name}
                onChange={(e) => setFormData(prev => ({ ...prev, role_name: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Role Description / Responsibilities
              </label>
              <textarea
                rows={3}
                placeholder="Describe the duties, responsibilities, and access profile for this role..."
                value={formData.role_description}
                onChange={(e) => setFormData(prev => ({ ...prev, role_description: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none"
              />
            </div>

            {/* Target Branch & Company */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200/80 text-xs">
              <div>
                <span className="text-gray-400 block font-semibold uppercase text-[10px]">Company</span>
                <span className="font-semibold text-gray-800 truncate block mt-0.5">
                  {user?.company_name || `Company #${selectedCompanyId}`}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold uppercase text-[10px]">Target Branch</span>
                <span className="font-semibold text-gray-800 truncate block mt-0.5">
                  {currentBranchObj?.branch_name || `Branch #${selectedBranchId}`}
                </span>
              </div>
            </div>

            {/* Status Switch */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200/80">
              <div>
                <span className="text-xs font-semibold text-gray-800 block">Active Status</span>
                <span className="text-[11px] text-gray-500 block">Make this role immediately active for employee assignments</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Submit & Cancel */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Create Role</span>
                )}
              </button>
            </div>

          </form>
        </Modal>
      )}

      {/* EDIT ROLE MODAL */}
      {showEditModal && activeRole && (
        <Modal 
          title="Edit Role" 
          subtitle={`Updating role #${activeRole.role_id} - ${activeRole.role_name}`}
          onClose={() => setShowEditModal(false)}
        >
          <form onSubmit={handleUpdateRole} className="space-y-4">
            
            {/* Presets Quick Picker */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                Change Preset Template
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-gray-50 border border-gray-200 rounded-lg">
                {COMMON_ROLE_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p, true)}
                    className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 rounded-md transition-colors text-gray-700 font-medium"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editFormData.role_name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, role_name: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Role Description / Responsibilities
              </label>
              <textarea
                rows={3}
                value={editFormData.role_description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, role_description: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none"
              />
            </div>

            {/* Status Switch */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200/80">
              <div>
                <span className="text-xs font-semibold text-gray-800 block">Active Status</span>
                <span className="text-[11px] text-gray-500 block">Enable or disable this role</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Submit & Cancel */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>

          </form>
        </Modal>
      )}

      {/* DETAILS VIEW MODAL */}
      {showDetailsModal && activeRole && (
        <Modal 
          title="Role Overview" 
          subtitle="Detailed specifications of the selected role"
          onClose={() => setShowDetailsModal(false)}
        >
          <div className="space-y-4">
            
            {/* Header Badge Card */}
            <div className="flex items-center gap-3.5 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                <Shield size={24} />
              </div>
              <div className="truncate">
                <h3 className="text-base font-bold text-gray-900 truncate">{activeRole.role_name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-gray-500">ID: #{activeRole.role_id}</span>
                  <span className="text-gray-300">•</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    activeRole.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {activeRole.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Attributes List */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 space-y-3 text-xs">
              
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-gray-200/60">
                <span className="text-gray-500 uppercase tracking-wider font-semibold">Company</span>
                <span className="font-semibold text-gray-900 text-right">
                  {activeRole.company_name || user?.company_name || `ID: ${activeRole.company_id}`}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-gray-200/60">
                <span className="text-gray-500 uppercase tracking-wider font-semibold">Branch</span>
                <span className="font-semibold text-gray-900 text-right">
                  {activeRole.branch_name || currentBranchObj?.branch_name || `ID: ${activeRole.branch_id}`}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-gray-200/60">
                <span className="text-gray-500 uppercase tracking-wider font-semibold">Created Timestamp</span>
                <span className="font-medium text-gray-800 text-right">
                  {activeRole.created_at ? new Date(activeRole.created_at).toLocaleString() : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                  Description / Responsibilities
                </span>
                <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-200 text-xs leading-relaxed">
                  {activeRole.role_description || 'No specific description documented for this role.'}
                </p>
              </div>

            </div>

            {/* Quick Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  openEditModal(activeRole);
                }}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Edit size={15} />
                <span>Edit Role</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </Modal>
      )}

      {/* SOFT DELETE CONFIRMATION MODAL */}
      {showDeleteModal && activeRole && (
        <Modal 
          title="Deactivate Role" 
          subtitle="Confirm soft-deactivation of this role"
          onClose={() => setShowDeleteModal(false)}
        >
          <div className="space-y-4">
            
            <div className="p-4 bg-red-50/80 border border-red-100 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg flex-shrink-0">
                <AlertCircle size={20} />
              </div>
              <div className="text-xs text-red-900 leading-relaxed">
                <p className="font-semibold text-sm text-red-950 mb-1">
                  Deactivate "{activeRole.role_name}"?
                </p>
                This will soft-delete the role by marking it inactive. Employees currently mapped to this role may be impacted. You can restore this role at any time from the inactive filter.
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSoftDeleteRole}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Deactivating...</span>
                  </>
                ) : (
                  <span>Deactivate Role</span>
                )}
              </button>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
};

// Reusable Modal Component
const Modal = ({ children, onClose, title, subtitle }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
};

export default RolesMaster;
