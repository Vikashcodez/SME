import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { companies } from '../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiCalendar, FiMail, FiPhone, FiArrowRight } from 'react-icons/fi';
import { FaBuilding } from "react-icons/fa";
import { Gauge, ShieldCheck, CheckCircle2 } from "lucide-react";
import CompanyModal from '../components/CompanyModal';
import toast from 'react-hot-toast';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { switchCompany, activeCompanyCode, refreshCompanies } = useCompany();
  const navigate = useNavigate();
  const [companyList, setCompanyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    recent: 0,
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await companies.getAll();
      if (response.data.success) {
        setCompanyList(response.data.data);
        setStats({
          total: response.data.count,
          recent: response.data.data.filter(c => {
            const created = new Date(c.created_at);
            const now = new Date();
            const diff = (now - created) / (1000 * 60 * 60 * 24);
            return diff <= 7;
          }).length,
        });
        refreshCompanies();
      }
    } catch (error) {
      toast.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    try {
      const response = await companies.create(data);
      if (response.data.success) {
        toast.success('Company created successfully');
        setIsModalOpen(false);
        fetchCompanies();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create company');
    }
  };

  const handleUpdate = async (data) => {
    try {
      const companyId = editingCompany?.company_id || editingCompany?.id || editingCompany?.company_code;
      const response = await companies.update(companyId, data);
      if (response.data.success) {
        toast.success('Company updated successfully');
        setIsModalOpen(false);
        setEditingCompany(null);
        fetchCompanies();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update company');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        const response = await companies.delete(id);
        if (response.data.success) {
          toast.success('Company deleted successfully');
          fetchCompanies();
        }
      } catch (error) {
        toast.error('Failed to delete company');
      }
    }
  };

  const handleSelectCompany = (code) => {
    switchCompany(code);
    toast.success(`Switched active workspace to ${code}`);
    navigate('/app/dashboard');
  };

  const filteredCompanies = companyList.filter(company =>
    (company.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (company.company_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (company = null) => {
    setEditingCompany(company);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">Multi-Tenant Company Manager</h1>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                  Super Admin
                </span>
              </div>
              <p className="text-slate-500 text-sm mt-0.5">Logged in as {user?.email || 'admin@gmail.com'}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Gauge className="h-4 w-4" />
            <span>Open ERP Workspace</span>
          </button>
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Companies</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-xl">
                <FaBuilding className="text-emerald-600 text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Tenant Context</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{activeCompanyCode}</p>
              </div>
              <div className="bg-blue-50 p-3.5 rounded-xl">
                <CheckCircle2 className="text-blue-600 text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Added This Week</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.recent}</p>
              </div>
              <div className="bg-purple-50 p-3.5 rounded-xl">
                <FiCalendar className="text-purple-600 text-2xl" />
              </div>
            </div>
          </div>
        </div>

        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <FiSearch className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search organizations by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
            />
          </div>
          <button
            onClick={() => openModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
          >
            <FiPlus className="text-lg" />
            <span>Add Organization</span>
          </button>
        </div>

        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-16">
              <FaBuilding className="text-5xl text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-sm">No organizations found</p>
              <button
                onClick={() => openModal()}
                className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 hover:bg-emerald-700 transition-colors"
              >
                <FiPlus />
                <span>Create Company</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Tax IDs</th>
                    <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Workspace</th>
                    <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCompanies.map((company) => {
                    const isActiveWorkspace = company.company_code === activeCompanyCode;
                    return (
                      <tr key={company.company_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                              {company.company_name}
                              {isActiveWorkspace && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{company.company_type || 'Private Limited'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-slate-100 text-slate-700 rounded-lg">
                            {company.company_code}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-xs text-slate-600">
                            {company.email_id && (
                              <div className="flex items-center gap-1.5">
                                <FiMail className="text-slate-400 flex-shrink-0" />
                                <span>{company.email_id}</span>
                              </div>
                            )}
                            {company.phone_number && (
                              <div className="flex items-center gap-1.5">
                                <FiPhone className="text-slate-400 flex-shrink-0" />
                                <span>{company.phone_number}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-xs text-slate-600 font-mono">
                            {company.gst_no && <div>GST: {company.gst_no}</div>}
                            {company.pan && <div>PAN: {company.pan}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleSelectCompany(company.company_code)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isActiveWorkspace
                                ? "bg-emerald-100 text-emerald-800 cursor-default"
                                : "bg-slate-900 hover:bg-emerald-600 text-white shadow-xs"
                            }`}
                          >
                            <span>{isActiveWorkspace ? "Current" : "Switch To"}</span>
                            {!isActiveWorkspace && <FiArrowRight />}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => openModal(company)}
                              className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Edit Details"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              onClick={() => handleDelete(company.company_id)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Company"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        
        <CompanyModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={editingCompany ? handleUpdate : handleCreate}
          company={editingCompany}
          title={editingCompany ? 'Edit Organization' : 'Create Organization'}
        />
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
