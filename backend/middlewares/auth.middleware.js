import jwt from 'jsonwebtoken';
import User from '../schemas/user.schema.js';

/**
 * Bearer-token auth. The token only proves who signed it; the user record is
 * re-read so a deactivated account stops working immediately rather than when
 * its token expires.
 */
export const protect = async (req, res, next) => {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) return res.status(401).json({ success: false, code: 'unauthenticated', message: 'Sign in to continue.' });

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ success: false, code: 'session_expired', message: 'Your session has expired. Sign in again.' });
        }

        const user = await User.findById(payload.userId).select('username fullName role isActive');
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, code: 'unauthenticated', message: 'This account is not active.' });
        }

        req.user = { userId: user._id.toString(), username: user.username, role: user.role };
        next();
    } catch (error) {
        next(error);
    }
};

export const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, code: 'not_admin', message: 'Only an administrator can do that.' });
    }
    next();
};
