import express from 'express';
import { createCompany, updateCompany, getCompanies } from '../controllers/company.Controller.js';
import { uploadLogo } from '../middleware/upload.js';
import { authenticate} from '../middleware/auth.js';

const router = express.Router();


router.use(authenticate);
router.get('/:id?', getCompanies);
router.post('/', uploadLogo, createCompany);
router.put('/:id', uploadLogo, updateCompany);

export default router;