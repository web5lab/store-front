import { wrap } from '../middlewares/error.middleware.js';
import { overview } from '../services/dashboard.service.js';

export const getOverview = wrap(async (req, res) => {
    res.json({ success: true, data: await overview() });
});
