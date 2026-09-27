import express from 'express';
import { getShop, updateShop } from '../controllers/setting.controller.js';
import { protect, requireAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/shop', protect, getShop);
router.put('/shop', protect, requireAdmin, updateShop);

export default router;
