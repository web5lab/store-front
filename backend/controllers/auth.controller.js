import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../schemas/user.schema.js';
import { AppError, wrap } from '../middlewares/error.middleware.js';
import { objectId, text } from '../lib/validate.js';

/* A real hash of nothing, so a login for an unknown user costs the same time as a real one. */
const DUMMY_HASH = bcrypt.hashSync('no-such-user-placeholder', 12);

const sign = (user) =>
    jwt.sign({ userId: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const publicUser = (u) => ({ _id: u._id, username: u.username, fullName: u.fullName, role: u.role, isActive: u.isActive, createdAt: u.createdAt });

function checkPassword(password) {
    if (typeof password !== 'string' || password.length < 8) throw new AppError('Password must be at least 8 characters.');
    if (password.length > 128) throw new AppError('Password is too long.');
}

export const login = wrap(async (req, res) => {
    const username = text(req.body.username, 60).toLowerCase();
    const password = String(req.body.password || '');
    if (!username || !password) throw new AppError('Enter your username and password.');

    const user = await User.findOne({ username, isActive: true }).select('+passwordHash');
    /* Compare even when the user is missing, so response time does not reveal
       which usernames exist. */
    const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
    if (!user || !ok) throw new AppError('Username or password is incorrect.', { status: 401, code: 'bad_credentials' });

    res.json({ success: true, data: { token: sign(user), user: publicUser(user) } });
});

export const me = wrap(async (req, res) => {
    const user = await User.findById(req.user.userId);
    res.json({ success: true, data: { user: publicUser(user) } });
});

export const changePassword = wrap(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    checkPassword(newPassword);
    const user = await User.findById(req.user.userId).select('+passwordHash');
    if (!(await bcrypt.compare(String(currentPassword || ''), user.passwordHash))) {
        throw new AppError('Current password is incorrect.', { status: 400, code: 'bad_credentials' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ success: true, message: 'Password changed.' });
});

/* ── Admin: staff accounts ─────────────────────────────────────── */

export const listUsers = wrap(async (req, res) => {
    const users = await User.find().sort({ createdAt: 1 });
    res.json({ success: true, data: users.map(publicUser) });
});

export const createUser = wrap(async (req, res) => {
    const username = text(req.body.username, 60).toLowerCase();
    if (!/^[a-z0-9._-]{3,60}$/.test(username)) throw new AppError('Username must be 3–60 letters, numbers, dots, dashes or underscores.');
    checkPassword(req.body.password);
    const role = req.body.role === 'admin' ? 'admin' : 'staff';
    const user = await User.create({
        username,
        fullName: text(req.body.fullName, 120),
        role,
        passwordHash: await bcrypt.hash(req.body.password, 12),
    });
    res.status(201).json({ success: true, message: 'User added.', data: publicUser(user) });
});

export const updateUser = wrap(async (req, res) => {
    const user = await User.findById(objectId(req.params.id, 'User')).select('+passwordHash');
    if (!user) throw new AppError('User not found.', { status: 404 });

    const selfEdit = user._id.toString() === req.user.userId;
    if (selfEdit && (req.body.isActive === false || req.body.role === 'staff')) {
        throw new AppError('You cannot deactivate or demote your own account.');
    }
    if (req.body.fullName !== undefined) user.fullName = text(req.body.fullName, 120);
    if (req.body.role !== undefined) user.role = req.body.role === 'admin' ? 'admin' : 'staff';
    if (req.body.isActive !== undefined) user.isActive = Boolean(req.body.isActive);
    if (req.body.password) {
        checkPassword(req.body.password);
        user.passwordHash = await bcrypt.hash(req.body.password, 12);
    }
    await user.save();
    res.json({ success: true, message: 'User updated.', data: publicUser(user) });
});
