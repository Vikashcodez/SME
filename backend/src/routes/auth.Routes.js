import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  login,
  refreshToken,
  verifyToken,
  getCurrentUser,
  logout,
  createUser,
  listUsers,
  updateUserRole,
  deactivateUser,
} from '../controllers/auth.Controller.js';
import { authenticate, isSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    },
  },
});

router.post('/login', loginLimiter, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

router.get('/verify', authenticate, verifyToken);
router.get('/me', authenticate, getCurrentUser);

router.post('/users', authenticate, isSuperAdmin, createUser);
router.get('/users', authenticate, isSuperAdmin, listUsers);
router.put('/users/:id/role', authenticate, isSuperAdmin, updateUserRole);
router.delete('/users/:id', authenticate, isSuperAdmin, deactivateUser);

export default router;
