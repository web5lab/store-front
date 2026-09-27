import { AppError, wrap } from '../middlewares/error.middleware.js';
import { buildReport, REPORTS } from '../services/report.service.js';
import { FORMATS, render } from '../services/export.service.js';

export const getReport = wrap(async (req, res) => {
    const { kind } = req.params;
    if (!REPORTS.includes(kind)) throw new AppError('Unknown report.', { status: 404 });

    const format = req.query.format || 'json';
    const report = await buildReport(kind, req.query);

    if (format === 'json') return res.json({ success: true, data: report });

    const spec = FORMATS[format];
    if (!spec) throw new AppError('Choose PDF, Word or Excel.');

    const buffer = await render(report, format);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', spec.mime);
    res.setHeader('Content-Disposition', `attachment; filename="${kind}-report-${stamp}.${spec.ext}"`);
    res.send(buffer);
});
