import Transaction from '../schemas/transaction.schema.js';
import Product from '../schemas/product.schema.js';
import Party from '../schemas/party.schema.js';
import StockMovement from '../schemas/stockMovement.schema.js';
import LedgerEntry from '../schemas/ledgerEntry.schema.js';
import { AppError } from '../middlewares/error.middleware.js';
import { money, number, objectId, text } from '../lib/validate.js';
import { nextCode } from './code.service.js';
import { chargeSide, paymentSide } from './ledger.service.js';

const PARTY_TYPE = { sale: 'customer', purchase: 'supplier' };

export const statusFor = (total, received) => {
    const due = money(total - received);
    if (due <= 0) return 'Paid';
    return received > 0 ? 'Partial' : 'Pending';
};

/** Validate and total the bill. Pure — nothing is written here. */
export function computeTotals({ items, discount, gstPercent, amountReceived }) {
    const subtotal = money(items.reduce((sum, i) => sum + i.quantity * i.price, 0));
    const disc = money(number(discount, 'Discount'));
    const gst = number(gstPercent, 'GST %');
    const received = money(number(amountReceived, 'Amount received'));

    if (gst > 100) throw new AppError('GST % cannot be more than 100.');
    if (disc > subtotal) throw new AppError('Discount cannot be more than the subtotal.');

    const tax = money(((subtotal - disc) * gst) / 100);
    const total = money(subtotal - disc + tax);
    if (received > total) throw new AppError('Amount received cannot be more than the invoice total.');

    const balanceDue = money(total - received);
    return { subtotal, discount: disc, gstPercent: gst, tax, total, amountReceived: received, balanceDue, paymentStatus: statusFor(total, received) };
}

function parseItems(raw) {
    let items = raw;
    if (typeof raw === 'string') {
        try {
            items = JSON.parse(raw);
        } catch {
            throw new AppError('The product list could not be read.');
        }
    }
    if (!Array.isArray(items) || items.length === 0) throw new AppError('Add at least one product to the bill.');
    if (items.length > 200) throw new AppError('A bill can have at most 200 lines.');

    return items.map((item, i) => ({
        product: objectId(item.product, `Product on line ${i + 1}`),
        quantity: number(item.quantity, `Quantity on line ${i + 1}`, { min: 1, integer: true }),
        price: money(number(item.price, `Price on line ${i + 1}`)),
    }));
}

/**
 * Create a sale or purchase, move stock, and post to the party's ledger.
 *
 * A standalone MongoDB server has no multi-document transactions, so stock is
 * moved with conditional atomic updates (a sale only decrements while enough
 * stock is left) and every step that already happened is undone if a later
 * step fails. Two cashiers selling the last unit at once cannot both succeed.
 */
export async function createTransaction(kind, body, { attachment, userId }) {
    const items = parseItems(body.items);
    const totals = computeTotals({ ...body, items });

    let party = null;
    if (body.party) {
        party = await Party.findOne({ _id: objectId(body.party, 'Party'), type: PARTY_TYPE[kind] });
        if (!party) throw new AppError(`That ${PARTY_TYPE[kind]} no longer exists.`, { status: 404 });
    }
    /* Money owed has to be owed by someone, or it can never be collected. */
    if (totals.balanceDue > 0 && !party) {
        throw new AppError(
            kind === 'sale'
                ? 'Select a customer to sell on credit. Walk-in sales must be paid in full.'
                : 'Select a supplier to buy on credit. Unnamed purchases must be paid in full.'
        );
    }

    const products = await Product.find({ _id: { $in: items.map((i) => i.product) } });
    const byId = new Map(products.map((p) => [p._id.toString(), p]));
    for (const item of items) {
        if (!byId.has(String(item.product))) throw new AppError('One of the products on the bill no longer exists.', { status: 404 });
    }

    /* The same product on two lines is one stock movement. */
    const perProduct = new Map();
    for (const item of items) perProduct.set(String(item.product), (perProduct.get(String(item.product)) || 0) + item.quantity);

    const sign = kind === 'sale' ? -1 : 1;
    const moved = [];
    const undoStock = () =>
        Promise.all(moved.map(({ id, qty }) => Product.updateOne({ _id: id }, { $inc: { quantity: -sign * qty } })));

    try {
        for (const [id, qty] of perProduct) {
            const filter = kind === 'sale' ? { _id: id, quantity: { $gte: qty } } : { _id: id };
            const updated = await Product.findOneAndUpdate(filter, { $inc: { quantity: sign * qty } }, { returnDocument: 'after' });
            if (!updated) {
                const p = byId.get(id);
                const fresh = await Product.findById(id).select('quantity');
                throw new AppError(`Not enough stock for ${p.name}. ${fresh?.quantity ?? 0} ${p.unit} left, ${qty} on the bill.`, {
                    code: 'insufficient_stock',
                });
            }
            moved.push({ id, qty, after: updated.quantity });
        }

        const invoiceNumber = text(body.invoiceNumber, 40) || (await nextCode(kind));
        const date = body.date ? new Date(body.date) : new Date();
        if (Number.isNaN(date.getTime())) throw new AppError('Invoice date is not valid.');

        const doc = await Transaction.create({
            kind,
            invoiceNumber,
            party: party?._id || null,
            date,
            items: items.map((i) => {
                const p = byId.get(String(i.product));
                return { product: p._id, code: p.code, name: p.name, unit: p.unit, quantity: i.quantity, price: i.price, total: money(i.quantity * i.price) };
            }),
            ...totals,
            payments: totals.amountReceived > 0 ? [{ amount: totals.amountReceived, note: 'At billing', date }] : [],
            notes: text(body.notes, 1000),
            attachment: attachment || undefined,
            createdBy: userId,
        });

        try {
            await StockMovement.insertMany(
                moved.map(({ id, qty, after }) => ({
                    product: id,
                    type: kind === 'sale' ? 'OUT' : 'IN',
                    quantity: sign * qty,
                    balanceAfter: after,
                    reference: { kind, id: doc._id, label: doc.invoiceNumber },
                    date,
                    createdBy: userId,
                }))
            );

            if (party) {
                const entries = [
                    {
                        party: party._id,
                        partyType: party.type,
                        entryType: chargeSide(party.type),
                        amount: totals.total,
                        description: `${kind === 'sale' ? 'Sale' : 'Purchase'} ${doc.invoiceNumber}`,
                        reference: { kind, id: doc._id },
                        date,
                        createdBy: userId,
                    },
                ];
                if (totals.amountReceived > 0) {
                    entries.push({
                        party: party._id,
                        partyType: party.type,
                        entryType: paymentSide(party.type),
                        amount: totals.amountReceived,
                        description: `Payment on ${doc.invoiceNumber}`,
                        reference: { kind, id: doc._id },
                        date,
                        createdBy: userId,
                    });
                }
                /* A zero-total bill (fully discounted) has nothing to post. */
                await LedgerEntry.insertMany(entries.filter((e) => e.amount > 0));
            }
        } catch (error) {
            await Promise.all([
                StockMovement.deleteMany({ 'reference.id': doc._id }),
                LedgerEntry.deleteMany({ 'reference.id': doc._id }),
                Transaction.deleteOne({ _id: doc._id }),
            ]);
            throw error;
        }

        return doc;
    } catch (error) {
        await undoStock();
        throw error;
    }
}

/** Collect money against an open invoice. */
export async function recordPayment(kind, id, body, { userId }) {
    const amount = money(number(body.amount, 'Amount', { min: 0.01 }));
    const note = text(body.note, 300);
    const date = body.date ? new Date(body.date) : new Date();
    if (Number.isNaN(date.getTime())) throw new AppError('Payment date is not valid.');

    /* Conditional update: only succeeds while the amount still fits the balance,
       so two people recording the same payment cannot overpay an invoice. */
    const updated = await Transaction.findOneAndUpdate(
        { _id: objectId(id, 'Invoice'), kind, balanceDue: { $gte: amount } },
        { $inc: { amountReceived: amount, balanceDue: -amount }, $push: { payments: { amount, note, date } } },
        { returnDocument: 'after' }
    );
    if (!updated) {
        const existing = await Transaction.findOne({ _id: id, kind }).select('balanceDue');
        if (!existing) throw new AppError('Invoice not found.', { status: 404 });
        throw new AppError(`Payment is more than the balance due (${existing.balanceDue.toFixed(2)}).`);
    }

    updated.amountReceived = money(updated.amountReceived);
    updated.balanceDue = money(updated.balanceDue);
    updated.paymentStatus = statusFor(updated.total, updated.amountReceived);
    await updated.save();

    if (updated.party) {
        const partyType = PARTY_TYPE[kind];
        await LedgerEntry.create({
            party: updated.party,
            partyType,
            entryType: paymentSide(partyType),
            amount,
            description: note ? `Payment on ${updated.invoiceNumber} — ${note}` : `Payment on ${updated.invoiceNumber}`,
            reference: { kind, id: updated._id },
            date,
            createdBy: userId,
        });
    }
    return updated;
}
