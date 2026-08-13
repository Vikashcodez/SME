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

// All routes require authentication
router.use(authenticate);

// Public routes (for all authenticated users)
router.get('/', getAllCompanies);
router.get('/:id', getCompanyById);

// Super admin only routes
router.post('/', isSuperAdmin, createCompany);
router.put('/:id', isSuperAdmin, updateCompany);
router.delete('/:id', isSuperAdmin, deleteCompany);

export default router;