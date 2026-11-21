import express from 'express';
import {
    createGrn,
    getAllGrns,
    getGrnById,
    updateGrn,
    bulkImportGrns
} from '../controllers/Grn.Controller.js';
import { authenticate } from '../middleware/auth.js';
import { uploadInvoice } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllGrns);
router.post('/bulk-import', bulkImportGrns);
router.get('/:id', getGrnById);
router.post('/', uploadInvoice, createGrn);
router.put('/:id', updateGrn);

export default router;
