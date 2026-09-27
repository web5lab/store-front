import Transaction from '../schemas/transaction.schema.js';
import Party from '../schemas/party.schema.js';
import { AppError, wrap } from '../middlewares/error.middleware.js';
import { dateRange, escapeRegex, objectId } from '../lib/validate.js';
import { fileMeta, removeUpload } from '../middlewares/upload.middleware.js';
import { createTransaction, recordPayment } from '../services/transaction.service.js';

/** Mounted for both sales and purchases; `req.kind` is 'sale' or 'purchase'. */

const folder = (kind) => (kind === 'sale' ? 'sales' : 'purchases');

export const listTransactions = wrap(async (req, res) => {
    const filter = { kind: req.kind };
    const range = dateRange(req.query.from, req.query.to);
    if (range) filter.date = range;
    if (['Paid', 'Partial', 'Pending'].includes(req.query.status)) filter.paymentStatus = req.query.status;
    if (req.query.party) filter.party = objectId(req.query.party, 'Party');

    if (req.query.q) {
        const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 80)), 'i');
        const parties = await Party.find({ $or: [{ name: rx }, { code: rx }, { phone: rx }] }).select('_id').lean();
        filter.$or = [{ invoiceNumber: rx }, { party: { $in: parties.map((p) => p._id) } }];
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const page = Math.max(Number(req.query.page) || 1, 1);

    const [items, total, sums] = await Promise.all([
        Transaction.find(filter)
            .populate('party', 'code name phone')
            .select('-items.product -payments')
            .sort({ date: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Transaction.countDocuments(filter),
        Transaction.aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: '$total' }, received: { $sum: '$amountReceived' }, due: { $sum: '$balanceDue' } } },
        ]),
    ]);

    res.json({
        success: true,
        data: { items, total, page, pages: Math.max(Math.ceil(total / limit), 1), sums: sums[0] || { total: 0, received: 0, due: 0 } },
    });
});

export const getTransaction = wrap(async (req, res) => {
    const doc = await Transaction.findOne({ _id: objectId(req.params.id, 'Invoice'), kind: req.kind })
        .populate('party', 'code name phone email address gstNumber companyName')
        .populate('createdBy', 'username fullName')
        .lean();
    if (!doc) throw new AppError('Invoice not found.', { status: 404 });
    res.json({ success: true, data: doc });
});

export const createTransactionHandler = wrap(async (req, res) => {
    const attachment = fileMeta(folder(req.kind), req.file);
    try {
        const doc = await createTransaction(req.kind, req.body, { attachment, userId: req.user.userId });
        res.status(201).json({ success: true, message: `${req.kind === 'sale' ? 'Sale' : 'Purchase'} ${doc.invoiceNumber} saved.`, data: doc });
    } catch (error) {
        if (attachment) await removeUpload(attachment.url);
        throw error;
    }
});

export const addPayment = wrap(async (req, res) => {
    const doc = await recordPayment(req.kind, req.params.id, req.body, { userId: req.user.userId });
    res.json({ success: true, message: 'Payment recorded.', data: doc });
});
