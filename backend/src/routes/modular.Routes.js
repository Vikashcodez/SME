import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { validate } from '../middleware/validate.js';
import { auditTrailMiddleware } from '../middleware/auditTrail.js';

import * as mastersCtrl from '../controllers/masters.Controller.js';
import * as dashCtrl from '../controllers/dashboard.Controller.js';
import * as accountsCtrl from '../controllers/accounts.Controller.js';
import * as salesCtrl from '../controllers/sales.Controller.js';
import * as procCtrl from '../controllers/procurement.Controller.js';
import * as invCtrl from '../controllers/inventory.Controller.js';
import * as mfgCtrl from '../controllers/manufacturing.Controller.js';
import * as hrCtrl from '../controllers/hr.Controller.js';
import * as qcCtrl from '../controllers/quality.Controller.js';
import * as taxCtrl from '../controllers/taxation.Controller.js';
import * as compCtrl from '../controllers/compliance.Controller.js';
import * as logCtrl from '../controllers/logistics.Controller.js';
import * as assetCtrl from '../controllers/assets.Controller.js';
import * as prjCtrl from '../controllers/projects.Controller.js';

import { createCustomerSchema, createSalesOrderSchema } from '../validators/sales.validators.js';
import { createVendorSchema, createPurchaseOrderSchema } from '../validators/procurement.validators.js';
import { createLedgerSchema, createVoucherSchema } from '../validators/accounts.validators.js';
import { createProductSchema, updateProductSchema, createWarehouseSchema, createStockTransferSchema } from '../validators/inventory.validators.js';
import { createBomSchema, createWorkOrderSchema, updateWorkOrderStatusSchema } from '../validators/manufacturing.validators.js';
import { createEmployeeSchema, updateEmployeeSchema, createAttendanceLogSchema, createPayrollRunSchema } from '../validators/hr.validators.js';
import { createQcInspectionSchema, createNcrReportSchema } from '../validators/quality.validators.js';
import { createDeliveryScheduleSchema, createFleetLogSchema, createFreightBookingSchema } from '../validators/logistics.validators.js';
import { createFixedAssetSchema, updateFixedAssetSchema } from '../validators/assets.validators.js';
import { createProjectSchema, updateProjectSchema, createProjectTaskSchema } from '../validators/projects.validators.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantMiddleware);

router.get('/dashboard/kpi-metrics', dashCtrl.getDashboardKpiMetrics);

router.get('/masters/countries', mastersCtrl.getCountries);
router.get('/masters/countries/:countryId/states', mastersCtrl.getStatesByCountry);
router.get('/masters/lookup/country/:countryName', mastersCtrl.lookupCountryDetails);
router.get('/masters/currencies', mastersCtrl.getCurrencies);

router.get('/masters/company-profile', mastersCtrl.getCompanyProfile);
router.put('/masters/company-profile', auditTrailMiddleware('companies'), mastersCtrl.updateCompanyProfile);

router.get('/masters/branches', mastersCtrl.getBranches);
router.get('/masters/branches/:id/detail', mastersCtrl.getBranchDetail);
router.post('/masters/branches', auditTrailMiddleware('branches'), mastersCtrl.createBranch);
router.put('/masters/branches/:id', auditTrailMiddleware('branches'), mastersCtrl.updateBranch);
router.delete('/masters/branches/:id', auditTrailMiddleware('branches'), mastersCtrl.deleteBranch);

router.get('/masters/number-series', mastersCtrl.getAllNumberSeries);
router.put('/masters/number-series/:id', auditTrailMiddleware('number_series'), mastersCtrl.updateNumberSeries);
router.post('/masters/number-series/:id/reset', auditTrailMiddleware('number_series'), mastersCtrl.resetNumberSeries);
router.get('/masters/number-series/:documentType', mastersCtrl.getNextDocumentNumber);

router.get('/masters/uoms', mastersCtrl.getUoms);
router.post('/masters/uoms', auditTrailMiddleware('uom_masters'), mastersCtrl.createUom);

router.get('/masters/departments', mastersCtrl.getDepartments);
router.post('/masters/departments', auditTrailMiddleware('departments'), mastersCtrl.createDepartment);
router.get('/masters/designations', mastersCtrl.getDesignations);
router.post('/masters/designations', auditTrailMiddleware('designations'), mastersCtrl.createDesignation);

router.get('/accounts/groups', accountsCtrl.getLedgerGroups);
router.get('/accounts/ledgers', accountsCtrl.getLedgers);
router.post('/accounts/ledgers', validate(createLedgerSchema), auditTrailMiddleware('ledgers'), accountsCtrl.createLedger);
router.get('/accounts/vouchers', accountsCtrl.getDayBook);
router.post('/accounts/vouchers', validate(createVoucherSchema), auditTrailMiddleware('vouchers'), accountsCtrl.createVoucher);
router.get('/accounts/trial-balance', accountsCtrl.getTrialBalance);
router.get('/accounts/profit-loss', accountsCtrl.getProfitAndLoss);
router.get('/accounts/balance-sheet', accountsCtrl.getBalanceSheet);
router.get('/accounts/export-tally-xml', accountsCtrl.exportTallyXml);

router.get('/taxation/hsn-sac', taxCtrl.getHsnSacCodes);
router.get('/taxation/gstr1', taxCtrl.getGstr1Summary);
router.post('/taxation/generate-irn', auditTrailMiddleware('sales_invoices'), taxCtrl.generateInvoiceIrn);
router.get('/taxation/schedules', taxCtrl.getStatutorySchedules);

router.get('/compliance/audit-trail', compCtrl.getAuditTrail);
router.get('/compliance/calendar', compCtrl.getComplianceCalendar);
router.get('/compliance/itc-recon', compCtrl.getItcReconciliation);

router.get('/sales/customers', salesCtrl.getCustomers);
router.post('/sales/customers', validate(createCustomerSchema), auditTrailMiddleware('customers'), salesCtrl.createCustomer);
router.get('/sales/orders', salesCtrl.getSalesOrders);
router.get('/sales/orders/:id', salesCtrl.getSalesOrderById);
router.post('/sales/orders', validate(createSalesOrderSchema), auditTrailMiddleware('sales_orders'), salesCtrl.createSalesOrder);
router.get('/sales/invoices', salesCtrl.getSalesInvoices);
router.post('/sales/convert-order-to-invoice', auditTrailMiddleware('sales_invoices'), salesCtrl.convertOrderToInvoice);

router.get('/procurement/vendors', procCtrl.getVendors);
router.post('/procurement/vendors', validate(createVendorSchema), auditTrailMiddleware('vendors'), procCtrl.createVendor);
router.get('/procurement/orders', procCtrl.getPurchaseOrders);
router.post('/procurement/orders', validate(createPurchaseOrderSchema), auditTrailMiddleware('purchase_orders'), procCtrl.createPurchaseOrder);
router.get('/procurement/grn', procCtrl.getGoodsReceipts);

router.get('/inventory/products', invCtrl.getProducts);
router.get('/inventory/products/:id', invCtrl.getProductById);
router.post('/inventory/products', validate(createProductSchema), auditTrailMiddleware('products'), invCtrl.createProduct);
router.put('/inventory/products/:id', validate(updateProductSchema), auditTrailMiddleware('products'), invCtrl.updateProduct);
router.delete('/inventory/products/:id', auditTrailMiddleware('products'), invCtrl.deleteProduct);

router.get('/inventory/warehouses', invCtrl.getWarehouses);
router.post('/inventory/warehouses', validate(createWarehouseSchema), auditTrailMiddleware('warehouses'), invCtrl.createWarehouse);

router.get('/inventory/stock-ledger', invCtrl.getStockLedger);
router.get('/inventory/stock-transfers', invCtrl.getStockTransfers);
router.post('/inventory/stock-transfers', validate(createStockTransferSchema), auditTrailMiddleware('stock_transfers'), invCtrl.createStockTransfer);

router.get('/manufacturing/work-centers', mfgCtrl.getWorkCenters);

router.get('/manufacturing/boms', mfgCtrl.getBoms);
router.get('/manufacturing/boms/:id', mfgCtrl.getBomById);
router.post('/manufacturing/boms', validate(createBomSchema), auditTrailMiddleware('boms'), mfgCtrl.createBom);

router.get('/manufacturing/work-orders', mfgCtrl.getWorkOrders);
router.post('/manufacturing/work-orders', validate(createWorkOrderSchema), auditTrailMiddleware('work_orders'), mfgCtrl.createWorkOrder);
router.patch('/manufacturing/work-orders/:id/status', validate(updateWorkOrderStatusSchema), auditTrailMiddleware('work_orders'), mfgCtrl.updateWorkOrderStatus);
router.post('/manufacturing/work-orders/:id/log-output', auditTrailMiddleware('work_orders'), mfgCtrl.logProduction);

router.get('/quality/inspections', qcCtrl.getQcInspections);
router.post('/quality/inspections', validate(createQcInspectionSchema), auditTrailMiddleware('qc_inspections'), qcCtrl.createQcInspection);
router.put('/quality/inspections/:id', auditTrailMiddleware('qc_inspections'), qcCtrl.updateQcInspection);

router.get('/quality/ncr', qcCtrl.getNcrReports);
router.post('/quality/ncr', validate(createNcrReportSchema), auditTrailMiddleware('non_conformance_reports'), qcCtrl.createNcrReport);
router.put('/quality/ncr/:id', auditTrailMiddleware('non_conformance_reports'), qcCtrl.updateNcrReport);

router.get('/hr/employees', hrCtrl.getEmployees);
router.get('/hr/employees/:id', hrCtrl.getEmployeeById);
router.post('/hr/employees', validate(createEmployeeSchema), auditTrailMiddleware('employees'), hrCtrl.createEmployee);
router.put('/hr/employees/:id', validate(updateEmployeeSchema), auditTrailMiddleware('employees'), hrCtrl.updateEmployee);
router.delete('/hr/employees/:id', auditTrailMiddleware('employees'), hrCtrl.deleteEmployee);

router.get('/hr/attendance', hrCtrl.getAttendanceLogs);
router.post('/hr/attendance', validate(createAttendanceLogSchema), auditTrailMiddleware('attendance_logs'), hrCtrl.createAttendanceLog);

router.get('/hr/payroll-runs', hrCtrl.getPayrollRuns);
router.post('/hr/payroll-runs', validate(createPayrollRunSchema), auditTrailMiddleware('payroll_runs'), hrCtrl.createPayrollRun);
router.get('/hr/payslips', hrCtrl.getPayslips);

router.get('/logistics/schedules', logCtrl.getDeliverySchedules);
router.post('/logistics/schedules', validate(createDeliveryScheduleSchema), auditTrailMiddleware('delivery_schedules'), logCtrl.createDeliverySchedule);
router.put('/logistics/schedules/:id', auditTrailMiddleware('delivery_schedules'), logCtrl.updateDeliverySchedule);

router.get('/logistics/tracking', logCtrl.getDeliveryTracking);
router.post('/logistics/tracking', auditTrailMiddleware('delivery_tracking'), logCtrl.createDeliveryTracking);
router.put('/logistics/tracking/:id', auditTrailMiddleware('delivery_tracking'), logCtrl.updateDeliveryTracking);

router.get('/logistics/fleet', logCtrl.getFleetVehicleLogs);
router.post('/logistics/fleet', validate(createFleetLogSchema), auditTrailMiddleware('fleet_vehicle_logs'), logCtrl.createFleetVehicleLog);

router.get('/logistics/freight', logCtrl.getFreightBookings);
router.post('/logistics/freight', validate(createFreightBookingSchema), auditTrailMiddleware('freight_bookings'), logCtrl.createFreightBooking);

router.get('/logistics/transporters', logCtrl.getTransporters);
router.post('/logistics/transporters', auditTrailMiddleware('transporter_master'), logCtrl.createTransporter);

router.get('/logistics/routes', logCtrl.getDeliveryRoutes);
router.get('/logistics/eway-bills', logCtrl.getEwayBills);
router.post('/logistics/eway-bills', auditTrailMiddleware('eway_bills'), logCtrl.createEwayBill);

router.get('/assets', assetCtrl.getFixedAssets);
router.get('/assets/:id', assetCtrl.getFixedAssetById);
router.post('/assets', validate(createFixedAssetSchema), auditTrailMiddleware('fixed_assets'), assetCtrl.createFixedAsset);
router.put('/assets/:id', validate(updateFixedAssetSchema), auditTrailMiddleware('fixed_assets'), assetCtrl.updateFixedAsset);
router.post('/assets/:id/dispose', auditTrailMiddleware('fixed_assets'), assetCtrl.disposeFixedAsset);
router.get('/assets/reports/depreciation', assetCtrl.calculateDepreciation);
router.get('/assets/maintenance/schedules', assetCtrl.getMaintenanceSchedule);
router.put('/assets/maintenance/schedules/:id', auditTrailMiddleware('machine_master'), assetCtrl.updateMaintenanceDueDate);
router.get('/assets/calibration/records', assetCtrl.getCalibrationRecords);

router.get('/projects', prjCtrl.getProjects);
router.get('/projects/:id', prjCtrl.getProjectById);
router.post('/projects', validate(createProjectSchema), auditTrailMiddleware('projects'), prjCtrl.createProject);
router.put('/projects/:id', validate(updateProjectSchema), auditTrailMiddleware('projects'), prjCtrl.updateProject);
router.delete('/projects/:id', auditTrailMiddleware('projects'), prjCtrl.deleteProject);

router.get('/projects/milestones/list', prjCtrl.getProjectMilestones);
router.post('/projects/milestones', auditTrailMiddleware('project_milestones'), prjCtrl.createProjectMilestone);

router.get('/projects/tasks/list', prjCtrl.getProjectTasks);
router.post('/projects/tasks', validate(createProjectTaskSchema), auditTrailMiddleware('project_tasks'), prjCtrl.createProjectTask);

router.get('/projects/timesheets/list', prjCtrl.getProjectTimesheets);
router.post('/projects/timesheets', auditTrailMiddleware('project_timesheets'), prjCtrl.createProjectTimesheet);

export default router;
