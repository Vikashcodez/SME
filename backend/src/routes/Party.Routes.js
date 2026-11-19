import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getParties, createParty } from '../controllers/Party.Controller.js';

const router = express.Router();
router.use(authenticate);
router.get('/', getParties);
router.post('/', createParty);

export default router;
