import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { companies } from '../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUsers, FiCalendar, FiMail, FiPhone } from 'react-icons/fi';
import CompanyModal from '../components/CompanyModal';
import toast from 'react-hot-toast';
import { FaBuilding } from "react-icons/fa";


const SuperAdminDashboard = () => {
  const { user } = useAuth();
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
      const response = await companies.update(editingCompany.company_id, data);
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

  const filteredCompanies = companyList.filter(company =>
    company.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.company_code.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.email}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Companies</p>
                <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <FaBuilding className="text-blue-600 text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">New This Week</p>
                <p className="text-3xl font-bold text-gray-800">{stats.recent}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <FiCalendar className="text-green-600 text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Companies</p>
                <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <FiUsers className="text-purple-600 text-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium flex items-center space-x-2 whitespace-nowrap"
          >
            <FiPlus />
            <span>Add Company</span>
          </button>
        </div>

        {/* Companies Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-12">
              <FaBuilding className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No companies found</p>
              <button
                onClick={() => openModal()}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium inline-flex items-center space-x-2"
              >
                <FiPlus />
                <span>Add your first company</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST/PAN</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCompanies.map((company) => (
                    <tr key={company.company_id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{company.company_name}</div>
                          <div className="text-sm text-gray-500">{company.company_type || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          {company.company_code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {company.email_id && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FiMail className="mr-1" />
                              {company.email_id}
                            </div>
                          )}
                          {company.phone_number && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FiPhone className="mr-1" />
                              {company.phone_number}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm">
                          {company.gst_no && <div className="text-gray-600">GST: {company.gst_no}</div>}
                          {company.pan && <div className="text-gray-600">PAN: {company.pan}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openModal(company)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Edit"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => handleDelete(company.company_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete"
                          >
                            <FiTrash2 />
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

        {/* Company Modal */}
        <CompanyModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={editingCompany ? handleUpdate : handleCreate}
          company={editingCompany}
          title={editingCompany ? 'Edit Company' : 'Add New Company'}
        />
      </div>
    </div>
  );
};

export default SuperAdminDashboard;