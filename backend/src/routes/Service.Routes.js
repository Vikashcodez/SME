import express from 'express';
import {
    createService,
    getAllServices,
    getServiceById,
    updateService,
    softDeleteService,
    restoreService,
    getServiceCategories
} from '../controllers/Service.Controller.js';
import { authenticate } from '../middleware/auth.js';
import { uploadServiceImages } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticate);

router.get('/categories', getServiceCategories);
router.get('/', getAllServices);
router.get('/:id', getServiceById);
router.post('/', uploadServiceImages, createService);
router.put('/:id', uploadServiceImages, updateService);
router.delete('/:id', softDeleteService);
router.put('/:id/restore', restoreService);

export default router;
