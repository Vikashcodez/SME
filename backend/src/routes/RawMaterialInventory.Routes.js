import express from 'express';
import {
    getInventoryOverview,
    getInventoryBatches,
    recordStockMovement,
    getStockMovements,
    recordRawMaterialReturn,
    getRawMaterialReturns,
    updateReturnStatus,
    getInventorySummaryStats
} from '../controllers/RawMaterialInventory.Controller.js';
import { authenticate } from '../middleware/auth.js';
import { uploadInvoice } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticate);

router.get('/stats/summary', getInventorySummaryStats);
router.get('/batches', getInventoryBatches);
router.get('/', getInventoryOverview);

// Stock Movement / Inward (GRN) with optional invoice file upload
router.post('/movement', uploadInvoice, recordStockMovement);
router.get('/movements', getStockMovements);

// Standalone Invoice File Upload
router.post('/upload-invoice', uploadInvoice, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No invoice file uploaded.' });
    }
    const fileUrl = `/uploads/invoices/${req.file.filename}`;
    return res.status(200).json({
        success: true,
        message: 'Invoice uploaded successfully',
        data: {
            filename: req.file.filename,
            invoice_url: fileUrl,
            originalname: req.file.originalname
        }
    });
});

router.post('/returns', recordRawMaterialReturn);
router.get('/returns', getRawMaterialReturns);
router.put('/returns/:return_id', updateReturnStatus);

export default router;
