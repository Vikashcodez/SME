import express from 'express';
import {
    getRawMaterialCategories,
    createRawMaterialCategory,
    updateRawMaterialCategory,
    deleteRawMaterialCategory,
    getProductCategories,
    createProductCategory,
    updateProductCategory,
    deleteProductCategory
} from '../controllers/Category.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Raw Material Categories
router.get('/raw-materials', getRawMaterialCategories);
router.post('/raw-materials', createRawMaterialCategory);
router.put('/raw-materials/:id', updateRawMaterialCategory);
router.delete('/raw-materials/:id', deleteRawMaterialCategory);

// Product Categories
router.get('/products', getProductCategories);
router.post('/products', createProductCategory);
router.put('/products/:id', updateProductCategory);
router.delete('/products/:id', deleteProductCategory);

export default router;
