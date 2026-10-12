import express from 'express';
import {
    createSalesInvoice,
    getSalesInvoices,
    getSalesInvoiceById,
    recordReceiptSettlement,
    getQuotations,
    createQuotation,
    getSalesOrders,
    createSalesOrder
} from '../controllers/Sales.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Invoices
router.post('/invoices', createSalesInvoice);
router.get('/invoices', getSalesInvoices);
router.get('/invoices/:id', getSalesInvoiceById);

// Bill Settlements / Receipts
router.post('/receipts', recordReceiptSettlement);

// Quotations
router.get('/quotations', getQuotations);
router.post('/quotations', createQuotation);

// Sales Orders
router.get('/orders', getSalesOrders);
router.post('/orders', createSalesOrder);

export default router;
