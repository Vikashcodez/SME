import express from 'express';
import {
    calculateRequirements,
    createProductionOrder,
    startProductionOrder,
    completeProductionBatch,
    getAllProductionOrders,
    getProductionOrderById
} from '../controllers/ProductionOrder.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/calculate-requirements', calculateRequirements);
router.get('/', getAllProductionOrders);
router.get('/:id', getProductionOrderById);
router.post('/', createProductionOrder);
router.post('/:id/start', startProductionOrder);
router.post('/batches/:batchId/complete', completeProductionBatch);

export default router;
