import Party from '../schemas/party.schema.js';
import Product from '../schemas/product.schema.js';
import Transaction from '../schemas/transaction.schema.js';
import LedgerEntry from '../schemas/ledgerEntry.schema.js';
import { AppError, wrap } from '../middlewares/error.middleware.js';
import { escapeRegex, money, number, objectId, text } from '../lib/validate.js';
import { fileUrl, removeUpload } from '../middlewares/upload.middleware.js';
import { nextCode } from '../services/code.service.js';
import { balanceFor, balancesFor, openingEntry, statement } from '../services/ledger.service.js';

/**
 * Customers and suppliers share every handler here. The router mounts this file
 * twice and `req.partyType` says which book it is working in.
 */

const label = (type) => (type === 'customer' ? 'Customer' : 'Supplier');
const folder = (type) => `${type}s`;

function fields(body) {
    const name = text(body.name, 160);
    if (!name) throw new AppError('Name is required.');
    const email = text(body.email, 160);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Email address does not look right.');
    const gstNumber = text(body.gstNumber, 20).toUpperCase();
    if (gstNumber && !/^[0-9A-Z]{15}$/.test(gstNumber)) throw new AppError('GST number should be 15 letters and digits.');
    return {
        name,
        companyName: text(body.companyName, 160),
        phone: text(body.phone, 30),
        email,
        address: text(body.address, 500),
        gstNumber,
    };
}

async function findParty(req) {
    const party = await Party.findOne({ _id: objectId(req.params.id, label(req.partyType)), type: req.partyType });
    if (!party) throw new AppError(`${label(req.partyType)} not found.`, { status: 404 });
    return party;
}

export const listParties = wrap(async (req, res) => {
    const filter = { type: req.partyType };
    if (req.query.q) {
        const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 80)), 'i');
        filter.$or = [{ name: rx }, { code: rx }, { phone: rx }, { companyName: rx }, { gstNumber: rx }];
    }
    const [parties, balances] = await Promise.all([Party.find(filter).sort({ name: 1 }).lean(), balancesFor(req.partyType)]);
    res.json({
        success: true,
        data: parties.map((p) => ({ ...p, ...(balances.get(String(p._id)) || { debit: 0, credit: 0, balance: 0 }) })),
    });
});

export const getParty = wrap(async (req, res) => {
    const party = await findParty(req);
    const [balance, transactions] = await Promise.all([
        balanceFor(party),
        Transaction.find({ party: party._id }).sort({ date: -1 }).limit(20).select('kind invoiceNumber date total amountReceived balanceDue paymentStatus').lean(),
    ]);
    res.json({ success: true, data: { party, balance, transactions } });
});

export const createParty = wrap(async (req, res) => {
    const photoUrl = fileUrl(folder(req.partyType), req.file);
    try {
        const data = fields(req.body);
        const openingBalance = money(number(req.body.openingBalance, 'Opening balance'));
        const code = text(req.body.code, 40) || (await nextCode(req.partyType));
        const party = await Party.create({ ...data, type: req.partyType, code, openingBalance, photoUrl });
        const entry = openingEntry(party, req.user.userId);
        if (entry) await LedgerEntry.create(entry);
        res.status(201).json({ success: true, message: `${label(req.partyType)} added.`, data: party });
    } catch (error) {
        await removeUpload(photoUrl);
        throw error;
    }
});

export const updateParty = wrap(async (req, res) => {
    const newPhoto = fileUrl(folder(req.partyType), req.file);
    try {
        const party = await findParty(req);
        Object.assign(party, fields(req.body));
        const code = text(req.body.code, 40);
        if (code) party.code = code;

        /* Changing the opening balance rewrites the single opening line, never
           adds a second one. */
        if (req.body.openingBalance !== undefined) {
            const opening = money(number(req.body.openingBalance, 'Opening balance'));
            if (opening !== party.openingBalance) {
                party.openingBalance = opening;
                await LedgerEntry.deleteMany({ party: party._id, 'reference.kind': 'opening' });
                const entry = openingEntry(party, req.user.userId);
                if (entry) await LedgerEntry.create({ ...entry, date: party.createdAt });
            }
        }

        const previousPhoto = party.photoUrl;
        if (newPhoto) party.photoUrl = newPhoto;
        else if (req.body.removePhoto === 'true') party.photoUrl = '';
        await party.save();
        if (previousPhoto && previousPhoto !== party.photoUrl) await removeUpload(previousPhoto);

        res.json({ success: true, message: `${label(req.partyType)} saved.`, data: party });
    } catch (error) {
        await removeUpload(newPhoto);
        throw error;
    }
});

export const deleteParty = wrap(async (req, res) => {
    const party = await findParty(req);
    const [hasInvoices, hasEntries] = await Promise.all([
        Transaction.exists({ party: party._id }),
        LedgerEntry.exists({ party: party._id, 'reference.kind': { $ne: 'opening' } }),
    ]);
    if (hasInvoices || hasEntries) {
        throw new AppError(`This ${req.partyType} has invoices or account entries, so it cannot be deleted.`, { status: 409, code: 'in_use' });
    }
    await LedgerEntry.deleteMany({ party: party._id });
    if (party.type === 'supplier') await Product.updateMany({ supplier: party._id }, { supplier: null });
    await party.deleteOne();
    await removeUpload(party.photoUrl);
    res.json({ success: true, message: `${label(req.partyType)} deleted.` });
});

export const getLedger = wrap(async (req, res) => {
    const party = await findParty(req);
    const [entries, balance] = await Promise.all([statement(party), balanceFor(party)]);
    res.json({ success: true, data: { party, entries, balance } });
});

/** A payment or correction typed in by hand, not tied to an invoice. */
export const addLedgerEntry = wrap(async (req, res) => {
    const party = await findParty(req);
    const entryType = req.body.entryType;
    if (!['debit', 'credit'].includes(entryType)) throw new AppError('Choose debit or credit.');
    const amount = money(number(req.body.amount, 'Amount', { min: 0.01 }));
    const date = req.body.date ? new Date(req.body.date) : new Date();
    if (Number.isNaN(date.getTime())) throw new AppError('Date is not valid.');

    const entry = await LedgerEntry.create({
        party: party._id,
        partyType: party.type,
        entryType,
        amount,
        description: text(req.body.description, 300) || 'Manual entry',
        reference: { kind: 'manual', id: null },
        date,
        createdBy: req.user.userId,
    });
    res.status(201).json({ success: true, message: 'Entry recorded.', data: entry });
});
