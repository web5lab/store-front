import mongoose from 'mongoose';
import { AppError } from '../middlewares/error.middleware.js';

/** Round to paise. Floating point never gets to decide what someone owes. */
export const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

export function number(value, label, { min = 0, integer = false, fallback = 0 } = {}) {
    if (value === undefined || value === null || value === '') return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) throw new AppError(`${label} must be a number.`);
    if (integer && !Number.isInteger(n)) throw new AppError(`${label} must be a whole number.`);
    if (n < min) throw new AppError(`${label} cannot be less than ${min}.`);
    return n;
}

export function objectId(value, label = 'Record') {
    if (!value) return null;
    if (!mongoose.isValidObjectId(value)) throw new AppError(`${label} is not valid.`, { code: 'invalid_id' });
    return value;
}

export const text = (value, max = 500) => (value === undefined || value === null ? '' : String(value).trim().slice(0, max));

/** Escape user text for use inside a RegExp search. */
export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Parse ?from=YYYY-MM-DD&to=YYYY-MM-DD into a Mongo date filter (inclusive). */
export function dateRange(from, to) {
    const range = {};
    if (from) {
        const d = new Date(from);
        if (Number.isNaN(d.getTime())) throw new AppError('Start date is not valid.');
        range.$gte = d;
    }
    if (to) {
        const d = new Date(to);
        if (Number.isNaN(d.getTime())) throw new AppError('End date is not valid.');
        d.setHours(23, 59, 59, 999);
        range.$lte = d;
    }
    return Object.keys(range).length ? range : null;
}
