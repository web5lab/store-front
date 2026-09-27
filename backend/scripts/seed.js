import '../config/env.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import User from '../schemas/user.schema.js';

/**
 * Creates the first administrator from ADMIN_USERNAME / ADMIN_PASSWORD, once.
 * Runs at every boot but never touches an account that already exists.
 */
export async function seedAdmin() {
    const username = (process.env.ADMIN_USERNAME || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!username || !password) return;
    if (await User.exists({})) return;

    if (process.env.NODE_ENV === 'production' && password.length < 12) {
        console.warn('[seed] ADMIN_PASSWORD is under 12 characters — refusing to create an admin in production.');
        return;
    }

    await User.create({
        username,
        fullName: process.env.ADMIN_NAME || 'Administrator',
        role: 'admin',
        passwordHash: await bcrypt.hash(password, 12),
    });
    console.log(`[seed] created administrator "${username}". Change the password after first sign-in.`);
}

/* `npm run seed` */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await mongoose.connect(process.env.MONGO_URI);
    await seedAdmin();
    await mongoose.disconnect();
}
