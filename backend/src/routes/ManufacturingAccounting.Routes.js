import express from 'express';
import {
    recordStockJournal,
    recordScrapAccounting,
    recordReworkAccounting,
    getManufacturingVouchers,
    getManufacturingCostSummary
} from '../controllers/ManufacturingAccounting.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Stock Journal / Manufacturing Vouchers
router.post('/stock-journal', recordStockJournal);
router.post('/scrap', recordScrapAccounting);
router.post('/rework', recordReworkAccounting);
router.get('/vouchers', getManufacturingVouchers);
router.get('/cost-summary', getManufacturingCostSummary);

export default router;
