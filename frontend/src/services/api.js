import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
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

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (data) => api.post('/auth/login', data),
  verify: () => api.get('/auth/verify'),
  getCurrentUser: () => api.get('/auth/me'),
};

export const companies = {
  getAll: () => api.get('/companies'),
  getById: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
};

export const branches = {
  getAll: (params) => api.get('/branches', { params }),
  getByCompany: (companyId) => api.get('/branches/company', { params: { company_id: companyId } }),
  getById: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
};

export const roles = {
  create: (data) => api.post('/roles/createRole', data),
  update: (id, data) => api.put(`/roles/updateRole/${id}`, data),
  getByBranch: (branchId, params) => api.get(`/roles/getRolesByBranch/${branchId}`, { params }),
  getById: (id) => api.get(`/roles/getRoleById/${id}`),
  softDelete: (id) => api.delete(`/roles/softDeleteRole/${id}`),
  restore: (id) => api.put(`/roles/restoreRole/${id}`),
};

export const departments = {
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  getByBranch: (branchId, params) => api.get(`/departments/branch/${branchId}`, { params }),
  getByBranchWithCount: (branchId, params) => api.get(`/departments/branch/${branchId}/with-count`, { params }),
  getById: (id) => api.get(`/departments/${id}`),
  softDelete: (id) => api.delete(`/departments/${id}`),
  restore: (id) => api.put(`/departments/${id}/restore`),
  bulkDelete: (data) => api.delete('/departments/bulk/delete', { data }),
};

export default api;