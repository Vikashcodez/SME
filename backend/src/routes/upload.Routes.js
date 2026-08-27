import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { uploadDocument, getEntityDocuments, deleteDocument } from '../controllers/upload.Controller.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantMiddleware);

router.post('/', uploadDocument);
router.get('/:entityType/:entityId', getEntityDocuments);
router.delete('/:id', deleteDocument);

export default router;
