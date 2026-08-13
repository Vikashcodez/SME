import express from 'express';
import { login, verifyToken, getCurrentUser } from '../controllers/auth.Controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);

// Protected routes
router.get('/verify', authenticate, verifyToken);
router.get('/me', authenticate, getCurrentUser);

export default router;