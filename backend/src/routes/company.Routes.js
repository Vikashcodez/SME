import express from 'express';
import {
    createCompany,
    getAllCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany
} from '../controllers/company.Controller.js';
import { authenticate, isSuperAdmin } from '../middleware/auth.js';

const router = express.Router();


router.use(authenticate);


router.get('/', getAllCompanies);
router.get('/:id', getCompanyById);


router.post('/', isSuperAdmin, createCompany);
router.put('/:id', isSuperAdmin, updateCompany);
router.delete('/:id', isSuperAdmin, deleteCompany);

export default router;
