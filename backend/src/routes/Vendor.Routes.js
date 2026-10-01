import express from 'express';
import {
    createVendor,
    getAllVendors,
    getVendorById,
    updateVendor,
    softDeleteVendor,
    restoreVendor,
    getVendorStats
} from '../controllers/Vendor.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/stats/summary', getVendorStats);
router.get('/', getAllVendors);
router.post('/', createVendor);
router.get('/:vendor_id', getVendorById);
router.put('/:vendor_id', updateVendor);
router.delete('/:vendor_id', softDeleteVendor);
router.put('/:vendor_id/restore', restoreVendor);

export default router;
