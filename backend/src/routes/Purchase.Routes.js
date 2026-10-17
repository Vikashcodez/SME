import express from 'express';
import {
    createPurchaseInvoice,
    getPurchaseInvoices,
    getPurchaseInvoiceById,
    getPendingGrns,
    recordVendorPayment,
    getVendorBillOutstanding
} from '../controllers/Purchase.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Purchase Invoices
router.post('/invoices', createPurchaseInvoice);
router.get('/invoices', getPurchaseInvoices);
router.get('/invoices/:id', getPurchaseInvoiceById);
router.get('/grns/pending', getPendingGrns);

// Vendor Payments & Bill Allocations
router.post('/payments', recordVendorPayment);
router.get('/vendors/:vendor_id/outstanding-bills', getVendorBillOutstanding);

export default router;
