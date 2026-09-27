import express from 'express';
import { getReport } from '../controllers/report.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/:kind', protect, getReport);

export default router;
