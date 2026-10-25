import express from 'express';
import {
    createSalesInvoice,
    getSalesInvoices,
    getSalesInvoiceById,
    getCustomerOutstanding,
    recordReceiptSettlement,
    getQuotations,
    createQuotation,
    getSalesOrders,
    createSalesOrder,
    convertQuotationToSalesOrder
} from '../controllers/Sales.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Invoices
router.post('/invoices', createSalesInvoice);
router.get('/invoices', getSalesInvoices);
router.get('/invoices/:id', getSalesInvoiceById);
router.get('/customers/:customer_id/outstanding', getCustomerOutstanding);

// Bill Settlements / Receipts
router.post('/receipts', recordReceiptSettlement);

// Quotations
router.get('/quotations', getQuotations);
router.post('/quotations', createQuotation);
router.post('/quotations/:id/convert-to-order', convertQuotationToSalesOrder);

// Sales Orders
router.get('/orders', getSalesOrders);
router.post('/orders', createSalesOrder);

export default router;
