import express from 'express';
import {
    createAsset,
    getAllAssets,
    getAssetById,
    updateAsset,
    softDeleteAsset,
    recordAssetMaintenance,
    recordAssetDamageOrReturn,
    getAllAssetDamageReturns,
    getAssetSummaryStats
} from '../controllers/Asset.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/stats/summary', getAssetSummaryStats);
router.get('/damage-returns', getAllAssetDamageReturns);
router.get('/', getAllAssets);
router.post('/', createAsset);
router.get('/:asset_id', getAssetById);
router.put('/:asset_id', updateAsset);
router.delete('/:asset_id', softDeleteAsset);

router.post('/:asset_id/maintenance', recordAssetMaintenance);
router.post('/:asset_id/damage-returns', recordAssetDamageOrReturn);

export default router;
