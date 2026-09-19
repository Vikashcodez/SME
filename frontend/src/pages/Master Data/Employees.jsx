import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  employees as employeesApi, 
  departments as departmentsApi, 
  roles as rolesApi, 
  branches as branchesApi, 
  companies as companiesApi 
} from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2, 
  KeyRound, 
  Eye, 
  X, 
  Check, 
  Building2, 
  Building, 
  Briefcase, 
  Calendar, 
  Mail, 
  Phone, 
  MapPin, 
  Sparkles, 
  RefreshCw, 
  Download, 
  Copy, 
  CheckCircle2, 
  AlertTriangle, 
  LayoutGrid, 
  Table as TableIcon, 
  ChevronRight, 
  Shield, 
  Cake, 
  Info,
  BadgeCheck,
  UserX,
  ExternalLink,
  ShieldCheck,
  Layers,
  Clock,
  ArrowUpDown
} from 'lucide-react';

const Employees = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();

  // Selected Scope State
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  // Scope lists
  const [companiesList, setCompaniesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  
  // Data lists
  const [employeesList, setEmployeesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [rolesList, setRolesList] = useState([]);

  // Loading states
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Custom Input Toggles
  const [customDepartmentCreate, setCustomDepartmentCreate] = useState(false);
  const [customRoleCreate, setCustomRoleCreate] = useState(false);
  const [customDepartmentEdit, setCustomDepartmentEdit] = useState(false);
  const [customRoleEdit, setCustomRoleEdit] = useState(false);

  // Filters & Views
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [copiedText, setCopiedText] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState(null);

  // Form State for Create
  const [formData, setFormData] = useState({
    company_id: user?.company_id || '',
    branch_id: user?.branch_id || '',
    first_name: '',
    last_name: '',
    employee_code: '',
    email: '',
    phone_number: '',
    dob: '',
    gender: 'Male',
    department: '',
    role: '',
    date_of_joining: new Date().toISOString().split('T')[0],
    address: ''
  });

  // Form State for Edit
  const [editFormData, setEditFormData] = useState({
    company_id: '',
    branch_id: '',
    first_name: '',
    last_name: '',
    employee_code: '',
    email: '',
    phone_number: '',
    dob: '',
    gender: 'Male',
    department: '',
    role: '',
    date_of_joining: '',
    address: '',
    password: ''
  });

  // Fetch Companies if SuperAdmin
  useEffect(() => {
    if (isSuperAdmin) {
      fetchCompanies();
    }
  }, [isSuperAdmin]);

  // Sync logged in user IDs
  useEffect(() => {
    if (user?.branch_id) {
      setSelectedBranchId(user.branch_id);
    }
    if (user?.company_id) {
      setSelectedCompanyId(user.company_id);
    }
  }, [user]);

  // Fetch Branches when company changes
  useEffect(() => {
    const effectiveCompanyId = selectedCompanyId || user?.company_id;
    if (effectiveCompanyId) {
      fetchBranchesForCompany(effectiveCompanyId);
    }
  }, [selectedCompanyId, user?.company_id]);

  // Fetch Employees, Departments & Roles when branch changes
  useEffect(() => {
    if (selectedBranchId) {
      fetchEmployeesData(selectedBranchId, selectedCompanyId || user?.company_id);
      fetchBranchDepartments(selectedBranchId);
      fetchBranchRoles(selectedBranchId);
    } else {
      setEmployeesList([]);
      setDepartmentsList([]);
      setRolesList([]);
    }
  }, [selectedBranchId]);

  const fetchCompanies = async () => {
    try {
      const response = await companiesApi.getAll();
      const list = response.data?.data || response.data || [];
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
      const list = response.data?.data || [];
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

  const fetchBranchDepartments = async (branchId) => {
    if (!branchId) {
      setDepartmentsList([]);
      return;
    }
    setLoadingDepartments(true);
    try {
      const response = await departmentsApi.getByBranch(branchId);
      if (response.data?.success && Array.isArray(response.data.data)) {
        setDepartmentsList(response.data.data);
      } else {
        setDepartmentsList([]);
      }
    } catch (error) {
      setDepartmentsList([]);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchBranchRoles = async (branchId) => {
    if (!branchId) {
      setRolesList([]);
      return;
    }
    setLoadingRoles(true);
    try {
      const response = await rolesApi.getByBranch(branchId);
      if (response.data?.success && Array.isArray(response.data.data)) {
        setRolesList(response.data.data);
      } else {
        setRolesList([]);
      }
    } catch (error) {
      setRolesList([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchEmployeesData = async (branchId, companyId) => {
    if (!branchId && !companyId) return;
    setLoadingEmployees(true);
    try {
      const params = {};
      if (branchId) params.branch_id = branchId;
      if (companyId) params.company_id = companyId;

      const response = await employeesApi.getAll(params);
      if (response.data?.success) {
        setEmployeesList(response.data.data || []);
      } else {
        setEmployeesList([]);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setEmployeesList([]);
      } else {
        console.error('Failed to fetch employees:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch employees');
        setEmployeesList([]);
      }
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Helper to generate a smart employee code
  const handleAutoGenerateCode = () => {
    const currentBranch = branchesList.find(b => String(b.branch_id) === String(selectedBranchId || user?.branch_id));
    const prefix = currentBranch?.branch_code ? currentBranch.branch_code.toUpperCase() : 'EMP';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newCode = `${prefix}-${randomNum}`;
    setFormData(prev => ({ ...prev, employee_code: newCode }));
    toast.success(`Generated Code: ${newCode}`, { icon: '✨' });
  };

  // Reset Create Form
  const resetCreateForm = () => {
    const defaultBranchId = user?.branch_id || selectedBranchId || (branchesList[0]?.branch_id || '');
    const defaultCompanyId = user?.company_id || selectedCompanyId || (companiesList[0]?.company_id || '');

    setFormData({
      company_id: defaultCompanyId,
      branch_id: defaultBranchId,
      first_name: '',
      last_name: '',
      employee_code: '',
      email: '',
      phone_number: '',
      dob: '',
      gender: 'Male',
      department: '',
      role: '',
      date_of_joining: new Date().toISOString().split('T')[0],
      address: ''
    });
    setCustomDepartmentCreate(false);
    setCustomRoleCreate(false);
    if (defaultBranchId) {
      fetchBranchDepartments(defaultBranchId);
      fetchBranchRoles(defaultBranchId);
    }
  };

  // Handle Create Employee
  const handleCreateEmployee = async (e) => {
    e.preventDefault();

    if (!formData.first_name.trim()) {
      toast.error('First Name is required');
      return;
    }
    if (!formData.employee_code.trim()) {
      toast.error('Employee Code is required');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email address is required');
      return;
    }
    if (!formData.phone_number.trim()) {
      toast.error('Phone number is required');
      return;
    }

    const effectiveCompanyId = parseInt(selectedCompanyId || user?.company_id);
    const effectiveBranchId = parseInt(selectedBranchId || user?.branch_id);

    if (!effectiveCompanyId || !effectiveBranchId) {
      toast.error('Please select both Company and Branch');
      return;
    }

    const payload = {
      company_id: effectiveCompanyId,
      branch_id: effectiveBranchId,
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim() || null,
      employee_code: formData.employee_code.trim().toUpperCase(),
      email: formData.email.trim().toLowerCase(),
      phone_number: formData.phone_number.trim(),
      dob: formData.dob || null,
      gender: formData.gender || null,
      department: formData.department.trim() || null,
      role: formData.role.trim() || null,
      date_of_joining: formData.date_of_joining || null,
      address: formData.address.trim() || null
    };

    setSubmitting(true);
    try {
      const response = await employeesApi.create(payload);
      if (response.data?.success) {
        toast.success(response.data.message || 'Employee created successfully with default password "welcome"');
        setShowCreateModal(false);
        resetCreateForm();
        fetchEmployeesData(effectiveBranchId, effectiveCompanyId);
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error(error.response?.data?.message || 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (emp) => {
    setActiveEmployee(emp);
    setEditFormData({
      company_id: emp.company_id,
      branch_id: emp.branch_id,
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      employee_code: emp.employee_code || '',
      email: emp.email || '',
      phone_number: emp.phone_number || '',
      dob: emp.dob ? emp.dob.split('T')[0] : '',
      gender: emp.gender || 'Male',
      department: emp.department || '',
      role: emp.role || '',
      date_of_joining: emp.date_of_joining ? emp.date_of_joining.split('T')[0] : '',
      address: emp.address || '',
      password: ''
    });
    setCustomDepartmentEdit(false);
    setCustomRoleEdit(false);
    if (emp.branch_id) {
      fetchBranchDepartments(emp.branch_id);
      fetchBranchRoles(emp.branch_id);
    }
    setShowEditModal(true);
  };

  // Handle Update Employee
  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!activeEmployee) return;

    if (!editFormData.first_name.trim()) {
      toast.error('First Name is required');
      return;
    }

    const payload = {
      company_id: parseInt(editFormData.company_id || selectedCompanyId || user?.company_id),
      branch_id: parseInt(editFormData.branch_id || selectedBranchId || user?.branch_id),
      first_name: editFormData.first_name.trim(),
      last_name: editFormData.last_name.trim() || null,
      employee_code: editFormData.employee_code.trim().toUpperCase(),
      email: editFormData.email.trim().toLowerCase(),
      phone_number: editFormData.phone_number.trim(),
      dob: editFormData.dob || null,
      gender: editFormData.gender || null,
      department: editFormData.department.trim() || null,
      role: editFormData.role.trim() || null,
      date_of_joining: editFormData.date_of_joining || null,
      address: editFormData.address.trim() || null
    };

    if (editFormData.password.trim()) {
      payload.password = editFormData.password.trim();
    }

    setSubmitting(true);
    try {
      const response = await employeesApi.update(activeEmployee.employee_id, payload);
      if (response.data?.success) {
        toast.success(response.data.message || 'Employee updated successfully');
        setShowEditModal(false);
        setActiveEmployee(null);
        fetchEmployeesData(selectedBranchId, selectedCompanyId || user?.company_id);
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error(error.response?.data?.message || 'Failed to update employee');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Employee
  const handleDeleteEmployee = async () => {
    if (!activeEmployee) return;
    setSubmitting(true);
    try {
      const response = await employeesApi.delete(activeEmployee.employee_id);
      if (response.data?.success) {
        toast.success(response.data.message || 'Employee deleted successfully');
        setShowDeleteModal(false);
        setActiveEmployee(null);
        fetchEmployeesData(selectedBranchId, selectedCompanyId || user?.company_id);
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error(error.response?.data?.message || 'Failed to delete employee');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Reset Password to 'welcome'
  const handleResetPassword = async () => {
    if (!activeEmployee) return;
    setSubmitting(true);
    try {
      const response = await employeesApi.resetPassword(activeEmployee.employee_id);
      if (response.data?.success) {
        toast.success('Password successfully reset to "welcome"!', { duration: 5000 });
        setShowResetPasswordModal(false);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`Copied ${label}!`);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredEmployees.length === 0) {
      toast.error('No employees to export');
      return;
    }

    const headers = ['Employee Code', 'Full Name', 'Email', 'Phone', 'Gender', 'Department', 'Role', 'Date of Joining', 'Address', 'Branch', 'Company'];
    const rows = filteredEmployees.map(emp => [
      `"${emp.employee_code || ''}"`,
      `"${(emp.first_name || '') + ' ' + (emp.last_name || '')}"`,
      `"${emp.email || ''}"`,
      `"${emp.phone_number || ''}"`,
      `"${emp.gender || ''}"`,
      `"${emp.department || ''}"`,
      `"${emp.role || ''}"`,
      `"${emp.date_of_joining ? emp.date_of_joining.split('T')[0] : ''}"`,
      `"${(emp.address || '').replace(/"/g, '""')}"`,
      `"${emp.branch_name || ''}"`,
      `"${emp.company_name || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `employees_${selectedBranchId || 'all'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Employees directory exported to CSV!');
  };

  // Avatar Gradient Generator
  const getAvatarGradient = (name = '') => {
    const gradients = [
      'from-emerald-500 to-teal-700',
      'from-blue-500 to-indigo-700',
      'from-violet-500 to-purple-700',
      'from-rose-500 to-pink-700',
      'from-amber-500 to-orange-700',
      'from-cyan-500 to-blue-700',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  // Filtered & Searched Employees
  const filteredEmployees = useMemo(() => {
    return employeesList.filter(emp => {
      // Search
      const search = searchTerm.toLowerCase();
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
      const code = (emp.employee_code || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      const phone = (emp.phone_number || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      const role = (emp.role || '').toLowerCase();

      const matchesSearch = !searchTerm || (
        fullName.includes(search) ||
        code.includes(search) ||
        email.includes(search) ||
        phone.includes(search) ||
        dept.includes(search) ||
        role.includes(search)
      );

      // Department Filter
      const matchesDept = selectedDepartment === 'all' || (emp.department && emp.department.toLowerCase() === selectedDepartment.toLowerCase());

      // Role Filter
      const matchesRole = selectedRole === 'all' || (emp.role && emp.role.toLowerCase() === selectedRole.toLowerCase());

      // Gender Filter
      const matchesGender = selectedGender === 'all' || (emp.gender && emp.gender.toLowerCase() === selectedGender.toLowerCase());

      return matchesSearch && matchesDept && matchesRole && matchesGender;
    });
  }, [employeesList, searchTerm, selectedDepartment, selectedRole, selectedGender]);

  // Dynamic Statistics
  const stats = useMemo(() => {
    const total = employeesList.length;
    const uniqueDepts = new Set(employeesList.map(e => e.department).filter(Boolean)).size;
    const uniqueRoles = new Set(employeesList.map(e => e.role).filter(Boolean)).size;
    const males = employeesList.filter(e => e.gender?.toLowerCase() === 'male').length;
    const females = employeesList.filter(e => e.gender?.toLowerCase() === 'female').length;
    const others = employeesList.filter(e => e.gender?.toLowerCase() === 'other').length;

    // Joiners in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentJoiners = employeesList.filter(e => {
      if (!e.date_of_joining) return false;
      const joinDate = new Date(e.date_of_joining);
      return joinDate >= thirtyDaysAgo;
    }).length;

    return { total, uniqueDepts, uniqueRoles, males, females, others, recentJoiners };
  }, [employeesList]);

  // Unique department and role options from current list + master lists
  const availableDepartments = useMemo(() => {
    const set = new Set();
    departmentsList.forEach(d => set.add(d.department_name));
    employeesList.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set).sort();
  }, [departmentsList, employeesList]);

  const availableRoles = useMemo(() => {
    const set = new Set();
    rolesList.forEach(r => set.add(r.role_name));
    employeesList.forEach(e => { if (e.role) set.add(e.role); });
    return Array.from(set).sort();
  }, [rolesList, employeesList]);

  const activeBranchObj = branchesList.find(b => String(b.branch_id) === String(selectedBranchId));

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      
      {/* Scope Selector Bar (SuperAdmin & CompanyAdmin) */}
      {(isSuperAdmin || (isCompanyAdmin && branchesList.length > 1)) && (
        <div className="mb-6 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-semibold">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operational Scope</span>
                <p className="text-sm font-bold text-slate-700">Filter Branch Directory</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isSuperAdmin && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500">Company:</label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 outline-hidden focus:border-emerald-500 focus:bg-white transition-colors"
                  >
                    {companiesList.map(comp => (
                      <option key={comp.company_id} value={comp.company_id}>
                        {comp.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">Branch:</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  disabled={loadingBranches}
                  className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 outline-hidden focus:border-emerald-500 focus:bg-white transition-colors disabled:opacity-50"
                >
                  {branchesList.map(br => (
                    <option key={br.branch_id} value={br.branch_id}>
                      {br.branch_name} ({br.branch_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Master Data Management</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-slate-500">Employees Directory</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Employees Directory
            </h1>
            {activeBranchObj && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Building className="w-3 h-3" />
                {activeBranchObj.branch_name} ({activeBranchObj.branch_code})
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Centralized personnel registry, credentials provision, departments assignment and identity records.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => fetchEmployeesData(selectedBranchId, selectedCompanyId || user?.company_id)}
            disabled={loadingEmployees}
            title="Refresh employees data"
            className="inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingEmployees ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            title="Export CSV Directory"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-500/20 transition-all transform active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      {/* Analytics & Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Total Employees */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              Active records
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Branch workforce strength</p>
        </div>

        {/* Card 2: Departments Represented */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Departments</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.uniqueDepts}</span>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
              Operational units
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Assigned divisions</p>
        </div>

        {/* Card 3: Gender Diversity */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gender Ratio</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <BadgeCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              {stats.males} M
            </span>
            <span className="text-xs font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md">
              {stats.females} F
            </span>
            {stats.others > 0 && (
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                {stats.others} Other
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Diversity representation</p>
        </div>

        {/* Card 4: Recent Joiners */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Onboarded</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.recentJoiners}</span>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
              Last 30 days
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Recently added personnel</p>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, code, email, phone, role..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/10 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Department Filter */}
            <div className="relative">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-hidden focus:bg-white focus:border-emerald-500 transition-colors"
              >
                <option value="all">All Departments ({availableDepartments.length})</option>
                {availableDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-hidden focus:bg-white focus:border-emerald-500 transition-colors"
              >
                <option value="all">All Roles ({availableRoles.length})</option>
                {availableRoles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div className="relative">
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-hidden focus:bg-white focus:border-emerald-500 transition-colors"
              >
                <option value="all">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                title="Table View"
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-white text-emerald-600 shadow-xs font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid Cards View"
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-white text-emerald-600 shadow-xs font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Summary Tags */}
        {(searchTerm || selectedDepartment !== 'all' || selectedRole !== 'all' || selectedGender !== 'all') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-600">Active Filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                  Search: "{searchTerm}"
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm('')} />
                </span>
              )}
              {selectedDepartment !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                  Dept: {selectedDepartment}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedDepartment('all')} />
                </span>
              )}
              {selectedRole !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                  Role: {selectedRole}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedRole('all')} />
                </span>
              )}
              {selectedGender !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium">
                  Gender: {selectedGender}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedGender('all')} />
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('all');
                setSelectedRole('all');
                setSelectedGender('all');
              }}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loadingEmployees ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-700">Loading branch employees...</p>
          <p className="text-xs text-slate-400 mt-1">Retrieving employee roster and credentials</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Employees Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
            {searchTerm || selectedDepartment !== 'all' || selectedRole !== 'all'
              ? 'No employees matched your active filter criteria. Try resetting filters or changing your search terms.'
              : 'There are currently no employees registered in this branch. Click the button below to add your first employee.'}
          </p>
          {searchTerm || selectedDepartment !== 'all' || selectedRole !== 'all' ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('all');
                setSelectedRole('all');
                setSelectedGender('all');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Clear Filter Queries</span>
            </button>
          ) : (
            <button
              onClick={() => {
                resetCreateForm();
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Employee</span>
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Role & Dept</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Joining Date</th>
                  <th className="py-3.5 px-4 text-center">Gender</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEmployees.map((emp) => {
                  const initials = `${(emp.first_name || '')[0] || ''}${(emp.last_name || '')[0] || ''}`.toUpperCase() || 'E';
                  const gradient = getAvatarGradient(`${emp.first_name} ${emp.last_name}`);

                  return (
                    <tr 
                      key={emp.employee_id} 
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Employee Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                              <span>{emp.first_name} {emp.last_name || ''}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                                {emp.employee_code}
                              </span>
                              <button
                                onClick={() => handleCopy(emp.employee_code, `Code ${emp.employee_code}`)}
                                title="Copy Employee Code"
                                className="text-slate-400 hover:text-emerald-600 transition-colors"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Department */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1 font-semibold text-slate-800">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            <span>{emp.role || 'Unassigned Role'}</span>
                          </div>
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                              {emp.department || 'General'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <div className="space-y-1 text-slate-600">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a 
                              href={`mailto:${emp.email}`} 
                              className="hover:text-emerald-600 hover:underline truncate max-w-[180px]"
                              title={emp.email}
                            >
                              {emp.email}
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a href={`tel:${emp.phone_number}`} className="hover:text-emerald-600">
                              {emp.phone_number}
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Joining Date */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'Not Specified'}
                          </span>
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                          emp.gender?.toLowerCase() === 'female' 
                            ? 'bg-pink-50 text-pink-700 border border-pink-100'
                            : emp.gender?.toLowerCase() === 'male'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {emp.gender || 'N/A'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setActiveEmployee(emp);
                              setShowDetailsModal(true);
                            }}
                            title="View Full Profile Dossier"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openEditModal(emp)}
                            title="Edit Employee Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setActiveEmployee(emp);
                              setShowResetPasswordModal(true);
                            }}
                            title="Reset Password to Default (welcome)"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setActiveEmployee(emp);
                              setShowDeleteModal(true);
                            }}
                            title="Delete Employee"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="py-3 px-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filteredEmployees.length} of {employeesList.length} total personnel records</span>
            <span>Branch Personnel Master v2.4</span>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((emp) => {
            const initials = `${(emp.first_name || '')[0] || ''}${(emp.last_name || '')[0] || ''}`.toUpperCase() || 'E';
            const gradient = getAvatarGradient(`${emp.first_name} ${emp.last_name}`);

            return (
              <div
                key={emp.employee_id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0`}>
                        {initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">
                          {emp.first_name} {emp.last_name || ''}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="font-mono text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            {emp.employee_code}
                          </span>
                          <button
                            onClick={() => handleCopy(emp.employee_code, `Code ${emp.employee_code}`)}
                            title="Copy Code"
                            className="text-slate-400 hover:text-emerald-600"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      emp.gender?.toLowerCase() === 'female' 
                        ? 'bg-pink-50 text-pink-700'
                        : emp.gender?.toLowerCase() === 'male'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {emp.gender || 'N/A'}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800">
                      <Briefcase className="w-3 h-3 text-slate-500" />
                      {emp.role || 'Unassigned'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">
                      <Layers className="w-3 h-3 text-blue-500" />
                      {emp.department || 'General'}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 text-xs text-slate-600 pt-3 border-t border-slate-100 mb-4">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={`mailto:${emp.email}`} className="truncate hover:text-emerald-600 hover:underline">
                        {emp.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={`tel:${emp.phone_number}`} className="hover:text-emerald-600">
                        {emp.phone_number}
                      </a>
                    </div>
                    {emp.date_of_joining && (
                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Joined: {new Date(emp.date_of_joining).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setActiveEmployee(emp);
                      setShowDetailsModal(true);
                    }}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Profile</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(emp)}
                      title="Edit Employee"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveEmployee(emp);
                        setShowResetPasswordModal(true);
                      }}
                      title="Reset Password"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveEmployee(emp);
                        setShowDeleteModal(true);
                      }}
                      title="Delete Employee"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE EMPLOYEE MODAL */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Branch Employee</h3>
                  <p className="text-xs text-slate-500">Create employee credentials & departmental profile</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateEmployee} className="p-6 space-y-6">
              
              {/* Default Password Notice */}
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-800 text-xs">
                <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Automated Credential Provision:</span> Newly registered personnel will be assigned default password <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold text-amber-900">welcome</code>. They can update it upon first branch login.
                </div>
              </div>

              {/* Personal Information Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Personal Information</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="e.g. Alexander"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="e.g. Wright"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>

                  {/* DOB */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Cake className="w-3.5 h-3.5 text-slate-400" />
                      <span>Date of Birth</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-emerald-500 transition-all"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-emerald-500 transition-all"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Official & Employment Information */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Employment Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Employee Code */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        Employee Code <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoGenerateCode}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Auto Generate</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.employee_code}
                      onChange={(e) => setFormData({ ...formData, employee_code: e.target.value.toUpperCase() })}
                      placeholder="e.g. EMP-1001"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>

                  {/* Date of Joining */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Date of Joining</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date_of_joining}
                      onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-emerald-500 transition-all"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Department
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomDepartmentCreate(!customDepartmentCreate);
                          if (!customDepartmentCreate) {
                            setFormData(prev => ({ ...prev, department: '' }));
                          }
                        }}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        {customDepartmentCreate ? 'Choose from list' : '+ Custom'}
                      </button>
                    </div>

                    {customDepartmentCreate ? (
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="Type custom department name..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-emerald-500 transition-all"
                      />
                    ) : (
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        disabled={loadingDepartments}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-emerald-500 transition-all disabled:opacity-50"
                      >
                        <option value="">
                          {loadingDepartments 
                            ? 'Loading departments...' 
                            : departmentsList.length > 0 
                            ? `-- Select Department (${departmentsList.length} from endpoints) --` 
                            : '-- No departments configured --'}
                        </option>
                        {departmentsList.map(dept => (
                          <option key={dept.department_id} value={dept.department_name}>
                            {dept.department_name}
                          </option>
                        ))}
                      </select>
                    )}
                    {departmentsList.length === 0 && !loadingDepartments && !customDepartmentCreate && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        No departments found for this branch. Click "+ Custom" or add departments in Master Data.
                      </p>
                    )}
                  </div>

                  {/* Role / Designation */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Role / Designation
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomRoleCreate(!customRoleCreate);
                          if (!customRoleCreate) {
                            setFormData(prev => ({ ...prev, role: '' }));
                          }
                        }}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        {customRoleCreate ? 'Choose from list' : '+ Custom'}
                      </button>
                    </div>

                    {customRoleCreate ? (
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        placeholder="Type custom role/designation..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-emerald-500 transition-all"
                      />
                    ) : (
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        disabled={loadingRoles}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-emerald-500 transition-all disabled:opacity-50"
                      >
                        <option value="">
                          {loadingRoles 
                            ? 'Loading roles...' 
                            : rolesList.length > 0 
                            ? `-- Select Role (${rolesList.length} from endpoints) --` 
                            : '-- No roles configured --'}
                        </option>
                        {rolesList.map(r => (
                          <option key={r.role_id} value={r.role_name}>
                            {r.role_name}
                          </option>
                        ))}
                      </select>
                    )}
                    {rolesList.length === 0 && !loadingRoles && !customRoleCreate && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        No roles found for this branch. Click "+ Custom" or add roles in Master Data.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact & Address Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contact Information</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="alexander@company.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Residential Address</span>
                    </label>
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter street, city, postal code..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-emerald-500 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Confirm & Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT EMPLOYEE MODAL */}
      {/* ========================================================================= */}
      {showEditModal && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Employee: {activeEmployee.first_name} {activeEmployee.last_name}
                  </h3>
                  <p className="text-xs text-slate-500">Update employee profile details or credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="p-6 space-y-6">
              
              {/* Personal Info */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Personal Information</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.first_name}
                      onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.last_name}
                      onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={editFormData.dob}
                      onChange={(e) => setEditFormData({ ...editFormData, dob: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={editFormData.gender}
                      onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-blue-500 transition-all"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Employment Info */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Employment Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Employee Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.employee_code}
                      onChange={(e) => setEditFormData({ ...editFormData, employee_code: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date of Joining
                    </label>
                    <input
                      type="date"
                      value={editFormData.date_of_joining}
                      onChange={(e) => setEditFormData({ ...editFormData, date_of_joining: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Department
                      </label>
                      <button
                        type="button"
                        onClick={() => setCustomDepartmentEdit(!customDepartmentEdit)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        {customDepartmentEdit ? 'Choose from list' : '+ Custom'}
                      </button>
                    </div>

                    {customDepartmentEdit ? (
                      <input
                        type="text"
                        value={editFormData.department}
                        onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                        placeholder="Type custom department name..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-blue-500 transition-all"
                      />
                    ) : (
                      <select
                        value={editFormData.department}
                        onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                        disabled={loadingDepartments}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-blue-500 transition-all disabled:opacity-50"
                      >
                        <option value="">
                          {loadingDepartments ? 'Loading departments...' : '-- Select Department --'}
                        </option>
                        {/* Preserve current value if not in departmentsList */}
                        {editFormData.department && !departmentsList.some(d => d.department_name === editFormData.department) && (
                          <option value={editFormData.department}>
                            {editFormData.department} (Current)
                          </option>
                        )}
                        {departmentsList.map(dept => (
                          <option key={dept.department_id} value={dept.department_name}>
                            {dept.department_name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Role / Designation */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Role / Designation
                      </label>
                      <button
                        type="button"
                        onClick={() => setCustomRoleEdit(!customRoleEdit)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        {customRoleEdit ? 'Choose from list' : '+ Custom'}
                      </button>
                    </div>

                    {customRoleEdit ? (
                      <input
                        type="text"
                        value={editFormData.role}
                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                        placeholder="Type custom role/designation..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-blue-500 transition-all"
                      />
                    ) : (
                      <select
                        value={editFormData.role}
                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                        disabled={loadingRoles}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-blue-500 transition-all disabled:opacity-50"
                      >
                        <option value="">
                          {loadingRoles ? 'Loading roles...' : '-- Select Role / Designation --'}
                        </option>
                        {/* Preserve current value if not in rolesList */}
                        {editFormData.role && !rolesList.some(r => r.role_name === editFormData.role) && (
                          <option value={editFormData.role}>
                            {editFormData.role} (Current)
                          </option>
                        )}
                        {rolesList.map(r => (
                          <option key={r.role_id} value={r.role_name}>
                            {r.role_name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contact & Security</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={editFormData.phone_number}
                      onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Address
                    </label>
                    <textarea
                      rows={2}
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-blue-500 transition-all resize-none"
                    />
                  </div>

                  {/* Override Password */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Set New Custom Password (Optional)
                    </label>
                    <input
                      type="password"
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      placeholder="Leave blank to preserve current password"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving Changes...' : 'Update Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW DETAILS DOSSIER MODAL */}
      {/* ========================================================================= */}
      {showDetailsModal && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Banner with Avatar */}
            <div className="relative bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-800 p-6 rounded-t-3xl text-white">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(`${activeEmployee.first_name} ${activeEmployee.last_name}`)} text-white flex items-center justify-center font-black text-xl shadow-lg border-2 border-white/20`}>
                  {`${(activeEmployee.first_name || '')[0] || ''}${(activeEmployee.last_name || '')[0] || ''}`.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black">
                    {activeEmployee.first_name} {activeEmployee.last_name || ''}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/20 text-white">
                      {activeEmployee.employee_code}
                    </span>
                    <span className="text-xs text-emerald-200 font-medium">
                      {activeEmployee.role || 'Unassigned Role'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dossier Content */}
            <div className="p-6 space-y-6">
              
              {/* Badges Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                    {activeEmployee.department || 'Not Assigned'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gender</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                    {activeEmployee.gender || 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Branch</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                    {activeEmployee.branch_name || 'Active Branch'}
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Contact Information
                </h4>
                <div className="space-y-2.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-100 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold select-all">{activeEmployee.email}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(activeEmployee.email, 'Email')}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      Copy
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold select-all">{activeEmployee.phone_number}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(activeEmployee.phone_number, 'Phone')}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      Copy
                    </button>
                  </div>

                  {activeEmployee.address && (
                    <div className="flex items-start gap-2 text-slate-700 pt-2 border-t border-slate-200/60">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-slate-600">{activeEmployee.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline & Dates */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Employment Timeline
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Date of Joining</span>
                    <span className="font-bold text-slate-800">
                      {activeEmployee.date_of_joining ? new Date(activeEmployee.date_of_joining).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Date of Birth</span>
                    <span className="font-bold text-slate-800">
                      {activeEmployee.dob ? new Date(activeEmployee.dob).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security & Quick Actions */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowResetPasswordModal(true);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>Reset Password to 'welcome'</span>
                </button>

                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    openEditModal(activeEmployee);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESET PASSWORD CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showResetPasswordModal && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Reset Password to Default?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              You are about to reset the access credentials for <strong className="text-slate-800">{activeEmployee.first_name} {activeEmployee.last_name}</strong> (<code className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{activeEmployee.employee_code}</code>).
            </p>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 mb-6 text-xs text-slate-700 text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Target User:</span>
                <span className="font-bold">{activeEmployee.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">New Password:</span>
                <span className="font-mono font-bold text-emerald-700">welcome</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowResetPasswordModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleResetPassword}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Resetting...' : 'Yes, Reset to "welcome"'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showDeleteModal && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Delete Employee Record?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to permanently delete <strong className="text-slate-800">{activeEmployee.first_name} {activeEmployee.last_name}</strong> (<code className="font-mono text-rose-700 bg-rose-50 px-1 py-0.5 rounded">{activeEmployee.employee_code}</code>)? This action cannot be undone.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteEmployee}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Employees;
