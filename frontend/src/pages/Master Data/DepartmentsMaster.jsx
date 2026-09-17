import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departments as departmentsApi, branches as branchesApi, companies as companiesApi } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Search, 
  Edit3, 
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
  Sparkles,
  Info,
  Users,
  LayoutGrid,
  Table as TableIcon,
  CheckSquare,
  Square,
  Tag,
  ShieldCheck
} from 'lucide-react';

const COMMON_DEPARTMENT_PRESETS = [
  { name: 'Human Resources (HR)', desc: 'Talent acquisition, employee relations, payroll support, and HR policies' },
  { name: 'Sales & Business Development', desc: 'Direct client sales, accounts acquisition, and revenue growth initiatives' },
  { name: 'Marketing & Communications', desc: 'Brand promotion, digital marketing, lead campaigns, and public relations' },
  { name: 'Finance & Accounts', desc: 'Financial planning, accounting, invoicing, tax compliance, and auditing' },
  { name: 'Operations & Logistics', desc: 'Supply chain management, branch daily operations, fulfillment, and transport' },
  { name: 'Information Technology (IT)', desc: 'Systems administration, technical support, network security, and infrastructure' },
  { name: 'Customer Support & Success', desc: 'Client onboarding, helpdesk ticketing, customer care, and retention' },
  { name: 'Quality Assurance & Compliance', desc: 'Quality control, audit standards, process verification, and regulatory compliance' },
  { name: 'Procurement & Inventory', desc: 'Vendor management, purchasing, stock monitoring, and store supplies' },
  { name: 'Administration & Facilities', desc: 'Office maintenance, security, front desk, and general branch facilities' },
  { name: 'Research & Development (R&D)', desc: 'Product innovation, prototyping, market research, and process testing' },
  { name: 'Legal & Secretarial', desc: 'Contracts, corporate governance, intellectual property, and legal advisory' }
];

const DepartmentsMaster = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();

  // Scope selection state
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');
  
  // Lists
  const [companiesList, setCompaniesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  // Loading states
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters & View
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    company_id: user?.company_id || '',
    branch_id: user?.branch_id || '',
    department_name: '',
    department_description: '',
    is_active: true
  });

  const [editFormData, setEditFormData] = useState({
    company_id: '',
    branch_id: '',
    department_name: '',
    department_description: '',
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

  // Fetch Departments when branch changes
  useEffect(() => {
    if (selectedBranchId) {
      fetchDepartments(selectedBranchId);
      setSelectedIds([]);
    } else {
      setDepartmentsList([]);
      setSelectedIds([]);
    }
  }, [selectedBranchId]);

  // Sync logged in user IDs
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

  const fetchDepartments = async (branchId) => {
    if (!branchId) return;
    setLoadingDepartments(true);
    try {
      const response = await departmentsApi.getByBranch(branchId);
      if (response.data?.success) {
        setDepartmentsList(response.data.data || []);
      } else {
        setDepartmentsList([]);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setDepartmentsList([]);
      } else {
        console.error('Failed to fetch departments:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch departments');
      }
    } finally {
      setLoadingDepartments(false);
    }
  };

  // Create Department
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!formData.department_name.trim()) {
      toast.error('Department name is required');
      return;
    }

    const payload = {
      company_id: parseInt(selectedCompanyId || user?.company_id),
      branch_id: parseInt(formData.branch_id || selectedBranchId),
      department_name: formData.department_name.trim(),
      department_description: formData.department_description.trim() || null,
      is_active: formData.is_active
    };

    if (!payload.company_id || !payload.branch_id) {
      toast.error('Company ID and Branch ID are required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await departmentsApi.create(payload);
      if (response.data?.success) {
        toast.success(response.data.message || 'Department created successfully!');
        setShowCreateModal(false);
        resetCreateForm();
        fetchDepartments(payload.branch_id);
      }
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error(error.response?.data?.message || 'Failed to create department');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Department
  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    if (!activeDepartment) return;
    if (!editFormData.department_name.trim()) {
      toast.error('Department name is required');
      return;
    }

    const payload = {
      company_id: parseInt(editFormData.company_id || selectedCompanyId || user?.company_id),
      branch_id: parseInt(editFormData.branch_id || selectedBranchId),
      department_name: editFormData.department_name.trim(),
      department_description: editFormData.department_description.trim() || null,
      is_active: editFormData.is_active
    };

    setSubmitting(true);
    try {
      const response = await departmentsApi.update(activeDepartment.department_id, payload);
      if (response.data?.success) {
        toast.success(response.data.message || 'Department updated successfully!');
        setShowEditModal(false);
        setActiveDepartment(null);
        fetchDepartments(payload.branch_id);
      }
    } catch (error) {
      console.error('Error updating department:', error);
      toast.error(error.response?.data?.message || 'Failed to update department');
    } finally {
      setSubmitting(false);
    }
  };

  // Soft Delete Department
  const handleSoftDeleteDepartment = async () => {
    if (!activeDepartment) return;
    setSubmitting(true);
    try {
      const response = await departmentsApi.softDelete(activeDepartment.department_id);
      if (response.data?.success) {
        toast.success(response.data.message || 'Department deactivated successfully');
        setShowDeleteModal(false);
        setActiveDepartment(null);
        if (selectedBranchId) {
          fetchDepartments(selectedBranchId);
        }
      }
    } catch (error) {
      console.error('Error deactivating department:', error);
      toast.error(error.response?.data?.message || 'Failed to deactivate department');
    } finally {
      setSubmitting(false);
    }
  };

  // Restore Department
  const handleRestoreDepartment = async (dept) => {
    try {
      const response = await departmentsApi.restore(dept.department_id);
      if (response.data?.success) {
        toast.success(response.data.message || 'Department restored to active successfully!');
        if (selectedBranchId) {
          fetchDepartments(selectedBranchId);
        }
      }
    } catch (error) {
      console.error('Error restoring department:', error);
      toast.error(error.response?.data?.message || 'Failed to restore department');
    }
  };

  // Bulk Deactivate
  const handleBulkSoftDelete = async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const response = await departmentsApi.bulkDelete({ department_ids: selectedIds });
      if (response.data?.success) {
        toast.success(response.data.message || `${selectedIds.length} departments deactivated!`);
        setShowBulkDeleteModal(false);
        setSelectedIds([]);
        if (selectedBranchId) {
          fetchDepartments(selectedBranchId);
        }
      }
    } catch (error) {
      console.error('Error bulk deactivating departments:', error);
      toast.error(error.response?.data?.message || 'Failed to bulk deactivate departments');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setFormData({
      company_id: selectedCompanyId || user?.company_id || '',
      branch_id: selectedBranchId || user?.branch_id || '',
      department_name: '',
      department_description: '',
      is_active: true
    });
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const openEditModal = (dept) => {
    setActiveDepartment(dept);
    setEditFormData({
      company_id: dept.company_id || selectedCompanyId || user?.company_id || '',
      branch_id: dept.branch_id || selectedBranchId || '',
      department_name: dept.department_name || '',
      department_description: dept.department_description || '',
      is_active: dept.is_active !== undefined ? dept.is_active : true
    });
    setShowEditModal(true);
  };

  const openDetailsModal = (dept) => {
    setActiveDepartment(dept);
    setShowDetailsModal(true);
  };

  const openDeleteModal = (dept) => {
    setActiveDepartment(dept);
    setShowDeleteModal(true);
  };

  const copyToClipboard = (text, label = 'Copied') => {
    navigator.clipboard.writeText(String(text));
    toast.success(`${label} to clipboard!`, { id: 'clipboard-toast' });
  };

  const applyPreset = (preset, isEdit = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        department_name: preset.name,
        department_description: preset.desc
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        department_name: preset.name,
        department_description: preset.desc
      }));
    }
    toast.success(`Preset '${preset.name}' applied!`, { id: 'preset-toast', icon: '✨' });
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDepartments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDepartments.map(d => d.department_id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Filtered departments
  const filteredDepartments = useMemo(() => {
    return departmentsList.filter(dept => {
      const matchesSearch = 
        dept.department_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dept.department_description && dept.department_description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        String(dept.department_id).includes(searchTerm);

      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? dept.is_active === true :
        dept.is_active === false;

      return matchesSearch && matchesStatus;
    });
  }, [departmentsList, searchTerm, statusFilter]);

  // Statistics
  const totalCount = departmentsList.length;
  const activeCount = departmentsList.filter(d => d.is_active === true).length;
  const inactiveCount = departmentsList.filter(d => d.is_active === false).length;

  const currentBranchObj = branchesList.find(b => String(b.branch_id) === String(selectedBranchId));

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#111827] font-sans antialiased p-5 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              <span>Master Data</span>
              <ChevronRight size={12} className="text-gray-400" />
              <span className="text-emerald-600 font-bold">Department Management</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
              <Building2 className="text-emerald-600" size={26} />
              Departments Master
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Create, configure, and monitor branch departments, operational units, and functional divisions.
            </p>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => fetchDepartments(selectedBranchId)}
              disabled={loadingDepartments || !selectedBranchId}
              className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reload departments"
            >
              <RefreshCw size={15} className={loadingDepartments ? 'animate-spin text-emerald-600' : 'text-gray-500'} />
              <span>Refresh</span>
            </button>

            {selectedIds.length > 0 && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Trash2 size={15} />
                <span>Deactivate ({selectedIds.length})</span>
              </button>
            )}

            <button
              onClick={openCreateModal}
              disabled={!selectedBranchId}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              <span>Add Department</span>
            </button>
          </div>
        </div>

        {/* Scope Selector Card (Company / Branch selector) */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 sm:p-5 shadow-xs">
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
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
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
                  {isBranchAdmin ? 'Your Assigned Branch Scope' : 'Active Branch Scope'}
                </label>
                {currentBranchObj && (
                  <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md font-semibold border border-emerald-100 inline-block">
                    Code: {currentBranchObj.branch_code}
                  </span>
                )}
              </div>

              {isBranchAdmin ? (
                <div className="px-3.5 py-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-sm font-semibold text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-emerald-600" />
                    <span>{user?.branch_name || currentBranchObj?.branch_name || `Branch #${selectedBranchId}`}</span>
                  </div>
                  <span className="text-xs font-medium text-emerald-700 bg-white/80 px-2 py-0.5 rounded shadow-xs">
                    Current Branch
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    disabled={loadingBranches || branchesList.length === 0}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-60"
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

            {/* Company Admin context tag */}
            {isCompanyAdmin && (
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs text-gray-600 flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {user?.company_name ? user.company_name.charAt(0) : 'C'}
                </div>
                <div className="truncate">
                  <div className="font-semibold text-gray-900 truncate">{user?.company_name || 'Your Company'}</div>
                  <div className="text-gray-500 truncate">{branchesList.length} total branches available</div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Stats Metrics Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white border border-gray-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between hover:border-gray-300 transition-all">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Departments</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Configured in this branch</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 size={20} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between hover:border-gray-300 transition-all">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Units</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{activeCount}</h3>
              <p className="text-xs text-emerald-600/70 mt-0.5">Operational & assignable</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between hover:border-gray-300 transition-all">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Archived / Inactive</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">{inactiveCount}</h3>
              <p className="text-xs text-amber-600/70 mt-0.5">Soft-deleted departments</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <XCircle size={20} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between hover:border-gray-300 transition-all">
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
              placeholder="Search by department name, description, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
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

          <div className="flex items-center gap-3 flex-wrap justify-between md:justify-end">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-lg border border-gray-200/60">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  statusFilter === 'active'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-gray-600 hover:text-emerald-700'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  statusFilter === 'inactive'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-gray-600 hover:text-amber-700'
                }`}
              >
                Archived ({inactiveCount})
              </button>
            </div>

            {/* View Mode Toggle (Table / Grid) */}
            <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                title="Table View"
              >
                <TableIcon size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                title="Card Grid View"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

        </div>

        {/* Content Section: Table or Grid */}
        {loadingDepartments ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-xs">
            <div className="w-12 h-12 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h4 className="text-base font-bold text-gray-800">Loading Departments...</h4>
            <p className="text-xs text-gray-500 mt-1">Fetching records for the selected branch</p>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Building2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {searchTerm || statusFilter !== 'all' ? 'No Matching Departments Found' : 'No Departments Registered Yet'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or clear status filters to view records.'
                : 'Start organizing your branch by defining departments such as HR, Sales, IT, and Finance.'}
            </p>
            {searchTerm || statusFilter !== 'all' ? (
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-all"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={openCreateModal}
                disabled={!selectedBranchId}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus size={16} />
                <span>Create First Department</span>
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 pl-4 pr-2 w-10">
                      <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600 mt-1">
                        {selectedIds.length === filteredDepartments.length && filteredDepartments.length > 0 ? (
                          <CheckSquare size={16} className="text-emerald-600" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-3">Department Name</th>
                    <th className="py-3.5 px-3">Description</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3">Created On</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredDepartments.map((dept) => {
                    const isSelected = selectedIds.includes(dept.department_id);
                    return (
                      <tr 
                        key={dept.department_id}
                        className={`hover:bg-gray-50/70 transition-colors ${!dept.is_active ? 'bg-gray-50/40 opacity-75' : ''} ${isSelected ? 'bg-emerald-50/30' : ''}`}
                      >
                        <td className="py-3.5 pl-4 pr-2">
                          <button onClick={() => toggleSelectOne(dept.department_id)} className="text-gray-400 hover:text-gray-600 mt-0.5">
                            {isSelected ? (
                              <CheckSquare size={16} className="text-emerald-600" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-gray-900">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                              dept.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {dept.department_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-gray-900 font-semibold">{dept.department_name}</div>
                              <div className="text-[11px] text-gray-400 font-normal">ID: #{dept.department_id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-gray-600 text-xs max-w-xs truncate">
                          {dept.department_description || (
                            <span className="text-gray-400 italic">No description provided</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          {dept.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Archived
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-gray-500 text-xs whitespace-nowrap">
                          {dept.created_at ? (
                            new Date(dept.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          ) : '—'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openDetailsModal(dept)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                              title="View Details"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              onClick={() => openEditModal(dept)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                              title="Edit Department"
                            >
                              <Edit3 size={15} />
                            </button>

                            {dept.is_active ? (
                              <button
                                onClick={() => openDeleteModal(dept)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                                title="Deactivate Department"
                              >
                                <Trash2 size={15} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRestoreDepartment(dept)}
                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                                title="Restore Department"
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

            {/* Table Footer */}
            <div className="p-3.5 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
              <span>Showing {filteredDepartments.length} of {totalCount} total departments</span>
              {selectedIds.length > 0 && (
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {selectedIds.length} department(s) selected
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDepartments.map((dept) => {
              const isSelected = selectedIds.includes(dept.department_id);
              return (
                <div 
                  key={dept.department_id}
                  className={`bg-white border rounded-xl p-4.5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all relative ${
                    isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-gray-200'
                  } ${!dept.is_active ? 'opacity-80 bg-gray-50/30' : ''}`}
                >
                  <div>
                    {/* Top Row: Select, Badge & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleSelectOne(dept.department_id)} className="text-gray-400 hover:text-gray-600">
                          {isSelected ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} />}
                        </button>
                        <span className="text-[11px] font-mono font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          #{dept.department_id}
                        </span>
                      </div>

                      {dept.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                          Archived
                        </span>
                      )}
                    </div>

                    {/* Department Title & Initial Icon */}
                    <div className="flex items-start gap-3 mb-2.5">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                        dept.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {dept.department_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-gray-900 leading-snug">{dept.department_name}</h4>
                        <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Calendar size={12} />
                          {dept.created_at ? new Date(dept.created_at).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 mt-2 leading-relaxed">
                      {dept.department_description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={() => openDetailsModal(dept)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Eye size={13} />
                      <span>Details</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(dept)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                        title="Edit Department"
                      >
                        <Edit3 size={15} />
                      </button>

                      {dept.is_active ? (
                        <button
                          onClick={() => openDeleteModal(dept)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                          title="Deactivate Department"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestoreDepartment(dept)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                          title="Restore Department"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Create New Department</h3>
                  <p className="text-xs text-gray-500">Add an operational division to this branch</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="p-5 space-y-4">
              
              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-600" />
                  Quick Presets & Templates
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-gray-50 rounded-lg border border-gray-100">
                  {COMMON_DEPARTMENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200/80 hover:border-emerald-300 rounded-md transition-all text-left shadow-2xs"
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales & Business Development"
                  value={formData.department_name}
                  onChange={(e) => setFormData({ ...formData, department_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                />
              </div>

              {/* Department Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Department Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Summarize the core roles, operational responsibilities, and scope..."
                  value={formData.department_description}
                  onChange={(e) => setFormData({ ...formData, department_description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              {/* Active Toggle Switch */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <div className="text-xs font-bold text-gray-800">Active Department</div>
                  <div className="text-[11px] text-gray-500">Immediately available for employee assignments</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Form Footer Buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Create Department</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && activeDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Edit Department</h3>
                  <p className="text-xs text-gray-500">Update details for Department #{activeDepartment.department_id}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateDepartment} className="p-5 space-y-4">
              
              {/* Presets Quick Fill */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-600" />
                  Preset Suggestions
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-gray-50 rounded-lg border border-gray-100">
                  {COMMON_DEPARTMENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset, true)}
                      className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200/80 hover:border-emerald-300 rounded-md transition-all text-left shadow-2xs"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.department_name}
                  onChange={(e) => setEditFormData({ ...editFormData, department_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                />
              </div>

              {/* Department Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Department Description
                </label>
                <textarea
                  rows={3}
                  value={editFormData.department_description}
                  onChange={(e) => setEditFormData({ ...editFormData, department_description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              {/* Active Toggle Switch */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <div className="text-xs font-bold text-gray-800">Department Status</div>
                  <div className="text-[11px] text-gray-500">Toggle active or archived status</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.is_active}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Form Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {showDetailsModal && activeDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg overflow-hidden">
            
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{activeDepartment.department_name}</h3>
                  <p className="text-xs text-gray-500">Department Information</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Department ID</span>
                  <div className="flex items-center justify-between font-mono font-bold text-gray-800">
                    <span>#{activeDepartment.department_id}</span>
                    <button 
                      onClick={() => copyToClipboard(activeDepartment.department_id, 'Department ID copied')}
                      className="text-gray-400 hover:text-emerald-600 p-0.5"
                      title="Copy ID"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Status</span>
                  <div>
                    {activeDepartment.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Archived
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Description</span>
                <div className="p-3 bg-gray-50 rounded-lg text-gray-700 text-xs leading-relaxed">
                  {activeDepartment.department_description || 'No detailed description set for this department.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Company Scope</span>
                  <span className="font-semibold text-gray-800">
                    {activeDepartment.company_name || `Company #${activeDepartment.company_id}`}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Branch Scope</span>
                  <span className="font-semibold text-gray-800">
                    {activeDepartment.branch_name || `Branch #${activeDepartment.branch_id}`}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg text-xs flex items-center justify-between">
                <span className="text-gray-400">Created At</span>
                <span className="font-semibold text-gray-700">
                  {activeDepartment.created_at ? new Date(activeDepartment.created_at).toLocaleString() : '—'}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SOFT DELETE CONFIRMATION MODAL */}
      {showDeleteModal && activeDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md p-5 text-center">
            
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={26} />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">Deactivate Department?</h3>
            <p className="text-xs text-gray-500 mb-4">
              Are you sure you want to deactivate <strong className="text-gray-800">"{activeDepartment.department_name}"</strong>? This will archive the department. You can restore it anytime.
            </p>

            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSoftDeleteDepartment}
                disabled={submitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Deactivating...' : 'Yes, Deactivate'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {showBulkDeleteModal && selectedIds.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md p-5 text-center">
            
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={26} />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">Bulk Deactivate Departments?</h3>
            <p className="text-xs text-gray-500 mb-4">
              You have selected <strong className="text-rose-600">{selectedIds.length}</strong> departments. Are you sure you want to deactivate them?
            </p>

            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSoftDelete}
                disabled={submitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Deactivating...' : `Deactivate All (${selectedIds.length})`}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DepartmentsMaster;
