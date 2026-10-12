import express from 'express';
import {
    getChartOfAccounts,
    getAccountGroups,
    createAccountGroup,
    getLedgers,
    createLedger,
    getLedgerStatement,
    createVoucher,
    getVouchers,
    getVoucherById,
    getTrialBalance
} from '../controllers/Accounting.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Chart of Accounts & Groups
router.get('/chart-of-accounts', getChartOfAccounts);
router.get('/groups', getAccountGroups);
router.post('/groups', createAccountGroup);

// Ledgers
router.get('/ledgers', getLedgers);
router.post('/ledgers', createLedger);
router.get('/ledgers/:ledger_id/statement', getLedgerStatement);

// Double-Entry Vouchers
router.get('/vouchers', getVouchers);
router.post('/vouchers', createVoucher);
router.get('/vouchers/:id', getVoucherById);

// Reports
router.get('/reports/trial-balance', getTrialBalance);

export default router;
