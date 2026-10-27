import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  services as servicesApi, 
  branches as branchesApi, 
  companies as companiesApi 
} from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Wrench, 
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
  DollarSign, 
  Briefcase, 
  Clock, 
  Layers, 
  ChevronRight,
  RefreshCw,
  Image as ImageIcon,
  UploadCloud,
  FileText,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  HelpCircle,
  TrendingUp,
  ShieldCheck,
  Percent,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

const SERVICE_CATEGORIES = [
  'Consulting & Professional',
  'IT & Software Development',
  'Maintenance & AMC',
  'Installation & Commissioning',
  'Repair & Overhaul Services',
  'Engineering & Technical Design',
  'Logistics & Transportation',
  'Fabrication & Machining Services',
  'Testing & Quality Certification',
  'Manpower & Facility Management',
  'Marketing & Digital Services',
  'General Business Services'
];

const BILLING_TYPES = [
  'Per Service / Fixed',
  'Per Hour',
  'Per Day',
  'Per Month',
  'Annual Contract (AMC)',
  'Per Visit',
  'Per Unit / Milestone'
];

const STANDARD_SERVICE_UOM = ['HRS', 'DAYS', 'MONTHS', 'JOB', 'NOS', 'UNIT', 'VISIT', 'SQFT', 'LOT'];

const COMMON_SAC_CODES = [
  { code: '998311', label: 'Management consulting and management services' },
  { code: '998313', label: 'Information technology consulting and support services' },
  { code: '998314', label: 'Software design and development services' },
  { code: '998719', label: 'Maintenance and repair services of fabricated metal products/machinery' },
  { code: '998729', label: 'Installation services of other goods (machinery & industrial)' },
  { code: '998599', label: 'Other support services nowhere else classified' },
  { code: '9983', label: 'Other professional, technical and business services' },
  { code: '9988', label: 'Manufacturing services on physical inputs owned by others (Job Work)' }
];

const ServiceMaster = () => {
  const { user, isSuperAdmin, isCompanyAdmin } = useAuth();

  // Selected Scope
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  // Scope lists
  const [companiesList, setCompaniesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);

  // Data
  const [servicesList, setServicesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters & Views
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeService, setActiveService] = useState(null);

  // Active form modal tab: 'basic' | 'pricing' | 'sla'
  const [activeModalTab, setActiveModalTab] = useState('basic');

  // Photo uploads state for up to 3 images
  const [photoFiles, setPhotoFiles] = useState({ photo_1: null, photo_2: null, photo_3: null });
  const [photoPreviews, setPhotoPreviews] = useState({ photo_1: '', photo_2: '', photo_3: '' });

  // Initial Form State
  const initialServiceForm = {
    service_code: '',
    service_name: '',
    category: 'Consulting & Professional',
    billing_type: 'Per Hour',
    unit_of_measure: 'HRS',
    service_charge: '',
    cost_estimate: '',
    sac_code: '998311',
    gst_rate: '18',
    service_description: '',
    service_duration_hours: '1',
    terms_and_conditions: '',
    status: 'Active'
  };

  const [formData, setFormData] = useState(initialServiceForm);
  const [editFormData, setEditFormData] = useState(initialServiceForm);

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
    }
  }, [selectedCompanyId, user?.company_id]);

  useEffect(() => {
    fetchServices();
  }, [selectedCompanyId, selectedBranchId, categoryFilter, statusFilter]);

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

  const fetchServices = async () => {
    try {
      setLoading(true);
      const params = {};
      const effectiveCompanyId = selectedCompanyId || user?.company_id;
      if (effectiveCompanyId) params.company_id = effectiveCompanyId;
      if (selectedBranchId && selectedBranchId !== 'all') params.branch_id = selectedBranchId;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await servicesApi.getAll(params);
      setServicesList(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load services catalogue');
    } finally {
      setLoading(false);
    }
  };

  // Generate Service Code Helper
  const generateServiceCode = (isEdit = false) => {
    const code = `SRV-${Math.floor(1000 + Math.random() * 9000)}`;
    if (isEdit) {
      setEditFormData(prev => ({ ...prev, service_code: code }));
    } else {
      setFormData(prev => ({ ...prev, service_code: code }));
    }
  };

  // Handle Photo Changes
  const handlePhotoSelect = (e, photoKey) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image file must be under 10MB');
        return;
      }
      setPhotoFiles(prev => ({ ...prev, [photoKey]: file }));
      setPhotoPreviews(prev => ({ ...prev, [photoKey]: URL.createObjectURL(file) }));
    }
  };

  const removePhoto = (photoKey, isEdit = false) => {
    setPhotoFiles(prev => ({ ...prev, [photoKey]: null }));
    setPhotoPreviews(prev => ({ ...prev, [photoKey]: '' }));
    if (isEdit) {
      setEditFormData(prev => ({ ...prev, [photoKey]: '' }));
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData({
      ...initialServiceForm,
      service_code: `SRV-${Math.floor(1000 + Math.random() * 9000)}`
    });
    setPhotoFiles({ photo_1: null, photo_2: null, photo_3: null });
    setPhotoPreviews({ photo_1: '', photo_2: '', photo_3: '' });
    setActiveModalTab('basic');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (service) => {
    setActiveService(service);
    setEditFormData({
      service_code: service.service_code || '',
      service_name: service.service_name || '',
      category: service.category || 'Consulting & Professional',
      billing_type: service.billing_type || 'Per Hour',
      unit_of_measure: service.unit_of_measure || 'HRS',
      service_charge: service.service_charge || service.selling_price || '',
      cost_estimate: service.cost_estimate || service.cost_price || '',
      sac_code: service.sac_code || service.hsn_code || '998311',
      gst_rate: service.gst_rate ? String(service.gst_rate) : '18',
      service_description: service.service_description || '',
      service_duration_hours: service.service_duration_hours ? String(service.service_duration_hours) : '1',
      terms_and_conditions: service.terms_and_conditions || '',
      status: service.status || 'Active',
      photo_1: service.photo_1 || '',
      photo_2: service.photo_2 || '',
      photo_3: service.photo_3 || ''
    });

    setPhotoFiles({ photo_1: null, photo_2: null, photo_3: null });
    setPhotoPreviews({
      photo_1: service.photo_1 ? `${API_BASE_URL}${service.photo_1}` : '',
      photo_2: service.photo_2 ? `${API_BASE_URL}${service.photo_2}` : '',
      photo_3: service.photo_3 ? `${API_BASE_URL}${service.photo_3}` : ''
    });

    setActiveModalTab('basic');
    setShowEditModal(true);
  };

  // Open Details Modal
  const handleOpenDetailsModal = (service) => {
    setActiveService(service);
    setShowDetailsModal(true);
  };

  // Submit Add Service
  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!formData.service_name.trim()) {
      toast.error('Service Name is required');
      return;
    }
    if (!formData.service_charge || parseFloat(formData.service_charge) < 0) {
      toast.error('Please specify a valid Service Charge / Rate');
      return;
    }

    try {
      setSubmitting(true);
      const postData = new FormData();
      postData.append('company_id', selectedCompanyId || user?.company_id);
      if (selectedBranchId && selectedBranchId !== 'all') {
        postData.append('branch_id', selectedBranchId);
      }
      postData.append('service_code', formData.service_code || `SRV-${Math.floor(1000 + Math.random() * 9000)}`);
      postData.append('service_name', formData.service_name);
      postData.append('category', formData.category);
      postData.append('billing_type', formData.billing_type);
      postData.append('unit_of_measure', formData.unit_of_measure);
      postData.append('service_charge', formData.service_charge);
      postData.append('cost_estimate', formData.cost_estimate || '0');
      postData.append('sac_code', formData.sac_code || '998311');
      postData.append('gst_rate', formData.gst_rate || '18');
      postData.append('service_description', formData.service_description || '');
      postData.append('service_duration_hours', formData.service_duration_hours || '1');
      postData.append('terms_and_conditions', formData.terms_and_conditions || '');
      postData.append('status', formData.status);

      if (photoFiles.photo_1) postData.append('photo_1', photoFiles.photo_1);
      if (photoFiles.photo_2) postData.append('photo_2', photoFiles.photo_2);
      if (photoFiles.photo_3) postData.append('photo_3', photoFiles.photo_3);

      await servicesApi.create(postData);
      toast.success('Service Master registered successfully!');
      setShowAddModal(false);
      fetchServices();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error creating service');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Update Service
  const handleUpdateService = async (e) => {
    e.preventDefault();
    if (!editFormData.service_name.trim()) {
      toast.error('Service Name is required');
      return;
    }

    try {
      setSubmitting(true);
      const postData = new FormData();
      postData.append('service_code', editFormData.service_code);
      postData.append('service_name', editFormData.service_name);
      postData.append('category', editFormData.category);
      postData.append('billing_type', editFormData.billing_type);
      postData.append('unit_of_measure', editFormData.unit_of_measure);
      postData.append('service_charge', editFormData.service_charge);
      postData.append('cost_estimate', editFormData.cost_estimate || '0');
      postData.append('sac_code', editFormData.sac_code || '998311');
      postData.append('gst_rate', editFormData.gst_rate || '18');
      postData.append('service_description', editFormData.service_description || '');
      postData.append('service_duration_hours', editFormData.service_duration_hours || '1');
      postData.append('terms_and_conditions', editFormData.terms_and_conditions || '');
      postData.append('status', editFormData.status);

      if (photoFiles.photo_1) {
        postData.append('photo_1', photoFiles.photo_1);
      } else if (editFormData.photo_1 !== undefined) {
        postData.append('photo_1', editFormData.photo_1);
      }

      if (photoFiles.photo_2) {
        postData.append('photo_2', photoFiles.photo_2);
      } else if (editFormData.photo_2 !== undefined) {
        postData.append('photo_2', editFormData.photo_2);
      }

      if (photoFiles.photo_3) {
        postData.append('photo_3', photoFiles.photo_3);
      } else if (editFormData.photo_3 !== undefined) {
        postData.append('photo_3', editFormData.photo_3);
      }

      await servicesApi.update(activeService.service_id, postData);
      toast.success('Service Master updated successfully!');
      setShowEditModal(false);
      fetchServices();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error updating service');
    } finally {
      setSubmitting(false);
    }
  };

  // Soft Delete Service
  const handleDeleteService = async (service) => {
    if (!window.confirm(`Are you sure you want to deactivate service "${service.service_name}"?`)) return;
    try {
      await servicesApi.delete(service.service_id);
      toast.success('Service deactivated successfully');
      fetchServices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate service');
    }
  };

  // Restore Service
  const handleRestoreService = async (service) => {
    try {
      await servicesApi.restore(service.service_id);
      toast.success('Service reactivated successfully');
      fetchServices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore service');
    }
  };

  // Filtered Services List (search)
  const filteredServices = useMemo(() => {
    return servicesList.filter(s => {
      const matchSearch = searchTerm === '' || 
        (s.service_name && s.service_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.service_code && s.service_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.sac_code && s.sac_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });
  }, [servicesList, searchTerm]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = servicesList.length;
    const active = servicesList.filter(s => s.status === 'Active').length;
    const distinctCategories = new Set(servicesList.map(s => s.category)).size;
    const avgRate = total > 0 
      ? Math.round(servicesList.reduce((acc, s) => acc + (parseFloat(s.service_charge || s.selling_price || 0)), 0) / total) 
      : 0;
    return { total, active, distinctCategories, avgRate };
  }, [servicesList]);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-slate-50">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl shadow-md text-white">
              <Wrench size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Service Master
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Services & Billing
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage service offerings, hourly rates, SAC codes, and GST rates for unified billing
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchServices}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all"
            title="Refresh Services"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} />
            <span>+ Add New Service</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
            <Briefcase size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Services</div>
            <div className="text-xl font-black text-slate-900">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Services</div>
            <div className="text-xl font-black text-slate-900">{stats.active}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
            <Layers size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categories</div>
            <div className="text-xl font-black text-slate-900">{stats.distinctCategories}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
            <DollarSign size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Base Rate</div>
            <div className="text-xl font-black text-slate-900">₹{stats.avgRate.toLocaleString()}</div>
          </div>
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
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
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
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
            >
              <option value="all">All Branches</option>
              {branchesList.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="text-xs text-slate-500 font-medium ml-auto flex items-center gap-1.5">
          <Wrench size={14} className="text-emerald-600" />
          <span>Services in Catalog: <strong className="text-slate-900">{filteredServices.length}</strong></span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by service name, code, SAC, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
          >
            <option value="all">All Categories</option>
            {SERVICE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              title="Card Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              title="Table View"
            >
              <TableIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <RefreshCw className="animate-spin text-emerald-600 mx-auto mb-3" size={30} />
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Loading service catalog...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <Wrench className="text-slate-300 mx-auto mb-3" size={42} />
          <h3 className="text-sm font-bold text-slate-800">No Services Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            No service records matching your search or filters. Click below to add your first service.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus size={15} /> Add Service
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map(service => {
            const hasPhotos = service.photo_1 || service.photo_2 || service.photo_3;
            const primaryPhoto = service.photo_1 ? `${API_BASE_URL}${service.photo_1}` : null;

            return (
              <div
                key={service.service_id}
                className="bg-white rounded-xl border border-slate-200 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
              >
                {/* Image / Header Banner */}
                <div className="h-36 bg-gradient-to-tr from-slate-100 to-slate-200 relative overflow-hidden flex items-center justify-center">
                  {primaryPhoto ? (
                    <img
                      src={primaryPhoto}
                      alt={service.service_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Wrench size={32} className="text-slate-300 mb-1" />
                      <span className="text-[11px] font-semibold text-slate-400">No Preview Image</span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold bg-white/95 backdrop-blur-xs text-slate-800 px-2 py-0.5 rounded shadow-xs border border-slate-200">
                      {service.service_code}
                    </span>
                    <span className="text-[10px] font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded shadow-xs">
                      SAC {service.sac_code || service.hsn_code || '9983'}
                    </span>
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs border ${
                      service.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {service.status}
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
                    {service.category}
                  </div>
                  <h3 className="text-sm font-black text-slate-900 line-clamp-1 mb-1.5 group-hover:text-emerald-600 transition-colors">
                    {service.service_name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {service.service_description || 'No detailed scope of work description provided.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 mb-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Service Charge / Rate</span>
                      <strong className="text-slate-900 font-black text-sm">
                        ₹{parseFloat(service.service_charge || service.selling_price || 0).toLocaleString()}
                      </strong>
                      <span className="text-[10px] text-slate-500 font-medium ml-1">/ {service.unit_of_measure}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Billing Model</span>
                      <span className="text-xs font-bold text-slate-700">
                        {service.billing_type || 'Per Service'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">GST Rate</span>
                      <span className="text-xs font-bold text-emerald-700">
                        {service.gst_rate}% GST
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Duration</span>
                      <span className="text-xs font-bold text-slate-700">
                        {service.service_duration_hours || 1} hr(s)
                      </span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleOpenDetailsModal(service)}
                      className="text-xs font-bold text-slate-600 hover:text-emerald-600 flex items-center gap-1 transition-colors"
                    >
                      <Eye size={13} /> View Specs
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(service)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Service"
                      >
                        <Edit3 size={14} />
                      </button>
                      {service.status === 'Active' ? (
                        <button
                          onClick={() => handleDeleteService(service)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Deactivate Service"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestoreService(service)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Restore Service"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Service Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">SAC Code</th>
                  <th className="py-3 px-4">Billing Model</th>
                  <th className="py-3 px-4">Unit Rate</th>
                  <th className="py-3 px-4">GST Rate</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map(service => (
                  <tr key={service.service_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {service.service_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{service.service_name}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{service.service_description || '-'}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">
                      {service.category}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-700">
                      {service.sac_code || service.hsn_code || '9983'}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {service.billing_type} ({service.unit_of_measure})
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900">
                      ₹{parseFloat(service.service_charge || service.selling_price || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600">
                      {service.gst_rate}%
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        service.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetailsModal(service)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(service)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        {service.status === 'Active' ? (
                          <button
                            onClick={() => handleDeleteService(service)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Deactivate"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestoreService(service)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Restore"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD SERVICE MODAL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Wrench size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide">Register New Service Master</h3>
                  <p className="text-[11px] text-slate-400">Add service with SAC code, billing rate & GST for invoices</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6">
              <button
                type="button"
                onClick={() => setActiveModalTab('basic')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                  activeModalTab === 'basic'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Basic Info & Category
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('pricing')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                  activeModalTab === 'pricing'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Pricing, SAC & GST
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('sla')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                  activeModalTab === 'sla'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                3. SLA & Images
              </button>
            </div>

            <form onSubmit={handleCreateService}>
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4 text-xs">
                {/* TAB 1: BASIC INFO */}
                {activeModalTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Service Code <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            value={formData.service_code}
                            onChange={(e) => setFormData({ ...formData, service_code: e.target.value })}
                            placeholder="e.g. SRV-1001"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => generateServiceCode(false)}
                            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] whitespace-nowrap"
                            title="Auto-Generate Service Code"
                          >
                            Auto
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Status <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-semibold"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Service Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.service_name}
                        onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                        placeholder="e.g. Annual Maintenance Contract for CNC Machines"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-semibold"
                      >
                        {SERVICE_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Service Description / Scope of Work
                      </label>
                      <textarea
                        rows={4}
                        value={formData.service_description}
                        onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
                        placeholder="Detailed deliverables, inclusions, scope of service, visit schedules..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: PRICING & GST */}
                {activeModalTab === 'pricing' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Billing Pricing Model <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={formData.billing_type}
                          onChange={(e) => setFormData({ ...formData, billing_type: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-semibold"
                        >
                          {BILLING_TYPES.map(bt => (
                            <option key={bt} value={bt}>{bt}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Unit of Measure (UOM) <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={formData.unit_of_measure}
                          onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-semibold"
                        >
                          {STANDARD_SERVICE_UOM.map(uom => (
                            <option key={uom} value={uom}>{uom}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Service Charge / Selling Rate (₹) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={formData.service_charge}
                            onChange={(e) => setFormData({ ...formData, service_charge: e.target.value })}
                            placeholder="0.00"
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Estimated Cost / Cost Price (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.cost_estimate}
                            onChange={(e) => setFormData({ ...formData, cost_estimate: e.target.value })}
                            placeholder="0.00"
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          SAC Code (Services Accounting Code) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.sac_code}
                          onChange={(e) => setFormData({ ...formData, sac_code: e.target.value })}
                          placeholder="e.g. 998311"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono font-bold"
                        />
                        <div className="mt-1 flex flex-wrap gap-1">
                          {COMMON_SAC_CODES.slice(0, 4).map(sc => (
                            <button
                              type="button"
                              key={sc.code}
                              onClick={() => setFormData({ ...formData, sac_code: sc.code })}
                              className="text-[10px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200"
                              title={sc.label}
                            >
                              {sc.code}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          GST Tax Rate (%) <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={formData.gst_rate}
                          onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        >
                          <option value="0">0% (Nil / Exempt)</option>
                          <option value="5">5% GST</option>
                          <option value="12">12% GST</option>
                          <option value="18">18% GST (Standard Services)</option>
                          <option value="28">28% GST</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: SLA & IMAGES */}
                {activeModalTab === 'sla' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Typical Service Duration (Hours)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.service_duration_hours}
                        onChange={(e) => setFormData({ ...formData, service_duration_hours: e.target.value })}
                        placeholder="e.g. 2.5"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Service Terms, Conditions & SLA
                      </label>
                      <textarea
                        rows={3}
                        value={formData.terms_and_conditions}
                        onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                        placeholder="Payment terms, warranty on service, response SLA, travel expenses extra..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-2">
                        Portfolio / Service Preview Photos (Up to 3)
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {['photo_1', 'photo_2', 'photo_3'].map((key, i) => (
                          <div
                            key={key}
                            className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center min-h-[110px] bg-slate-50 relative group hover:border-emerald-400 transition-colors"
                          >
                            {photoPreviews[key] ? (
                              <div className="relative w-full h-full flex items-center justify-center">
                                <img
                                  src={photoPreviews[key]}
                                  alt="Preview"
                                  className="max-h-20 w-auto rounded object-contain"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePhoto(key, false)}
                                  className="absolute -top-1 -right-1 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-emerald-600">
                                <UploadCloud size={20} className="mb-1" />
                                <span className="text-[10px] font-bold">Photo {i + 1}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handlePhotoSelect(e, key)}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="flex gap-2">
                  {activeModalTab !== 'basic' && (
                    <button
                      type="button"
                      onClick={() => setActiveModalTab(activeModalTab === 'sla' ? 'pricing' : 'basic')}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-100"
                    >
                      Back
                    </button>
                  )}
                  {activeModalTab !== 'sla' && (
                    <button
                      type="button"
                      onClick={() => setActiveModalTab(activeModalTab === 'basic' ? 'pricing' : 'sla')}
                      className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg flex items-center gap-1"
                    >
                      Next <ChevronRight size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                    <span>Save Service</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT SERVICE MODAL */}
      {/* ========================================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide">Edit Service Master</h3>
                  <p className="text-[11px] text-slate-400">Modify service rates, SAC code, UOM, or deliverables</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50 px-6">
              <button
                type="button"
                onClick={() => setActiveModalTab('basic')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                  activeModalTab === 'basic'
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Basic Info
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('pricing')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                  activeModalTab === 'pricing'
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Pricing & GST
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('sla')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                  activeModalTab === 'sla'
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                3. SLA & Images
              </button>
            </div>

            <form onSubmit={handleUpdateService}>
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4 text-xs">
                {activeModalTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Service Code</label>
                        <input
                          type="text"
                          required
                          value={editFormData.service_code}
                          onChange={(e) => setEditFormData({ ...editFormData, service_code: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Status</label>
                        <select
                          value={editFormData.status}
                          onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Service Name</label>
                      <input
                        type="text"
                        required
                        value={editFormData.service_name}
                        onChange={(e) => setEditFormData({ ...editFormData, service_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Category</label>
                      <select
                        value={editFormData.category}
                        onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                      >
                        {SERVICE_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Scope / Description</label>
                      <textarea
                        rows={4}
                        value={editFormData.service_description}
                        onChange={(e) => setEditFormData({ ...editFormData, service_description: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                {activeModalTab === 'pricing' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Billing Model</label>
                        <select
                          value={editFormData.billing_type}
                          onChange={(e) => setEditFormData({ ...editFormData, billing_type: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                        >
                          {BILLING_TYPES.map(bt => (
                            <option key={bt} value={bt}>{bt}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Unit of Measure (UOM)</label>
                        <select
                          value={editFormData.unit_of_measure}
                          onChange={(e) => setEditFormData({ ...editFormData, unit_of_measure: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                        >
                          {STANDARD_SERVICE_UOM.map(uom => (
                            <option key={uom} value={uom}>{uom}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Service Charge / Rate (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={editFormData.service_charge}
                          onChange={(e) => setEditFormData({ ...editFormData, service_charge: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Estimated Cost (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editFormData.cost_estimate}
                          onChange={(e) => setEditFormData({ ...editFormData, cost_estimate: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">SAC Code</label>
                        <input
                          type="text"
                          required
                          value={editFormData.sac_code}
                          onChange={(e) => setEditFormData({ ...editFormData, sac_code: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">GST Tax Rate (%)</label>
                        <select
                          value={editFormData.gst_rate}
                          onChange={(e) => setEditFormData({ ...editFormData, gst_rate: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        >
                          <option value="0">0% (Nil / Exempt)</option>
                          <option value="5">5% GST</option>
                          <option value="12">12% GST</option>
                          <option value="18">18% GST (Standard)</option>
                          <option value="28">28% GST</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeModalTab === 'sla' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Duration (Hours)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editFormData.service_duration_hours}
                        onChange={(e) => setEditFormData({ ...editFormData, service_duration_hours: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Terms & Conditions / SLA</label>
                      <textarea
                        rows={3}
                        value={editFormData.terms_and_conditions}
                        onChange={(e) => setEditFormData({ ...editFormData, terms_and_conditions: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-2">Portfolio / Service Photos</label>
                      <div className="grid grid-cols-3 gap-3">
                        {['photo_1', 'photo_2', 'photo_3'].map((key, i) => (
                          <div
                            key={key}
                            className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center min-h-[110px] bg-slate-50 relative group hover:border-blue-400 transition-colors"
                          >
                            {photoPreviews[key] ? (
                              <div className="relative w-full h-full flex items-center justify-center">
                                <img
                                  src={photoPreviews[key]}
                                  alt="Preview"
                                  className="max-h-20 w-auto rounded object-contain"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePhoto(key, true)}
                                  className="absolute -top-1 -right-1 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-blue-600">
                                <UploadCloud size={20} className="mb-1" />
                                <span className="text-[10px] font-bold">Photo {i + 1}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handlePhotoSelect(e, key)}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="flex gap-2">
                  {activeModalTab !== 'basic' && (
                    <button
                      type="button"
                      onClick={() => setActiveModalTab(activeModalTab === 'sla' ? 'pricing' : 'basic')}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-100"
                    >
                      Back
                    </button>
                  )}
                  {activeModalTab !== 'sla' && (
                    <button
                      type="button"
                      onClick={() => setActiveModalTab(activeModalTab === 'basic' ? 'pricing' : 'sla')}
                      className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg flex items-center gap-1"
                    >
                      Next <ChevronRight size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                    <span>Update Service</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILS VIEW MODAL */}
      {/* ========================================================================= */}
      {showDetailsModal && activeService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Wrench size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide">{activeService.service_name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{activeService.service_code} • SAC: {activeService.sac_code || '9983'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5 text-xs">
              {/* Photo Showcase */}
              {(activeService.photo_1 || activeService.photo_2 || activeService.photo_3) && (
                <div className="grid grid-cols-3 gap-3">
                  {['photo_1', 'photo_2', 'photo_3'].map(k => {
                    if (!activeService[k]) return null;
                    return (
                      <div key={k} className="h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
                        <img
                          src={`${API_BASE_URL}${activeService[k]}`}
                          alt="Service Photo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Commercial & Tax Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Base Charge</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    ₹{parseFloat(activeService.service_charge || activeService.selling_price || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">per {activeService.unit_of_measure}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Billing Type</span>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {activeService.billing_type || 'Per Service'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">SAC Code</span>
                  <div className="text-sm font-mono font-bold text-emerald-700 mt-1">
                    {activeService.sac_code || activeService.hsn_code || '9983'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">GST Rate</span>
                  <div className="text-sm font-bold text-emerald-700 mt-1">
                    {activeService.gst_rate}%
                  </div>
                </div>
              </div>

              {/* Full Specs */}
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                <div className="p-3 bg-slate-50/60 flex justify-between">
                  <span className="text-slate-500 font-semibold">Category</span>
                  <strong className="text-slate-900 font-bold">{activeService.category}</strong>
                </div>
                <div className="p-3 bg-white flex justify-between">
                  <span className="text-slate-500 font-semibold">Estimated Internal Cost</span>
                  <strong className="text-slate-900 font-bold">₹{parseFloat(activeService.cost_estimate || 0).toLocaleString()}</strong>
                </div>
                <div className="p-3 bg-slate-50/60 flex justify-between">
                  <span className="text-slate-500 font-semibold">Standard Duration</span>
                  <strong className="text-slate-900 font-bold">{activeService.service_duration_hours || 1} Hour(s)</strong>
                </div>
                <div className="p-3 bg-white flex justify-between">
                  <span className="text-slate-500 font-semibold">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeService.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {activeService.status}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">Scope of Service</h4>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {activeService.service_description || 'No detailed scope of work provided.'}
                </div>
              </div>

              {/* Terms & Conditions */}
              {activeService.terms_and_conditions && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">SLA & Terms</h4>
                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-900 whitespace-pre-wrap leading-relaxed">
                    {activeService.terms_and_conditions}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Created: {new Date(activeService.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleOpenEditModal(activeService);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Edit3 size={13} /> Edit Service
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceMaster;
