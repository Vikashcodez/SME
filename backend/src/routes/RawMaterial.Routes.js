import express from 'express';
import {
    createRawMaterial,
    getAllRawMaterials,
    getRawMaterialById,
    updateRawMaterial,
    softDeleteRawMaterial,
    restoreRawMaterial,
    getRawMaterialCategories
} from '../controllers/RawMaterial.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/categories', getRawMaterialCategories);
router.get('/', getAllRawMaterials);
router.post('/', createRawMaterial);
router.get('/:material_id', getRawMaterialById);
router.put('/:material_id', updateRawMaterial);
router.delete('/:material_id', softDeleteRawMaterial);
router.put('/:material_id/restore', restoreRawMaterial);

export default router;
