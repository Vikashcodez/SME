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

export const employees = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  resetPassword: (id) => api.put(`/employees/reset-password/${id}`),
  changePassword: (id, data) => api.put(`/employees/change-password/${id}`, data),
};

export const vendors = {
  getAll: (params) => api.get('/vendors', { params }),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
  restore: (id) => api.put(`/vendors/${id}/restore`),
  getStats: (params) => api.get('/vendors/stats/summary', { params }),
};

export const rawMaterials = {
  getAll: (params) => api.get('/raw-materials', { params }),
  getById: (id) => api.get(`/raw-materials/${id}`),
  create: (data) => api.post('/raw-materials', data),
  update: (id, data) => api.put(`/raw-materials/${id}`, data),
  delete: (id) => api.delete(`/raw-materials/${id}`),
  restore: (id) => api.put(`/raw-materials/${id}/restore`),
  getCategories: (params) => api.get('/raw-materials/categories', { params }),
};

export const rawMaterialInventory = {
  getOverview: (params) => api.get('/raw-material-inventory', { params }),
  recordMovement: (data) => {
    if (data instanceof FormData) {
      return api.post('/raw-material-inventory/movement', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post('/raw-material-inventory/movement', data);
  },
  uploadInvoice: (formData) => api.post('/raw-material-inventory/upload-invoice', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMovements: (params) => api.get('/raw-material-inventory/movements', { params }),
  recordReturn: (data) => api.post('/raw-material-inventory/returns', data),
  getReturns: (params) => api.get('/raw-material-inventory/returns', { params }),
  updateReturnStatus: (id, data) => api.put(`/raw-material-inventory/returns/${id}`, data),
  getStats: (params) => api.get('/raw-material-inventory/stats/summary', { params }),
};

export const assets = {
  getAll: (params) => api.get('/assets', { params }),
  getById: (id) => api.get(`/assets/${id}`),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  delete: (id) => api.delete(`/assets/${id}`),
  recordMaintenance: (id, data) => api.post(`/assets/${id}/maintenance`, data),
  recordDamageOrReturn: (id, data) => api.post(`/assets/${id}/damage-returns`, data),
  getDamageReturns: (params) => api.get('/assets/damage-returns', { params }),
  getStats: (params) => api.get('/assets/stats/summary', { params }),
};

export const products = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => {
    if (data instanceof FormData) {
      return api.post('/products', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post('/products', data);
  },
  update: (id, data) => {
    if (data instanceof FormData) {
      return api.put(`/products/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.put(`/products/${id}`, data);
  },
  delete: (id) => api.delete(`/products/${id}`),
  restore: (id) => api.put(`/products/${id}/restore`),
  getCategories: (params) => api.get('/products/categories', { params }),
};

export const production = {
  checkMaterials: (params) => api.get('/production/check-materials', { params }),
  recordRun: (data) => api.post('/production', data),
  getAll: (params) => api.get('/production', { params }),
  getById: (id) => api.get(`/production/${id}`),
  getStats: (params) => api.get('/production/stats/summary', { params }),
};

export default api;