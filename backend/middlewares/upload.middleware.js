import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { MAX_UPLOAD_MB } from '../config/env.js';
import { AppError } from './error.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');

/* Extension and MIME type must both be on the list. The stored name is random,
   so nothing a person types ever becomes part of a path on disk. */
const ALLOWED = {
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.webp': ['image/webp'],
    '.gif': ['image/gif'],
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '.xls': ['application/vnd.ms-excel'],
    '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    '.txt': ['text/plain'],
};
const IMAGES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

/* The first bytes of each image format, checked after upload so a renamed file
   cannot pass as a photo. */
const SIGNATURES = [
    [0xff, 0xd8, 0xff],
    [0x89, 0x50, 0x4e, 0x47],
    [0x47, 0x49, 0x46, 0x38],
    [0x52, 0x49, 0x46, 0x46],
];

export function uploadTo(folder, { imagesOnly = false } = {}) {
    const dir = path.join(UPLOAD_ROOT, folder);
    fs.mkdirSync(dir, { recursive: true });

    return multer({
        storage: multer.diskStorage({
            destination: dir,
            filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
        }),
        limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
        fileFilter: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const mimes = ALLOWED[ext];
            if (!mimes || !mimes.includes(file.mimetype) || (imagesOnly && !IMAGES.has(ext))) {
                return cb(new AppError(imagesOnly ? 'Upload a JPG, PNG, WEBP or GIF image.' : 'That file type is not allowed.', { code: 'file_type' }));
            }
            cb(null, true);
        },
    });
}

/** After multer: reject images whose bytes are not an image. */
export async function verifyUpload(req, res, next) {
    const file = req.file;
    if (!file || !IMAGES.has(path.extname(file.filename))) return next();
    try {
        const handle = await fs.promises.open(file.path, 'r');
        const { buffer } = await handle.read(Buffer.alloc(4), 0, 4, 0);
        await handle.close();
        const ok = SIGNATURES.some((sig) => sig.every((b, i) => buffer[i] === b));
        if (!ok) {
            await fs.promises.unlink(file.path).catch(() => {});
            return next(new AppError('That image file is damaged or not really an image.', { code: 'file_type' }));
        }
        next();
    } catch (error) {
        next(error);
    }
}

/** Public URL for a stored upload, e.g. /uploads/products/ab12.png */
export const fileUrl = (folder, file) => (file ? `/uploads/${folder}/${file.filename}` : '');

export const fileMeta = (folder, file) =>
    file ? { url: fileUrl(folder, file), name: file.originalname.slice(0, 200), mimeType: file.mimetype } : undefined;

/** Best-effort removal of a replaced or orphaned upload. */
export async function removeUpload(url) {
    if (!url || !url.startsWith('/uploads/')) return;
    const target = path.resolve(UPLOAD_ROOT, url.replace('/uploads/', ''));
    if (!target.startsWith(UPLOAD_ROOT + path.sep)) return;
    await fs.promises.unlink(target).catch(() => {});
}
