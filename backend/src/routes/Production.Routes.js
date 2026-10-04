import express from 'express';
import {
    checkMaterialAvailability,
    recordProductionRun,
    getAllProductionRuns,
    getProductionRunById,
    getProductionStats
} from '../controllers/Production.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/stats/summary', getProductionStats);
router.get('/check-materials', checkMaterialAvailability);
router.get('/', getAllProductionRuns);
router.get('/:id', getProductionRunById);
router.post('/', recordProductionRun);

export default router;
