import express from 'express';
import {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    softDeleteProduct,
    restoreProduct,
    getProductCategories,
    bulkImportProducts
} from '../controllers/Product.Controller.js';
import { authenticate } from '../middleware/auth.js';
import { uploadProductImages } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticate);

router.get('/categories', getProductCategories);
router.get('/', getAllProducts);
router.post('/bulk-import', bulkImportProducts);
router.get('/:id', getProductById);
router.post('/', uploadProductImages, createProduct);
router.put('/:id', uploadProductImages, updateProduct);
router.delete('/:id', softDeleteProduct);
router.put('/:id/restore', restoreProduct);

export default router;
