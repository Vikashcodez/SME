import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getComplianceDashboard, getComplianceSettings, saveComplianceSettings, createPayrollRun, createChallan, listComplianceRecords, generateForm16, listForm16 } from '../controllers/Compliance.Controller.js';

const router = express.Router();
router.use(authenticate);
router.get('/dashboard', getComplianceDashboard);
router.get('/settings', getComplianceSettings);
router.post('/settings', saveComplianceSettings);
router.get('/records', listComplianceRecords);
router.post('/payroll-runs', createPayrollRun);
router.post('/challans', createChallan);
router.get('/form16', listForm16);
router.post('/form16/generate', generateForm16);
export default router;
