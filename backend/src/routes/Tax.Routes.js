import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getTaxes, createTax, updateTax, deleteTax, bulkImportTaxes } from '../controllers/Tax.Controller.js';

const router = express.Router();
router.use(authenticate);
router.post('/bulk-import', bulkImportTaxes);
router.get('/', getTaxes);
router.post('/', createTax);
router.put('/:tax_id', updateTax);
router.delete('/:tax_id', deleteTax);

export default router;
