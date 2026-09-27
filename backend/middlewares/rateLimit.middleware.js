import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const keyByUser = (req) => req.user?.userId || ipKeyGenerator(req.ip);

const message = (text) => (req, res) => res.status(429).json({ success: false, code: 'rate_limited', message: text });

const base = { standardHeaders: true, legacyHeaders: false };

/** Sign-in, keyed by address so one attacker cannot lock everyone out. */
export const authLimiter = rateLimit({
    ...base,
    windowMs: 15 * 60 * 1000,
    limit: 15,
    skipSuccessfulRequests: true,
    handler: message('Too many sign-in attempts. Wait fifteen minutes and try again.'),
});

/** Everything behind a login. */
export const apiLimiter = rateLimit({
    ...base,
    windowMs: 60 * 1000,
    limit: 600,
    keyGenerator: keyByUser,
    handler: message('Too many requests. Slow down a moment.'),
});
