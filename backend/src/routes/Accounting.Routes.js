import express from 'express';
import {
    getChartOfAccounts,
    getAccountGroups,
    createAccountGroup,
    getLedgers,
    createLedger,
    getBankAccounts,
    createBankAccount,
    getBankReconciliation,
    updateBankReconciliation,
    getCostCentres,
    createCostCentre,
    getBudgetVariance,
    getLedgerStatement,
    createVoucher,
    getVouchers,
    getVoucherById,
    getTrialBalance,
    getDayBook,
    getProfitAndLoss,
    getBalanceSheet,
    getExpenseStatement,
    getFinancialYears,
    createFinancialYear,
    setPeriodLock,
    closeFinancialYear,
    getAccountingAuditLogs,
    reverseVoucher
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
router.get('/bank-accounts', getBankAccounts);
router.post('/bank-accounts', createBankAccount);
router.get('/bank-reconciliation', getBankReconciliation);
router.post('/bank-reconciliation', updateBankReconciliation);
router.get('/cost-centres', getCostCentres);
router.post('/cost-centres', createCostCentre);
router.get('/budgets/variance', getBudgetVariance);

// Double-Entry Vouchers
router.get('/vouchers', getVouchers);
router.post('/vouchers', createVoucher);
router.get('/vouchers/:id', getVoucherById);
router.post('/vouchers/:id/reverse', reverseVoucher);

// Financial years and period controls
router.get('/financial-years', getFinancialYears);
router.post('/financial-years', createFinancialYear);
router.post('/periods/:period_id/lock', setPeriodLock);
router.post('/financial-years/:financial_year_id/close', closeFinancialYear);
router.get('/audit-logs', getAccountingAuditLogs);

// Reports
router.get('/reports/trial-balance', getTrialBalance);
router.get('/reports/day-book', getDayBook);
router.get('/reports/profit-loss', getProfitAndLoss);
router.get('/reports/balance-sheet', getBalanceSheet);
router.get('/reports/expenses', getExpenseStatement);

export default router;
