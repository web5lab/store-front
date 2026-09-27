import mongoose from 'mongoose';
import LedgerEntry from '../schemas/ledgerEntry.schema.js';
import { money } from '../lib/validate.js';

/**
 * Balance is always shown as "how much is outstanding" from the shop's side:
 *   customer → debit − credit  (positive: they owe you)
 *   supplier → credit − debit  (positive: you owe them)
 */
export const outstanding = (type, debit, credit) => money(type === 'customer' ? debit - credit : credit - debit);

export async function balanceFor(party) {
    const [totals] = await LedgerEntry.aggregate([
        { $match: { party: new mongoose.Types.ObjectId(String(party._id)) } },
        {
            $group: {
                _id: null,
                debit: { $sum: { $cond: [{ $eq: ['$entryType', 'debit'] }, '$amount', 0] } },
                credit: { $sum: { $cond: [{ $eq: ['$entryType', 'credit'] }, '$amount', 0] } },
            },
        },
    ]);
    const debit = money(totals?.debit);
    const credit = money(totals?.credit);
    return { debit, credit, balance: outstanding(party.type, debit, credit) };
}

/** Balances for many parties in one query, keyed by id. */
export async function balancesFor(type) {
    const rows = await LedgerEntry.aggregate([
        { $match: { partyType: type } },
        {
            $group: {
                _id: '$party',
                debit: { $sum: { $cond: [{ $eq: ['$entryType', 'debit'] }, '$amount', 0] } },
                credit: { $sum: { $cond: [{ $eq: ['$entryType', 'credit'] }, '$amount', 0] } },
            },
        },
    ]);
    return new Map(
        rows.map((r) => [r._id.toString(), { debit: money(r.debit), credit: money(r.credit), balance: outstanding(type, r.debit, r.credit) }])
    );
}

/** Opening balance: customer starts owing (debit), supplier starts being owed (credit). */
export function openingEntry(party, userId) {
    if (!party.openingBalance) return null;
    return {
        party: party._id,
        partyType: party.type,
        entryType: party.type === 'customer' ? 'debit' : 'credit',
        amount: money(party.openingBalance),
        description: 'Opening balance',
        reference: { kind: 'opening', id: null },
        createdBy: userId,
    };
}

/** Money that moves the balance down: customer paid us, or we paid the supplier. */
export const paymentSide = (partyType) => (partyType === 'customer' ? 'credit' : 'debit');
/** Money that moves the balance up: we invoiced the customer, or the supplier invoiced us. */
export const chargeSide = (partyType) => (partyType === 'customer' ? 'debit' : 'credit');

/** Running balance column for a statement. */
export async function statement(party) {
    const entries = await LedgerEntry.find({ party: party._id }).sort({ date: 1, _id: 1 }).lean();
    let running = 0;
    return entries.map((e) => {
        const up = e.entryType === chargeSide(party.type);
        running = money(running + (up ? e.amount : -e.amount));
        return { ...e, runningBalance: running };
    });
}
