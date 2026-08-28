import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  X, 
  Check,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Key,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Axios instance with auth interceptor
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const BranchManagement = () => {
  const { user } = useAuth();
  const companyId = user?.company_id; 
  
  // State
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [toast, setToast] = useState(null);

  // Form state for create
  const [formData, setFormData] = useState({
    company_id: companyId || '',
    branch_name: '',
    branch_code: '',
    address: '',
    phone_number: '',
    email_id: '',
    password: ''
  });

  // Form state for edit
  const [editFormData, setEditFormData] = useState({
    branch_name: '',
    branch_code: '',
    address: '',
    phone_number: '',
    email_id: ''
  });

  useEffect(() => {
    if (companyId) {
      fetchBranches();
    }
  }, [companyId]);

  const fetchBranches = async () => {
    if (!companyId) {
      showToast('error', 'No company found. Please login again.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/branches/company', {
        params: { company_id: companyId }
      });
      setBranches(response.data.data || []);
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/branches', formData);
      if (response.data.success) {
        showToast('success', 'Branch created successfully!');
        setShowCreateModal(false);
        resetForm();
        fetchBranches();
      }
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Failed to create branch');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put(`/branches/${selectedBranch.branch_id}`, editFormData);
      if (response.data.success) {
        showToast('success', 'Branch updated successfully!');
        setShowEditModal(false);
        fetchBranches();
      }
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Failed to update branch');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (id) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.delete(`/branches/${id}`);
      if (response.data.success) {
        showToast('success', 'Branch deleted successfully!');
        fetchBranches();
      }
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Failed to delete branch');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      company_id: companyId || '',
      branch_name: '',
      branch_code: '',
      address: '',
      phone_number: '',
      email_id: '',
      password: ''
    });
  };

  const openEditModal = (branch) => {
    setSelectedBranch(branch);
    setEditFormData({
      branch_name: branch.branch_name || '',
      branch_code: branch.branch_code || '',
      address: branch.address || '',
      phone_number: branch.phone_number || '',
      email_id: branch.email_id || ''
    });
    setShowEditModal(true);
  };

  const openDetailsModal = (branch) => {
    setSelectedBranch(branch);
    setShowDetailsModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const filteredBranches = branches.filter(branch =>
    branch.branch_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.branch_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.email_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!companyId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafbfc', fontFamily: 'Inter, sans-serif' }}>
        <div className="text-center p-8 bg-white border border-[#f0f0f0] rounded-xl shadow-sm max-w-sm w-full">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="text-red-500" size={24} />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No Company Found</h2>
          <p className="mt-1 text-sm text-gray-500">Please login again to access your branches.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '28px 32px', background: '#fafbfc', minHeight: '100vh' }}>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] p-3.5 rounded-lg shadow-lg flex items-center gap-3 max-w-md border bg-white border-[#e5e7eb]`}>
          <div className={`p-1 rounded-full ${toast.type === 'success' ? 'text-[#10b981] bg-[#ecfdf5]' : 'text-[#ef4444] bg-[#fef2f2]'}`}>
            {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          </div>
          <span className="text-sm font-medium text-[#111827]">
            {toast.message}
          </span>
          <button onClick={() => setToast(null)} className="ml-4 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
          Branch Management
        </h1>
        <p style={{ fontSize: '12.5px', color: '#9ca3af', margin: '3px 0 0', fontWeight: 400 }}>
          Company: {user?.company_name || `ID: ${companyId}`} • {branches.length} total branches
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-[#f0f0f0] rounded-lg p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search branches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f9fafb] border border-[#f3f4f6] rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-300 focus:bg-white transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchBranches}
            className="px-3 py-2 bg-white border border-[#f0f0f0] hover:bg-gray-50 text-gray-600 rounded-md font-medium flex items-center gap-2 transition-all text-sm"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-3 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md font-medium flex items-center gap-2 transition-all text-sm shadow-sm shadow-blue-100"
          >
            <Plus size={16} />
            Add Branch
          </button>
        </div>
      </div>

      {/* Branch Table */}
      <div className="bg-white border border-[#f0f0f0] rounded-lg overflow-hidden">
        {loading && branches.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]"></div>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="p-12 text-center">
            <Building className="mx-auto text-gray-300" size={48} />
            <h3 className="mt-4 text-sm font-semibold text-gray-900">No branches found</h3>
            <p className="mt-1 text-xs text-gray-500">
              {searchTerm ? 'No branches match your search.' : 'Get started by creating your first branch.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="mt-4 px-3 py-1.5 bg-[#2563eb] text-white text-xs rounded-md hover:bg-[#1d4ed8] transition-colors font-medium"
              >
                Create Branch
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#fafbfc] border-b border-[#f3f4f6]">
                  <th className="text-left py-3 px-5 text-[9.5px] font-semibold text-[#9ca3af] uppercase tracking-[0.06em]">Branch Name</th>
                  <th className="text-left py-3 px-5 text-[9.5px] font-semibold text-[#9ca3af] uppercase tracking-[0.06em]">Code</th>
                  <th className="text-left py-3 px-5 text-[9.5px] font-semibold text-[#9ca3af] uppercase tracking-[0.06em] hidden md:table-cell">Contact</th>
                  <th className="text-left py-3 px-5 text-[9.5px] font-semibold text-[#9ca3af] uppercase tracking-[0.06em] hidden lg:table-cell">Address</th>
                  <th className="text-left py-3 px-5 text-[9.5px] font-semibold text-[#9ca3af] uppercase tracking-[0.06em] hidden md:table-cell">Created</th>
                  <th className="text-right py-3 px-5 text-[9.5px] font-semibold text-[#9ca3af] uppercase tracking-[0.06em]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBranches.map((branch) => (
                  <tr key={branch.branch_id} className="hover:bg-[#f9fafb] border-b border-[#f5f5f5] last:border-0 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#2563eb] to-[#4f46e5] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {branch.branch_name.charAt(0)}
                        </div>
                        <div className="font-semibold text-gray-900 text-[12.5px]">{branch.branch_name}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 text-[10px] font-semibold text-[#2563eb] bg-[#eff6ff] rounded-full">
                        {branch.branch_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 hidden md:table-cell">
                      <div className="flex flex-col gap-0.5 text-[11.5px] text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Mail size={11} className="text-gray-400" />
                          <span className="truncate max-w-[180px]">{branch.email_id}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} className="text-gray-400" />
                          <span>{branch.phone_number}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 hidden lg:table-cell">
                      <div className="flex items-start gap-1.5 text-[11.5px] text-gray-600 max-w-[200px]">
                        <MapPin size={11} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="truncate" title={branch.address || 'N/A'}>
                          {branch.address || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 hidden md:table-cell">
                      <div className="text-[11px] text-gray-500 font-medium">
                        {new Date(branch.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => openDetailsModal(branch)}
                          className="p-1.5 text-gray-400 hover:text-[#2563eb] hover:bg-[#eff6ff] rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openEditModal(branch)}
                          className="p-1.5 text-gray-400 hover:text-[#2563eb] hover:bg-[#eff6ff] rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteBranch(branch.branch_id)}
                          className="p-1.5 text-gray-400 hover:text-[#ef4444] hover:bg-[#fef2f2] rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)} title="Add New Branch">
          <form onSubmit={handleCreateBranch}>
            <div className="space-y-4">
              <Input
                label="Company ID"
                name="company_id"
                type="number"
                value={formData.company_id}
                onChange={handleInputChange}
                required
                icon={<Building size={14} />}
                disabled
              />
              <Input
                label="Branch Name"
                name="branch_name"
                value={formData.branch_name}
                onChange={handleInputChange}
                required
                icon={<Building size={14} />}
              />
              <Input
                label="Branch Code"
                name="branch_code"
                value={formData.branch_code}
                onChange={handleInputChange}
                required
                placeholder="e.g., DT001"
                icon={<Key size={14} />}
              />
              <Input
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                icon={<MapPin size={14} />}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  name="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  required
                  icon={<Phone size={14} />}
                />
                <Input
                  label="Email Address"
                  name="email_id"
                  type="email"
                  value={formData.email_id}
                  onChange={handleInputChange}
                  required
                  icon={<Mail size={14} />}
                />
              </div>
              <Input
                label="Admin Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Min 6 characters"
                icon={<Key size={14} />}
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm shadow-blue-100"
              >
                {loading ? 'Creating...' : 'Create Branch'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-white border border-[#f0f0f0] hover:bg-gray-50 text-gray-700 rounded-md font-medium transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedBranch && (
        <Modal onClose={() => setShowEditModal(false)} title="Edit Branch">
          <form onSubmit={handleUpdateBranch}>
            <div className="space-y-4">
              <Input
                label="Branch Name"
                name="branch_name"
                value={editFormData.branch_name}
                onChange={handleEditInputChange}
                required
                icon={<Building size={14} />}
              />
              <Input
                label="Branch Code"
                name="branch_code"
                value={editFormData.branch_code}
                onChange={handleEditInputChange}
                required
                icon={<Key size={14} />}
              />
              <Input
                label="Address"
                name="address"
                value={editFormData.address}
                onChange={handleEditInputChange}
                icon={<MapPin size={14} />}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  name="phone_number"
                  type="tel"
                  value={editFormData.phone_number}
                  onChange={handleEditInputChange}
                  required
                  icon={<Phone size={14} />}
                />
                <Input
                  label="Email Address"
                  name="email_id"
                  type="email"
                  value={editFormData.email_id}
                  onChange={handleEditInputChange}
                  required
                  icon={<Mail size={14} />}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm shadow-blue-100"
              >
                {loading ? 'Updating...' : 'Update Branch'}
              </button>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-white border border-[#f0f0f0] hover:bg-gray-50 text-gray-700 rounded-md font-medium transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedBranch && (
        <Modal onClose={() => setShowDetailsModal(false)} title="Branch Details">
          <div className="space-y-1">
            <DetailItem icon={<Building size={14} />} label="Branch Name" value={selectedBranch.branch_name} />
            <DetailItem icon={<Key size={14} />} label="Branch Code" value={selectedBranch.branch_code} />
            <DetailItem icon={<Building size={14} />} label="Company ID" value={selectedBranch.company_id || companyId} />
            <DetailItem icon={<MapPin size={14} />} label="Address" value={selectedBranch.address || 'N/A'} />
            <DetailItem icon={<Phone size={14} />} label="Phone Number" value={selectedBranch.phone_number} />
            <DetailItem icon={<Mail size={14} />} label="Email Address" value={selectedBranch.email_id} />
            <DetailItem icon={<Calendar size={14} />} label="Created At" value={selectedBranch.created_at ? new Date(selectedBranch.created_at).toLocaleString() : 'N/A'} />
          </div>
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => {
                setShowDetailsModal(false);
                openEditModal(selectedBranch);
              }}
              className="flex-1 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md font-medium transition-colors text-sm shadow-sm shadow-blue-100"
            >
              Edit Branch
            </button>
            <button
              onClick={() => setShowDetailsModal(false)}
              className="px-4 py-2 bg-white border border-[#f0f0f0] hover:bg-gray-50 text-gray-700 rounded-md font-medium transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Modal Component
const Modal = ({ children, onClose, title }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#f0f0f0] sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-1 rounded-md hover:bg-gray-100 transition-colors">
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

// Input Component
const Input = ({ label, icon, disabled, ...props }) => {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          {...props}
          disabled={disabled}
          className={`w-full ${icon ? 'pl-9' : 'pl-3'} pr-3 py-2 bg-[#f9fafb] border border-[#f3f4f6] rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-300 focus:bg-white transition-all ${
            disabled ? 'cursor-not-allowed text-gray-500' : ''
          }`}
        />
      </div>
    </div>
  );
};

// Detail Item Component
const DetailItem = ({ icon, label, value }) => {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#f0f0f0] last:border-0">
      <div className="flex items-center gap-2 text-gray-500">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm text-gray-900 font-medium text-right">{value}</p>
    </div>
  );
};

export default BranchManagement;