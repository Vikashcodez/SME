import api from './api';

export const masterService = {
  
  getDashboardMetrics: (params) => api.get('/modules/dashboard/kpi-metrics', { params }),

  
  getCompanyProfile: () => api.get('/modules/masters/company-profile'),
  updateCompanyProfile: (data) => api.put('/modules/masters/company-profile', data),
  getBranches: () => api.get('/modules/masters/branches'),
  getBranchDetail: (id) => api.get(`/modules/masters/branches/${id}/detail`),
  createBranch: (data) => api.post('/modules/masters/branches', data),
  updateBranch: (id, data) => api.put(`/modules/masters/branches/${id}`, data),
  deleteBranch: (id) => api.delete(`/modules/masters/branches/${id}`),

  
  getCountries: () => api.get('/modules/masters/countries'),
  getStatesByCountry: (countryId) => api.get(`/modules/masters/countries/${countryId}/states`),
  lookupCountry: (countryName) => api.get(`/modules/masters/lookup/country/${encodeURIComponent(countryName)}`),
  getNextDocNumber: (docType) => api.get(`/modules/masters/number-series/${encodeURIComponent(docType)}`),
  getCurrencies: () => api.get('/modules/masters/currencies'),

  
  getNumberSeriesList: () => api.get('/modules/masters/number-series'),
  updateNumberSeries: (id, data) => api.put(`/modules/masters/number-series/${id}`, data),
  resetNumberSeries: (id) => api.post(`/modules/masters/number-series/${id}/reset`),

  
  getUoms: () => api.get('/modules/masters/uoms'),
  createUom: (data) => api.post('/modules/masters/uoms', data),
  getDepartments: () => api.get('/modules/masters/departments'),
  createDepartment: (data) => api.post('/modules/masters/departments', data),
  getDesignations: () => api.get('/modules/masters/designations'),
  createDesignation: (data) => api.post('/modules/masters/designations', data),

  
  getLedgerGroups: () => api.get('/modules/accounts/groups'),
  getLedgers: (params) => api.get('/modules/accounts/ledgers', { params }),
  createLedger: (data) => api.post('/modules/accounts/ledgers', data),
  getVouchers: (params) => api.get('/modules/accounts/vouchers', { params }),
  createVoucher: (data) => api.post('/modules/accounts/vouchers', data),
  getTrialBalance: (params) => api.get('/modules/accounts/trial-balance', { params }),
  getProfitLoss: (params) => api.get('/modules/accounts/profit-loss', { params }),
  getBalanceSheet: (params) => api.get('/modules/accounts/balance-sheet', { params }),
  downloadTallyXml: () => {
    window.open(`${api.defaults.baseURL}/modules/accounts/export-tally-xml?token=${localStorage.getItem('token')}`, '_blank');
  },

  
  getCustomers: (params) => api.get('/modules/sales/customers', { params }),
  createCustomer: (data) => api.post('/modules/sales/customers', data),
  getSalesOrders: (params) => api.get('/modules/sales/orders', { params }),
  getSalesOrderById: (id) => api.get(`/modules/sales/orders/${id}`),
  createSalesOrder: (data) => api.post('/modules/sales/orders', data),
  getSalesInvoices: (params) => api.get('/modules/sales/invoices', { params }),
  convertOrderToInvoice: (orderId) => api.post('/modules/sales/convert-order-to-invoice', { orderId }),

  
  getVendors: (params) => api.get('/modules/procurement/vendors', { params }),
  createVendor: (data) => api.post('/modules/procurement/vendors', data),
  getPurchaseOrders: (params) => api.get('/modules/procurement/orders', { params }),
  createPurchaseOrder: (data) => api.post('/modules/procurement/orders', data),
  getGoodsReceipts: () => api.get('/modules/procurement/grn'),

  
  getProducts: (params) => api.get('/modules/inventory/products', { params }),
  getProductById: (id) => api.get(`/modules/inventory/products/${id}`),
  createProduct: (data) => api.post('/modules/inventory/products', data),
  updateProduct: (id, data) => api.put(`/modules/inventory/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/modules/inventory/products/${id}`),
  getWarehouses: () => api.get('/modules/inventory/warehouses'),
  createWarehouse: (data) => api.post('/modules/inventory/warehouses', data),
  getStockLedger: (params) => api.get('/modules/inventory/stock-ledger', { params }),
  getStockTransfers: () => api.get('/modules/inventory/stock-transfers'),
  createStockTransfer: (data) => api.post('/modules/inventory/stock-transfers', data),

  
  getWorkCenters: () => api.get('/modules/manufacturing/work-centers'),
  getBoms: () => api.get('/modules/manufacturing/boms'),
  getBomById: (id) => api.get(`/modules/manufacturing/boms/${id}`),
  createBom: (data) => api.post('/modules/manufacturing/boms', data),
  getWorkOrders: (params) => api.get('/modules/manufacturing/work-orders', { params }),
  createWorkOrder: (data) => api.post('/modules/manufacturing/work-orders', data),
  updateWorkOrderStatus: (id, data) => api.patch(`/modules/manufacturing/work-orders/${id}/status`, data),
  logProduction: (id, data) => api.post(`/modules/manufacturing/work-orders/${id}/log-output`, data),

  
  getQcInspections: (params) => api.get('/modules/quality/inspections', { params }),
  createQcInspection: (data) => api.post('/modules/quality/inspections', data),
  updateQcInspection: (id, data) => api.put(`/modules/quality/inspections/${id}`, data),
  getNcrReports: (params) => api.get('/modules/quality/ncr', { params }),
  createNcrReport: (data) => api.post('/modules/quality/ncr', data),
  updateNcrReport: (id, data) => api.put(`/modules/quality/ncr/${id}`, data),

  
  getEmployees: (params) => api.get('/modules/hr/employees', { params }),
  getEmployeeById: (id) => api.get(`/modules/hr/employees/${id}`),
  createEmployee: (data) => api.post('/modules/hr/employees', data),
  updateEmployee: (id, data) => api.put(`/modules/hr/employees/${id}`, data),
  deleteEmployee: (id) => api.delete(`/modules/hr/employees/${id}`),
  getAttendanceLogs: (params) => api.get('/modules/hr/attendance', { params }),
  createAttendanceLog: (data) => api.post('/modules/hr/attendance', data),
  getPayrollRuns: () => api.get('/modules/hr/payroll-runs'),
  createPayrollRun: (data) => api.post('/modules/hr/payroll-runs', data),
  getPayslips: (params) => api.get('/modules/hr/payslips', { params }),

  
  getHsnSacCodes: () => api.get('/modules/taxation/hsn-sac'),
  getGstr1Summary: () => api.get('/modules/taxation/gstr1'),
  generateInvoiceIrn: (data) => api.post('/modules/taxation/generate-irn', data),
  getStatutorySchedules: () => api.get('/modules/taxation/schedules'),

  
  getAuditTrail: (params) => api.get('/modules/compliance/audit-trail', { params }),
  getComplianceCalendar: () => api.get('/modules/compliance/calendar'),
  getItcRecon: () => api.get('/modules/compliance/itc-recon'),

  
  getDispatches: (params) => api.get('/modules/logistics/schedules', { params }),
  createDispatch: (data) => api.post('/modules/logistics/schedules', data),
  updateDispatch: (id, data) => api.put(`/modules/logistics/schedules/${id}`, data),
  getTracking: (params) => api.get('/modules/logistics/tracking', { params }),
  createTracking: (data) => api.post('/modules/logistics/tracking', data),
  updateTracking: (id, data) => api.put(`/modules/logistics/tracking/${id}`, data),
  getFleetLogs: () => api.get('/modules/logistics/fleet'),
  createFleetLog: (data) => api.post('/modules/logistics/fleet', data),
  getFreightBookings: () => api.get('/modules/logistics/freight'),
  createFreightBooking: (data) => api.post('/modules/logistics/freight', data),
  getTransporters: () => api.get('/modules/logistics/transporters'),
  createTransporter: (data) => api.post('/modules/logistics/transporters', data),
  getRoutes: () => api.get('/modules/logistics/routes'),
  getEwayBills: () => api.get('/modules/logistics/eway-bills'),
  createEwayBill: (data) => api.post('/modules/logistics/eway-bills', data),

  
  getAssets: (params) => api.get('/modules/assets', { params }),
  getAssetById: (id) => api.get(`/modules/assets/${id}`),
  createAsset: (data) => api.post('/modules/assets', data),
  updateAsset: (id, data) => api.put(`/modules/assets/${id}`, data),
  disposeAsset: (id, data) => api.post(`/modules/assets/${id}/dispose`, data),
  getDepreciationSchedule: () => api.get('/modules/assets/reports/depreciation'),
  getMaintenanceSchedules: () => api.get('/modules/assets/maintenance/schedules'),
  updateMaintenanceDueDate: (id, data) => api.put(`/modules/assets/maintenance/schedules/${id}`, data),
  getCalibrationRecords: () => api.get('/modules/assets/calibration/records'),

  
  getProjects: (params) => api.get('/modules/projects', { params }),
  getProjectById: (id) => api.get(`/modules/projects/${id}`),
  createProject: (data) => api.post('/modules/projects', data),
  updateProject: (id, data) => api.put(`/modules/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/modules/projects/${id}`),
  getProjectMilestones: (params) => api.get('/modules/projects/milestones/list', { params }),
  createProjectMilestone: (data) => api.post('/modules/projects/milestones', data),
  getProjectTasks: (params) => api.get('/modules/projects/tasks/list', { params }),
  createProjectTask: (data) => api.post('/modules/projects/tasks', data),
  getProjectTimesheets: (params) => api.get('/modules/projects/timesheets/list', { params }),
  createProjectTimesheet: (data) => api.post('/modules/projects/timesheets', data),

  
  uploadDocument: (data) => api.post('/uploads', data),
  getEntityDocuments: (entityType, entityId) => api.get(`/uploads/${entityType}/${entityId}`),
  deleteDocument: (id) => api.delete(`/uploads/${id}`),

  
  listUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
  updateUserRole: (id, role) => api.put(`/auth/users/${id}/role`, { role }),
  deactivateUser: (id) => api.delete(`/auth/users/${id}`),
};

export default masterService;
