import express from 'express';
import {
    getSchema,
    listRecords,
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
    convertRecord,
    getDashboardMetrics,
    aiAssistant,
    bulkImportRecords
} from '../controllers/erp.Controller.js';
import { authenticate } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantMiddleware);

router.get('/schema', getSchema);

router.get('/metrics', getDashboardMetrics);
router.post('/ai/chat', aiAssistant);

router.post('/convert', convertRecord);

router.post('/entities/:entityKey/bulk-import', bulkImportRecords);

router.get('/entities/:entityKey', listRecords);
router.get('/entities/:entityKey/:id', getRecord);
router.post('/entities/:entityKey', createRecord);
router.put('/entities/:entityKey/:id', updateRecord);
router.delete('/entities/:entityKey/:id', deleteRecord);

router.get('/entities/:entityKey/:id/:relationKey', (req, res, next) => {
    req.params.entityKey = req.params.relationKey;
    req.query.search = req.params.id;
    return listRecords(req, res, next);
});

export default router;
