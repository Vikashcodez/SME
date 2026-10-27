import express from 'express';
import {
    getAllHsn,
    getHsnByCode,
    getHsnCategories,
    syncHsnFromApi,
    createHsn
} from '../controllers/Hsn.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/categories', getHsnCategories);
router.get('/by-code/:code', getHsnByCode);
router.post('/sync', syncHsnFromApi);
router.get('/', getAllHsn);
router.post('/', createHsn);

export default router;
