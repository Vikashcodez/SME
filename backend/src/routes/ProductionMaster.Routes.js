import express from 'express';
import {
    createProductionMaster,
    getAllProductionMasters,
    getProductionMasterById,
    updateProductionMaster
} from '../controllers/ProductionMaster.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllProductionMasters);
router.get('/:id', getProductionMasterById);
router.post('/', createProductionMaster);
router.put('/:id', updateProductionMaster);

export default router;
