import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getParties, getPartyById, createParty, updateParty, deleteParty, bulkImportParties } from '../controllers/Party.Controller.js';

const router = express.Router();
router.use(authenticate);
router.get('/', getParties);
router.post('/bulk-import', bulkImportParties);
router.post('/', createParty);
router.get('/:party_id', getPartyById);
router.put('/:party_id', updateParty);
router.delete('/:party_id', deleteParty);

export default router;
