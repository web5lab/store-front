/**
 * One place where failures become responses.
 *
 * Controllers throw; this decides what the person sees. Internal details never
 * cross the wire in production.
 */

/** Wrap an async controller so a rejected promise reaches the handler below. */
export const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

/** A failure we chose to surface, with wording meant for a person. */
export class AppError extends Error {
    constructor(message, { status = 400, code = 'bad_request', details = null } = {}) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export const notFound = (req, res) =>
    res.status(404).json({ success: false, code: 'not_found', message: `No route for ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
export function errorHandler(error, req, res, next) {
    const inProduction = process.env.NODE_ENV === 'production';

    let status = error.status || error.statusCode || 500;
    let code = typeof error.code === 'string' ? error.code : 'server_error';
    let message = error.message || 'Something went wrong.';
    const extra = {};

    if (error instanceof AppError) {
        if (error.details) extra.details = error.details;
    } else if (error.name === 'ValidationError' && error.errors) {
        status = 400;
        code = 'invalid_input';
        const first = Object.values(error.errors)[0];
        message = first?.message || 'Some of those details were not right.';
        extra.details = Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v.message]));
    } else if (error.name === 'CastError') {
        status = 400;
        code = 'invalid_id';
        message = 'That record id is not valid.';
    } else if (error.code === 11000) {
        status = 409;
        code = 'duplicate';
        const field = Object.keys(error.keyValue || {})[0];
        message = field ? `A record with that ${field} already exists.` : 'That already exists.';
    } else if (error.type === 'entity.too.large') {
        status = 413;
        code = 'too_large';
        message = 'That request was too large.';
    } else if (error.name === 'MulterError') {
        status = 400;
        code = 'upload_failed';
        message = error.code === 'LIMIT_FILE_SIZE' ? 'That file is larger than the upload limit.' : 'The upload was not accepted.';
    }

    if (status >= 500) {
        console.error(`[${req.method} ${req.originalUrl}]`, error);
        if (inProduction) message = 'Something went wrong on the server. Try again in a moment.';
    }

    res.status(status).json({
        success: false,
        code,
        message,
        ...extra,
        ...(inProduction || status < 500 ? {} : { stack: error.stack?.split('\n').slice(0, 4) }),
    });
}
