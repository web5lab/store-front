/* Must be first: it loads .env before any other module body reads process.env. */
import './config/env.js';
import { checkEnv, isProduction } from './config/env.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';

import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import categoryRoutes from './routes/category.routes.js';
import productRoutes from './routes/product.routes.js';
import partyRouter from './routes/party.routes.js';
import transactionRouter from './routes/transaction.routes.js';
import reportRoutes from './routes/report.routes.js';
import settingRoutes from './routes/setting.routes.js';

import { errorHandler, notFound } from './middlewares/error.middleware.js';
import { apiLimiter } from './middlewares/rateLimit.middleware.js';
import { UPLOAD_ROOT } from './middlewares/upload.middleware.js';
import { seedAdmin } from './scripts/seed.js';

checkEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5050;

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(compression());

/* An allowlist rather than a wildcard. In development the Vite proxy makes
   every call same-origin, so this only matters for a separately hosted UI. */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
app.use(cors({
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
    /* Report downloads read their filename from this header. */
    exposedHeaders: ['Content-Disposition'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* Express 5 leaves req.body undefined when there is no body; default it so
   controllers can read fields without guarding every access. */
app.use((req, res, next) => {
    if (req.body === undefined) req.body = {};
    next();
});

/* ── Routes ───────────────────────────────────────────────────────── */

app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: Math.round(process.uptime()) }));

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/categories', apiLimiter, categoryRoutes);
app.use('/api/products', apiLimiter, productRoutes);
app.use('/api/customers', apiLimiter, partyRouter('customer'));
app.use('/api/suppliers', apiLimiter, partyRouter('supplier'));
app.use('/api/sales', apiLimiter, transactionRouter('sale'));
app.use('/api/purchases', apiLimiter, transactionRouter('purchase'));
app.use('/api/reports', apiLimiter, reportRoutes);
app.use('/api/settings', apiLimiter, settingRoutes);

/* Stored under random names; nosniff (from helmet) stops a browser treating
   an upload as anything other than its declared type. */
/* The Android app (origin https://localhost) shows these as <img>, which
   helmet's same-site resource policy would otherwise block. */
app.use('/uploads', (req, res, next) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
});
app.use('/uploads', express.static(UPLOAD_ROOT, { maxAge: '7d', index: false, dotfiles: 'deny' }));

app.use('/api', notFound);

/* In production, serve the built React app from the same origin. */
const dist = path.resolve(__dirname, '..', 'frontend', 'dist');
if (isProduction() && fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false }));
    app.get(/^(?!\/api|\/uploads).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

/* ── Boot ─────────────────────────────────────────────────────────── */

await connectDB();
await seedAdmin();
const server = app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`));

for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
        console.log(`${signal} received, shutting down.`);
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 10000).unref();
    });
}

process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));

export default app;
