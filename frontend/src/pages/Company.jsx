import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch, 
  FiMail, 
  FiPhone,
  FiUpload,
  FiX,
  FiChevronRight,
  FiBriefcase,
  FiInfo,
  FiFileText,
  FiHome,
  FiCalendar,
  FiTag,
  FiMapPin,
  FiUser
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CompanyPage = () => {
  const [companyList, setCompanyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCompany, setEditingCompany] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // State for View Modal
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingCompany, setViewingCompany] = useState(null);

  const [formData, setFormData] = useState({
    company_name: '', company_code: '', logo: null, logoPreview: null,
    establishment_year: '', pan: '', cin: '', gst_no: '', street: '',
    building_no: '', district: '', city: '', state: '', country: '',
    pincode: '', phone_number: '', email_id: '', company_type: '', admin_password: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { 'Authorization': `Bearer ${token}` } };
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/companies`, getAuthHeaders());
      if (response.data.success) setCompanyList(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return setFormErrors(prev => ({ ...prev, logo: 'File size must be less than 5MB' }));
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) return setFormErrors(prev => ({ ...prev, logo: 'Only image files are allowed' }));
      
      setFormData(prev => ({ ...prev, logo: file, logoPreview: URL.createObjectURL(file) }));
      setFormErrors(prev => ({ ...prev, logo: '' }));
    }
  };

  const removeLogo = () => setFormData(prev => ({ ...prev, logo: null, logoPreview: null }));

  const validateForm = () => {
    const errors = {};
    if (!formData.company_name) errors.company_name = 'Company name is required';
    if (!formData.company_code) errors.company_code = 'Company code is required';
    if (!formData.phone_number) errors.phone_number = 'Phone number is required';
    if (!formData.email_id) errors.email_id = 'Email is required';
    if (!editingCompany && !formData.admin_password) errors.admin_password = 'Admin password is required';
    if (!editingCompany && formData.admin_password && formData.admin_password.length < 6) errors.admin_password = 'Password must be at least 6 characters';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return toast.error('Please fix all errors');
    
    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('company_name', formData.company_name);
      submitData.append('company_code', formData.company_code);
      submitData.append('establishment_year', formData.establishment_year || '');
      submitData.append('pan', formData.pan || '');
      submitData.append('cin', formData.cin || '');
      submitData.append('gst_no', formData.gst_no || '');
      
      const address = {
        street: formData.street, building_no: formData.building_no, district: formData.district,
        city: formData.city, state: formData.state, country: formData.country, pincode: formData.pincode
      };
      submitData.append('address', JSON.stringify(address));
      submitData.append('phone_number', formData.phone_number);
      submitData.append('email_id', formData.email_id);
      submitData.append('company_type', formData.company_type || '');
      
      if (!editingCompany) submitData.append('admin_password', formData.admin_password);
      if (formData.logo) submitData.append('logo', formData.logo);

      const token = localStorage.getItem('token');
      const config = { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } };
      
      const response = editingCompany 
        ? await axios.put(`${API_URL}/companies/${editingCompany.company_id}`, submitData, config)
        : await axios.post(`${API_URL}/companies`, submitData, config);

      if (response.data.success) {
        toast.success(editingCompany ? 'Company updated successfully' : 'Company created successfully');
        resetForm();
        fetchCompanies();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '', company_code: '', logo: null, logoPreview: null, establishment_year: '', 
      pan: '', cin: '', gst_no: '', street: '', building_no: '', district: '', city: '', state: '', 
      country: '', pincode: '', phone_number: '', email_id: '', company_type: '', admin_password: ''
    });
    setFormErrors({});
    setEditingCompany(null);
    setIsFormOpen(false);
  };

  // 🛠️ FIXED: Robust JSON address parsing function
  const parseAddress = (addressData) => {
    let defaultAddress = { street: '', building_no: '', district: '', city: '', state: '', country: '', pincode: '' };
    if (!addressData) return defaultAddress;
    
    try {
      // If it's already an object, return it merged with defaults
      if (typeof addressData === 'object') {
        return { ...defaultAddress, ...addressData };
      }
      // If it's a string, try to parse it as JSON
      if (typeof addressData === 'string') {
        try {
          const parsed = JSON.parse(addressData);
          return { ...defaultAddress, ...parsed };
        } catch (e) {
          // If JSON parse fails, fallback to comma split
          const parts = addressData.split(',').map(s => s.trim());
          if (parts.length >= 3) {
            return {
              street: parts[0] || '', building_no: parts[1] || '', district: parts[2] || '',
              city: parts[3] || '', state: parts[4] || '', country: parts[5] || '', pincode: parts[6] || ''
            };
          }
          return { ...defaultAddress, street: addressData };
        }
      }
    } catch (error) {
      console.error("Error parsing address:", error);
    }
    
    return defaultAddress;
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    const addressData = parseAddress(company.address);
    
    setFormData({
      company_name: company.company_name || '', company_code: company.company_code || '',
      logo: null, logoPreview: company.logo_url || null, establishment_year: company.establishment_year || '',
      pan: company.pan || '', cin: company.cin || '', gst_no: company.gst_no || '',
      ...addressData, phone_number: company.phone_number || '', email_id: company.email_id || '',
      company_type: company.company_type || '', admin_password: ''
    });
    setIsViewOpen(false); // Close view if open
    setIsFormOpen(true);
  };

  const handleView = (company) => {
    setViewingCompany(company);
    setIsViewOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      try {
        const response = await axios.delete(`${API_URL}/companies/${id}`, getAuthHeaders());
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

  const getAvatarGradient = (name) => {
    const gradients = [
      'linear-gradient(135deg, #2563eb, #3b82f6)',
      'linear-gradient(135deg, #7c3aed, #8b5cf6)',
      'linear-gradient(135deg, #10b981, #34d399)',
      'linear-gradient(135deg, #f59e0b, #fbbf24)',
      'linear-gradient(135deg, #ec4899, #f472b6)',
      'linear-gradient(135deg, #6366f1, #818cf8)'
    ];
    const charCode = name ? name.charCodeAt(0) : 0;
    return gradients[charCode % gradients.length];
  };

  const inputClass = "w-full px-3 py-2 text-[12.5px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all";
  const labelClass = "block text-[11px] font-medium text-gray-500 mb-1";
  
  const viewLabelClass = "text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1.5";
  const viewValueClass = "text-[14px] font-medium text-gray-800";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        .dash-root * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          box-sizing: border-box;
        }
        .dash-card {
          background: #fff;
          border: 1px solid #f0f0f0;
          border-radius: 10px;
          transition: box-shadow 0.15s;
        }
        .dash-card:hover {
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .dash-table-row {
          transition: background 0.1s;
        }
        .dash-table-row:hover {
          background: #f9fafb;
        }

        /* Full Screen Modal Animations & Scrollbars */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInTop {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .modal-overlay {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .modal-container {
          animation: slideInTop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .modal-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .modal-scroll::-webkit-scrollbar-track {
          background: #f9fafb; 
          border-radius: 10px;
        }
        .modal-scroll::-webkit-scrollbar-thumb {
          background: #e5e7eb; 
          border-radius: 10px;
        }
        .modal-scroll::-webkit-scrollbar-thumb:hover {
          background: #d1d5db; 
        }
      `}</style>

      <div className="dash-root" style={{ padding: '28px 32px', background: '#fafbfc', minHeight: '100vh' }}>
        
        {/* ── PAGE HEADER ── */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '12.5px', color: '#9ca3af', marginBottom: '4px' }}>
              <span>Settings</span>
              <FiChevronRight style={{ margin: '0 4px' }} />
              <span>Companies</span>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiBriefcase style={{ color: '#2563eb' }} /> Companies
            </h1>
            <p style={{ fontSize: '12.5px', color: '#9ca3af', margin: '3px 0 0', fontWeight: 400 }}>
              Manage and track all your registered business entities
            </p>
          </div>
          <button
            onClick={() => { setEditingCompany(null); resetForm(); setIsFormOpen(true); }}
            style={{
              padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: '#fff',
              background: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.12s',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
          >
            <FiPlus /> Create Company
          </button>
        </div>

        {/* ── MAIN CONTENT CARD ── */}
        <div className="dash-card" style={{ overflow: 'hidden' }}>
          
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f5f5f5' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px 8px 36px', fontSize: '12.5px', color: '#111827',
                  background: '#fafbfc', border: '1px solid #f0f0f0', borderRadius: '6px', outline: 'none'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.1)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', background: '#f3f4f6', padding: '4px 10px', borderRadius: '5px' }}>
              {filteredCompanies.length} Records
            </span>
          </div>

          {/* Table Area */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid #f3f4f6', borderBottomColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px' }}>
              <div style={{ width: '64px', height: '64px', background: '#fafbfc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FiBriefcase style={{ fontSize: '24px', color: '#d1d5db' }} />
              </div>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>No companies found</h3>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 16px' }}>Get started by creating a new company entity.</p>
              <button onClick={() => setIsFormOpen(true)} style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>
                + Create Company
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafbfc' }}>
                  {['Company', 'Code', 'Contact', 'Type', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '10px 24px',
                      fontSize: '9.5px',
                      fontWeight: 600,
                      color: '#9ca3af',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      textAlign: i === 4 ? 'right' : 'left',
                      borderBottom: '1px solid #f3f4f6'
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company, i) => (
                  <tr key={company.company_id} className="dash-table-row">
                    <td style={{ padding: '12px 24px', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {company.logo_url ? (
                          <img src={company.logo_url} alt={company.company_name} style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '7px' }} />
                        ) : (
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '7px',
                            background: getAvatarGradient(company.company_name),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: 700, color: '#fff'
                          }}>
                            {company.company_name?.charAt(0)}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span 
                            onClick={() => handleView(company)} 
                            style={{ fontSize: '12.5px', fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                          >
                            {company.company_name}
                          </span>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Est. {company.establishment_year || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 24px', borderBottom: '1px solid #f5f5f5' }}>
                      <span style={{ padding: '3px 9px', fontSize: '10.5px', fontWeight: 600, color: '#374151', background: '#f3f4f6', borderRadius: '5px' }}>
                        {company.company_code}
                      </span>
                    </td>
                    <td style={{ padding: '12px 24px', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {company.email_id && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#6b7280' }}>
                            <FiMail style={{ color: '#9ca3af' }} /> {company.email_id}
                          </div>
                        )}
                        {company.phone_number && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#6b7280' }}>
                            <FiPhone style={{ color: '#9ca3af' }} /> {company.phone_number}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 24px', borderBottom: '1px solid #f5f5f5' }}>
                      {company.company_type ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '3px 9px', borderRadius: '5px', fontSize: '10.5px', fontWeight: 600,
                          textTransform: 'capitalize',
                          background: company.company_type === 'manufacturing' ? '#eff6ff' : company.company_type === 'service' ? '#f0fdf4' : '#faf5ff',
                          color: company.company_type === 'manufacturing' ? '#2563eb' : company.company_type === 'service' ? '#16a34a' : '#7c3aed'
                        }}>
                          {company.company_type}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#9ca3af' }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 24px', borderBottom: '1px solid #f5f5f5', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(company)}
                          style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderRadius = '5px'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'none'; }}
                        >
                          <FiEdit2 style={{ fontSize: '14px' }} />
                        </button>
                        <button
                          onClick={() => handleDelete(company.company_id)}
                          style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderRadius = '5px'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'none'; }}
                        >
                          <FiTrash2 style={{ fontSize: '14px' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── FULL SCREEN VIEW MODAL ── */}
      {isViewOpen && viewingCompany && (
        <div 
          className="modal-overlay"
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 50, 
            background: 'rgba(255, 255, 255, 1)' 
          }}
        >
          <div 
            className="modal-container"
            style={{ 
              position: 'relative', 
              width: '100%', 
              height: '100vh',
              background: '#fafbfc', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden'
            }}
          >
            
            {/* View Header */}
            <div style={{ 
              padding: '24px 40px', 
              borderBottom: '1px solid #e5e7eb', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {viewingCompany.logo_url ? (
                  <img src={viewingCompany.logo_url} alt="logo" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #f0f0f0' }} />
                ) : (
                  <div style={{ 
                    width: '56px', height: '56px', borderRadius: '10px', 
                    background: getAvatarGradient(viewingCompany.company_name), 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '24px', fontWeight: 700, color: '#fff' 
                  }}>
                    {viewingCompany.company_name?.charAt(0)}
                  </div>
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                    <span>Settings</span>
                    <FiChevronRight style={{ margin: '0 4px' }} />
                    <span>Companies</span>
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                    {viewingCompany.company_name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280', background: '#f3f4f6', padding: '3px 8px', borderRadius: '4px' }}>
                      Code: {viewingCompany.company_code}
                    </span>
                    {viewingCompany.company_type && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '3px 9px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                        textTransform: 'capitalize',
                        background: viewingCompany.company_type === 'manufacturing' ? '#eff6ff' : viewingCompany.company_type === 'service' ? '#f0fdf4' : '#faf5ff',
                        color: viewingCompany.company_type === 'manufacturing' ? '#2563eb' : viewingCompany.company_type === 'service' ? '#16a34a' : '#7c3aed'
                      }}>
                        {viewingCompany.company_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => handleEdit(viewingCompany)} 
                  style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 600, color: '#fff', background: '#2563eb', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)' }}
                >
                  <FiEdit2 /> Edit
                </button>
                <button 
                  onClick={() => setIsViewOpen(false)} 
                  style={{ padding: '10px', color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <FiX style={{ fontSize: '18px' }} />
                </button>
              </div>
            </div>

            {/* View Body */}
            <div className="modal-scroll" style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
              <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                
                {/* LEFT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Basic Info */}
                  <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f5f5f5', paddingBottom: '12px' }}>
                      <FiInfo style={{ marginRight: '8px', color: '#2563eb' }} /> Basic Information
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <div>
                        <div className={viewLabelClass}><FiTag /> Company Code</div>
                        <div className={viewValueClass}>{viewingCompany.company_code || 'N/A'}</div>
                      </div>
                      <div>
                        <div className={viewLabelClass}><FiCalendar /> Establishment Year</div>
                        <div className={viewValueClass}>{viewingCompany.establishment_year || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Tax & Compliance */}
                  <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f5f5f5', paddingBottom: '12px' }}>
                      <FiFileText style={{ marginRight: '8px', color: '#2563eb' }} /> Tax & Compliance
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                      <div>
                        <div className={viewLabelClass}>PAN Number</div>
                        <div className={viewValueClass}>{viewingCompany.pan || 'N/A'}</div>
                      </div>
                      <div>
                        <div className={viewLabelClass}>CIN</div>
                        <div className={viewValueClass}>{viewingCompany.cin || 'N/A'}</div>
                      </div>
                      <div>
                        <div className={viewLabelClass}>GST Number</div>
                        <div className={viewValueClass}>{viewingCompany.gst_no || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* RIGHT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Contact Details */}
                  <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f5f5f5', paddingBottom: '12px' }}>
                      <FiPhone style={{ marginRight: '8px', color: '#2563eb' }} /> Contact Details
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                      <div>
                        <div className={viewLabelClass}><FiMail /> Email Address</div>
                        <div className={viewValueClass}>{viewingCompany.email_id || 'N/A'}</div>
                      </div>
                      <div>
                        <div className={viewLabelClass}><FiPhone /> Phone Number</div>
                        <div className={viewValueClass}>{viewingCompany.phone_number || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f5f5f5', paddingBottom: '12px' }}>
                      <FiHome style={{ marginRight: '8px', color: '#2563eb' }} /> Registered Address
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      {(() => {
                        const addr = parseAddress(viewingCompany.address);
                        return (
                          <>
                            <div style={{ gridColumn: 'span 2' }}>
                              <div className={viewLabelClass}><FiMapPin /> Street</div>
                              <div className={viewValueClass}>{addr.street || 'N/A'}</div>
                            </div>
                            <div>
                              <div className={viewLabelClass}>Building No</div>
                              <div className={viewValueClass}>{addr.building_no || 'N/A'}</div>
                            </div>
                            <div>
                              <div className={viewLabelClass}>District</div>
                              <div className={viewValueClass}>{addr.district || 'N/A'}</div>
                            </div>
                            <div>
                              <div className={viewLabelClass}>City</div>
                              <div className={viewValueClass}>{addr.city || 'N/A'}</div>
                            </div>
                            <div>
                              <div className={viewLabelClass}>State / Province</div>
                              <div className={viewValueClass}>{addr.state || 'N/A'}</div>
                            </div>
                            <div>
                              <div className={viewLabelClass}>Country</div>
                              <div className={viewValueClass}>{addr.country || 'N/A'}</div>
                            </div>
                            <div>
                              <div className={viewLabelClass}>Pincode / ZIP</div>
                              <div className={viewValueClass}>{addr.pincode || 'N/A'}</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FULL SCREEN EDIT MODAL ── */}
      {isFormOpen && (
        <div 
          className="modal-overlay"
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 50, 
            background: 'rgba(255, 255, 255, 1)' 
          }}
        >
          <div 
            className="modal-container"
            style={{ 
              position: 'relative', 
              width: '100%', 
              height: '100vh',
              background: '#fafbfc', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden'
            }}
          >
            
            {/* Modal Header */}
            <div style={{ 
              padding: '16px 40px', 
              borderBottom: '1px solid #e5e7eb', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              zIndex: 10
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                  <span>Settings</span>
                  <FiChevronRight style={{ margin: '0 4px' }} />
                  <span>Companies</span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                  {editingCompany ? 'Edit Company' : 'Create New Company'}
                </h2>
              </div>
              <button 
                onClick={resetForm} 
                style={{ 
                  padding: '10px', 
                  color: '#6b7280', 
                  background: '#f9fafb', 
                  border: '1px solid #e5e7eb', 
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.12s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#ef4444'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                <FiX style={{ fontSize: '18px' }} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="modal-scroll" style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
              <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
                
                {/* LEFT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  
                  {/* Section: Basic Info */}
                  <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f5f5f5', paddingBottom: '12px' }}>
                      <FiInfo style={{ marginRight: '8px', color: '#2563eb' }} /> Basic Information
                    </h3>
                    
                    <div style={{ marginBottom: '24px' }}>
                      <label className={labelClass}>Company Logo</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {formData.logoPreview ? (
                          <div style={{ position: 'relative' }}>
                            <img src={formData.logoPreview} alt="Logo preview" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #f0f0f0' }} />
                            <button type="button" onClick={removeLogo} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#fff', border: '1px solid #f0f0f0', color: '#6b7280', borderRadius: '50%', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FiX style={{ fontSize: '12px' }} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ width: '64px', height: '64px', background: '#fafbfc', borderRadius: '8px', border: '1px dashed #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FiUpload style={{ color: '#9ca3af', fontSize: '20px' }} />
                          </div>
                        )}
                        <div>
                          <label style={{ cursor: 'pointer', display: 'inline-block', padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: '#374151', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                            Upload Logo
                            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                          </label>
                          <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>PNG, JPG up to 5MB</p>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label className={labelClass}>Company Name *</label>
                        <input type="text" name="company_name" value={formData.company_name} onChange={handleInputChange} className={inputClass} placeholder="Acme Corp" />
                        {formErrors.company_name && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>{formErrors.company_name}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Company Code *</label>
                        <input type="text" name="company_code" value={formData.company_code} onChange={handleInputChange} className={inputClass} placeholder="ACME001" />
                        {formErrors.company_code && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>{formErrors.company_code}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Establishment Year</label>
                        <input type="number" name="establishment_year" value={formData.establishment_year} onChange={handleInputChange} className={inputClass} placeholder="2020" />
                      </div>
                      <div>
                        <label className={labelClass}>Company Type</label>
                        <select name="company_type" value={formData.company_type} onChange={handleInputChange} className={inputClass}>
                          <option value="">Select Type</option>
                          <option value="manufacturing">Manufacturing</option>
                          <option value="service">Service</option>
                          <option value="both">Both</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section: Tax & Compliance */}
                  <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f5f5f5', paddingBottom: '12px' }}>
                      <FiFileText style={{ marginRight: '8px', color: '#2563eb' }} /> Tax & Compliance
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                      <div>
                        <label className={labelClass}>PAN Number</label>
                        <input type="text" name="pan" value={formData.pan} onChange={handleInputChange} className={inputClass} placeholder="ABCDE1234F" />
                      </div>
                      <div>
                        <label className={labelClass}>CIN</label>
                        <input type="text" name="cin" value={formData.cin} onChange={handleInputChange} className={inputClass} placeholder="U12345XX2020PTC123456" />
                      </div>
                      <div>
                        <label className={labelClass}>GST Number</label>
                        <input type="text" name="gst_no" value={formData.gst_no} onChange={handleInputChange} className={inputClass} placeholder="22ABCDE1234F1Z5" />
                      </div>
                    </div>
                  </div>

                </div>

                {/* RIGHT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  
                  {/* Section: Contact Details */}
                  <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f5f5f5', paddingBottom: '12px' }}>
                      <FiPhone style={{ marginRight: '8px', color: '#2563eb' }} /> Contact Details
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                      <div>
                        <label className={labelClass}>Phone Number *</label>
                        <input type="text" name="phone_number" value={formData.phone_number} onChange={handleInputChange} className={inputClass} placeholder="+1 234 567 890" />
                        {formErrors.phone_number && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>{formErrors.phone_number}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Email Address *</label>
                        <input type="email" name="email_id" value={formData.email_id} onChange={handleInputChange} className={inputClass} placeholder="contact@acmecorp.com" />
                        {formErrors.email_id && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>{formErrors.email_id}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Section: Address */}
                  <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f5f5f5', paddingBottom: '12px' }}>
                      <FiHome style={{ marginRight: '8px', color: '#2563eb' }} /> Registered Address
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className={labelClass}>Street</label>
                        <input type="text" name="street" value={formData.street} onChange={handleInputChange} className={inputClass} placeholder="123 Main St" />
                      </div>
                      <div>
                        <label className={labelClass}>Building No</label>
                        <input type="text" name="building_no" value={formData.building_no} onChange={handleInputChange} className={inputClass} placeholder="Suite 400" />
                      </div>
                      <div>
                        <label className={labelClass}>District</label>
                        <input type="text" name="district" value={formData.district} onChange={handleInputChange} className={inputClass} placeholder="Central" />
                      </div>
                      <div>
                        <label className={labelClass}>City</label>
                        <input type="text" name="city" value={formData.city} onChange={handleInputChange} className={inputClass} placeholder="Metropolis" />
                      </div>
                      <div>
                        <label className={labelClass}>State / Province</label>
                        <input type="text" name="state" value={formData.state} onChange={handleInputChange} className={inputClass} placeholder="State" />
                      </div>
                      <div>
                        <label className={labelClass}>Country</label>
                        <input type="text" name="country" value={formData.country} onChange={handleInputChange} className={inputClass} placeholder="United States" />
                      </div>
                      <div>
                        <label className={labelClass}>Pincode / ZIP</label>
                        <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} className={inputClass} placeholder="12345" />
                      </div>
                    </div>
                  </div>

                  {/* Section: Admin Setup (Only for Create) */}
                  {!editingCompany && (
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f5f5f5', paddingBottom: '12px' }}>
                        <FiBriefcase style={{ marginRight: '8px', color: '#2563eb' }} /> Admin Setup
                      </h3>
                      <div>
                        <label className={labelClass}>Admin Password *</label>
                        <input type="password" name="admin_password" value={formData.admin_password} onChange={handleInputChange} className={inputClass} placeholder="Set initial admin password" />
                        {formErrors.admin_password && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>{formErrors.admin_password}</p>}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div style={{ 
              padding: '16px 40px', 
              background: '#fff', 
              borderTop: '1px solid #e5e7eb', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '12px',
              boxShadow: '0 -1px 3px rgba(0,0,0,0.03)',
              zIndex: 10
            }}>
              <button 
                type="button" 
                onClick={resetForm} 
                style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 600, color: '#374151', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 600, color: '#fff', background: '#2563eb', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: isSubmitting ? 0.7 : 1, boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)' }}
              >
                {isSubmitting ? 'Saving...' : (editingCompany ? 'Save Changes' : 'Create Company')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompanyPage;