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
BranchRouter.post('/', createBranch);
BranchRouter.get('/', getBranches); // Optional company_id filter
BranchRouter.get('/company', getBranchesByCompany); // REQUIRED company_id
BranchRouter.get('/:id', getBranchById);
BranchRouter.put('/:id', updateBranch);
BranchRouter.delete('/:id', deleteBranch);

export default BranchRouter;