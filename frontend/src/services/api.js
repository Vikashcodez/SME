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
  getBatches: (params) => api.get('/raw-material-inventory/batches', { params }),
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

// ==========================================
// 17-TABLE MANUFACTURING & INVENTORY MODULES
// ==========================================

export const categories = {
  getRawMaterials: (params) => api.get('/categories/raw-materials', { params }),
  createRawMaterial: (data) => api.post('/categories/raw-materials', data),
  updateRawMaterial: (id, data) => api.put(`/categories/raw-materials/${id}`, data),
  deleteRawMaterial: (id) => api.delete(`/categories/raw-materials/${id}`),
  getProducts: (params) => api.get('/categories/products', { params }),
  createProduct: (data) => api.post('/categories/products', data),
  updateProduct: (id, data) => api.put(`/categories/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/categories/products/${id}`),
};

export const grn = {
  getAll: (params) => api.get('/grn', { params }),
  getById: (id) => api.get(`/grn/${id}`),
  create: (data) => {
    if (data instanceof FormData) {
      return api.post('/grn', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post('/grn', data);
  },
  update: (id, data) => api.put(`/grn/${id}`, data),
};

export const productionMasters = {
  getAll: (params) => api.get('/production-masters', { params }),
  getById: (id) => api.get(`/production-masters/${id}`),
  create: (data) => api.post('/production-masters', data),
  update: (id, data) => api.put(`/production-masters/${id}`, data),
};

export const productionOrders = {
  calculateRequirements: (params) => api.get('/production-orders/calculate-requirements', { params }),
  getAll: (params) => api.get('/production-orders', { params }),
  getById: (id) => api.get(`/production-orders/${id}`),
  create: (data) => api.post('/production-orders', data),
  start: (id) => api.post(`/production-orders/${id}/start`),
  completeBatch: (batchId, data) => api.post(`/production-orders/batches/${batchId}/complete`, data),
};

export const qualityChecks = {
  getAll: (params) => api.get('/quality-checks', { params }),
  getPendingBatches: (params) => api.get('/quality-checks/pending-batches', { params }),
  record: (data) => api.post('/quality-checks', data),
  getReworks: (params) => api.get('/quality-checks/reworks', { params }),
  completeRework: (reworkId, data) => api.post(`/quality-checks/reworks/${reworkId}/complete`, data),
  sendToRework: (reworkId, data) => api.post(`/quality-checks/reworks/${reworkId}/send-rework`, data),
  scrapProduct: (reworkId, data) => api.post(`/quality-checks/reworks/${reworkId}/scrap`, data),
};

export const productInventory = {
  getAll: (params) => api.get('/product-inventory', { params }),
  getGrouped: (params) => api.get('/product-inventory/grouped', { params }),
  getSummary: (params) => api.get('/product-inventory/summary', { params }),
  updateBatch: (id, data) => api.put(`/product-inventory/${id}`, data),
};

export const customers = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
};

export const accounting = {
  getChartOfAccounts: (params) => api.get('/accounting/chart-of-accounts', { params }),
  getGroups: (params) => api.get('/accounting/groups', { params }),
  createGroup: (data) => api.post('/accounting/groups', data),
  getLedgers: (params) => api.get('/accounting/ledgers', { params }),
  createLedger: (data) => api.post('/accounting/ledgers', data),
  getLedgerStatement: (ledgerId, params) => api.get(`/accounting/ledgers/${ledgerId}/statement`, { params }),
  getBankAccounts: (params) => api.get('/accounting/bank-accounts', { params }),
  createBankAccount: (data) => api.post('/accounting/bank-accounts', data),
  getBankReconciliation: (params) => api.get('/accounting/bank-reconciliation', { params }),
  updateBankReconciliation: (data) => api.post('/accounting/bank-reconciliation', data),
  getCostCentres: (params) => api.get('/accounting/cost-centres', { params }),
  createCostCentre: (data) => api.post('/accounting/cost-centres', data),
  getBudgetVariance: (params) => api.get('/accounting/budgets/variance', { params }),
  getAccountingAuditLogs: (params) => api.get('/accounting/audit-logs', { params }),
  getFinancialYears: (params) => api.get('/accounting/financial-years', { params }),
  closeFinancialYear: (financialYearId, data) => api.post(`/accounting/financial-years/${financialYearId}/close`, data),
  setPeriodLock: (periodId, data) => api.post(`/accounting/periods/${periodId}/lock`, data),
  getVouchers: (params) => api.get('/accounting/vouchers', { params }),
  createVoucher: (data) => api.post('/accounting/vouchers', data),
  getVoucherById: (id) => api.get(`/accounting/vouchers/${id}`),
  getTrialBalance: (params) => api.get('/accounting/reports/trial-balance', { params }),
  getDayBook: (params) => api.get('/accounting/reports/day-book', { params }),
  getProfitAndLoss: (params) => api.get('/accounting/reports/profit-loss', { params }),
  getBalanceSheet: (params) => api.get('/accounting/reports/balance-sheet', { params }),
  getExpenses: (params) => api.get('/accounting/reports/expenses', { params }),
};

export const sales = {
  getInvoices: (params) => api.get('/sales/invoices', { params }),
  getInvoiceById: (id) => api.get(`/sales/invoices/${id}`),
  createInvoice: (data) => api.post('/sales/invoices', data),
  recordReceipt: (data) => api.post('/sales/receipts', data),
  getQuotations: (params) => api.get('/sales/quotations', { params }),
  createQuotation: (data) => api.post('/sales/quotations', data),
  convertQuotationToOrder: (id) => api.post(`/sales/quotations/${id}/convert-to-order`),
  getOrders: (params) => api.get('/sales/orders', { params }),
  createOrder: (data) => api.post('/sales/orders', data),
};

export const purchases = {
  getInvoices: (params) => api.get('/purchases/invoices', { params }),
  getInvoiceById: (id) => api.get(`/purchases/invoices/${id}`),
  getPendingGrns: (params) => api.get('/purchases/grns/pending', { params }),
  createInvoice: (data) => api.post('/purchases/invoices', data),
  recordPayment: (data) => api.post('/purchases/payments', data),
  getVendorBillsDue: (vendorId, params) => api.get(`/purchases/vendors/${vendorId}/outstanding-bills`, { params }),
};

export const manufacturingAccounting = {
  recordStockJournal: (data) => api.post('/manufacturing-accounting/stock-journal', data),
  recordScrap: (data) => api.post('/manufacturing-accounting/scrap', data),
  recordRework: (data) => api.post('/manufacturing-accounting/rework', data),
  getVouchers: (params) => api.get('/manufacturing-accounting/vouchers', { params }),
  getCostSummary: (params) => api.get('/manufacturing-accounting/cost-summary', { params }),
};

export const compliance = {
  getDashboard: (params) => api.get('/compliance/dashboard', { params }),
  getSettings: (params) => api.get('/compliance/settings', { params }),
  saveSettings: (data) => api.post('/compliance/settings', data),
  getRecords: (params) => api.get('/compliance/records', { params }),
  createPayroll: (data) => api.post('/compliance/payroll-runs', data),
  createChallan: (data) => api.post('/compliance/challans', data),
  getForm16: (params) => api.get('/compliance/form16', { params }),
  generateForm16: (data) => api.post('/compliance/form16/generate', data),
};

export default api;