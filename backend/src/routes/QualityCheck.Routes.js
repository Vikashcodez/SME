import express from 'express';
import {
    recordQualityCheck,
    completeRework,
    getAllQualityChecks,
    getAllReworks
} from '../controllers/QualityCheck.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllQualityChecks);
router.get('/reworks', getAllReworks);
router.post('/', recordQualityCheck);
router.post('/reworks/:reworkId/complete', completeRework);

export default router;
