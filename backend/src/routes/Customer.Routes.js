import express from 'express';
import {
    createCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer
} from '../controllers/Customer.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createCustomer);
router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.put('/:id', updateCustomer);

export default router;
