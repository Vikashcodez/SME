import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

let inMemoryAccessToken = localStorage.getItem('token') || null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getAccessToken = () => inMemoryAccessToken;

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const companyId = localStorage.getItem('activeCompanyId') || 'CO-0001';
    config.headers['X-Company-ID'] = companyId;
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    
    if (!error.response) {
      return Promise.reject(
        new ApiError('Network connection error. Please check your internet connection.', 0, 'NETWORK_ERROR')
      );
    }

    const { status, data } = error.response;
    const errCode = data?.error?.code || data?.code;

    
    if (status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login') && !originalRequest.url?.includes('/auth/refresh')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = refreshRes.data?.data?.token || refreshRes.data?.data?.accessToken;
        if (newToken) {
          setAccessToken(newToken);
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAccessToken(null);
        localStorage.removeItem('user');
        if (!window.location.hash.includes('/auth') && !window.location.hash.includes('/login')) {
          window.location.hash = '#/auth';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const message = data?.error?.message || data?.message || error.message || 'Request failed';
    const details = data?.error?.details || data?.errors;
    return Promise.reject(new ApiError(message, status, errCode, details));
  }
);

export const auth = {
  login: (data) => api.post('/auth/login', data),
  refresh: () => api.post('/auth/refresh'),
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

export const erp = {
  getSchema: () => api.get('/erp/schema'),
  listRecords: (entityKey, params = {}) => api.get(`/erp/entities/${entityKey}`, { params }),
  getRecord: (entityKey, id) => api.get(`/erp/entities/${entityKey}/${id}`),
  createRecord: (entityKey, data) => api.post(`/erp/entities/${entityKey}`, data),
  updateRecord: (entityKey, id, data) => api.put(`/erp/entities/${entityKey}/${id}`, data),
  deleteRecord: (entityKey, id) => api.delete(`/erp/entities/${entityKey}/${id}`),
  bulkImport: (entityKey, records) => api.post(`/erp/entities/${entityKey}/bulk-import`, { records }),
  convertRecord: (data) => api.post('/erp/convert', data),
  getMetrics: (params = {}) => api.get('/erp/metrics', { params }),
  askAI: (question) => api.post('/erp/ai/chat', { question }),
};

export default api;
