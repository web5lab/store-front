import express from 'express';
import { login, me, changePassword, listUsers, createUser, updateUser } from '../controllers/auth.controller.js';
import { protect, requireAdmin } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

router.post('/login', authLimiter, login);
router.get('/me', protect, me);
router.post('/change-password', protect, authLimiter, changePassword);

router.get('/users', protect, requireAdmin, listUsers);
router.post('/users', protect, requireAdmin, createUser);
router.patch('/users/:id', protect, requireAdmin, updateUser);

export default router;
