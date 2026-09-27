import dotenv from 'dotenv';

/**
 * Loaded as the very first import of the app.
 *
 * ES modules evaluate every import before any statement in the importing file,
 * so dotenv has to run in its own module that index.js imports first — otherwise
 * services read process.env before it is filled.
 */
dotenv.config({ quiet: true });

const REQUIRED = ['MONGO_URI', 'JWT_SECRET'];

export function checkEnv() {
    const missing = REQUIRED.filter((key) => !process.env[key]);
    if (missing.length) {
        console.error(`Cannot start: ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} not set.`);
        process.exit(1);
    }

    if (process.env.JWT_SECRET.length < 32) {
        console.error('Cannot start: JWT_SECRET must be at least 32 characters.');
        process.exit(1);
    }
}

export const isProduction = () => process.env.NODE_ENV === 'production';

export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 10);
