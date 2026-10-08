import express from 'express';
import {
    getPendingBatches,
    recordQualityCheck,
    completeRework,
    sendToRework,
    scrapRejectedProduct,
    getAllQualityChecks,
    getAllReworks
} from '../controllers/QualityCheck.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllQualityChecks);
router.get('/pending-batches', getPendingBatches);
router.get('/reworks', getAllReworks);
router.post('/', recordQualityCheck);
router.post('/reworks/:reworkId/complete', completeRework);
router.post('/reworks/:reworkId/send-rework', sendToRework);
router.post('/reworks/:reworkId/scrap', scrapRejectedProduct);

export default router;
