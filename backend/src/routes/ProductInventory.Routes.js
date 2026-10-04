import express from 'express';
import {
    getAllProductInventory,
    getProductInventorySummary,
    updateProductInventoryBatch
} from '../controllers/ProductInventory.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/summary', getProductInventorySummary);
router.get('/', getAllProductInventory);
router.put('/:id', updateProductInventoryBatch);

export default router;
