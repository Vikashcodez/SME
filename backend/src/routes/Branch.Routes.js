import express from 'express';
import {
    createBranch,
    getBranches,
    getBranchById,
    updateBranch,
    deleteBranch,
    getBranchesByCompany
} from '../controllers/Branch.Controller.js';

const BranchRouter = express.Router();

// Routes
BranchRouter.post('/branches', createBranch);
BranchRouter.get('/branches', getBranches); // Optional company_id filter
BranchRouter.get('/branches/company', getBranchesByCompany); // REQUIRED company_id
BranchRouter.get('/branches/:id', getBranchById);
BranchRouter.put('/branches/:id', updateBranch);
BranchRouter.delete('/branches/:id', deleteBranch);

export default BranchRouter;