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
import { uploadProductImages, uploadProductMiddleware } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticate);

router.get('/categories', getProductCategories);
router.get('/', getAllProducts);
router.post('/bulk-import', bulkImportProducts);

// Dedicated single image upload endpoint for Excel workstation and masters
router.post('/upload-image', uploadProductMiddleware.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file uploaded' });
        }
        const fileUrl = `/uploads/products/${req.file.filename}`;
        return res.json({
            success: true,
            message: 'Image uploaded successfully',
            url: fileUrl,
            filename: req.file.filename
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/:id', getProductById);
router.post('/', uploadProductImages, createProduct);
router.put('/:id', uploadProductImages, updateProduct);
router.delete('/:id', softDeleteProduct);
router.put('/:id/restore', restoreProduct);

export default router;
