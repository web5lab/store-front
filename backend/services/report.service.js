import Transaction from '../schemas/transaction.schema.js';
import Product from '../schemas/product.schema.js';
import Party from '../schemas/party.schema.js';
import { AppError } from '../middlewares/error.middleware.js';
import { dateRange, money, objectId } from '../lib/validate.js';
import { statement, balanceFor } from './ledger.service.js';

const periodLabel = (from, to) => {
    const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (from && to) return `${fmt(from)} – ${fmt(to)}`;
    if (from) return `From ${fmt(from)}`;
    if (to) return `Up to ${fmt(to)}`;
    return 'All time';
};

const sum = (rows, key) => money(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0));

async function invoices(kind, { from, to }) {
    const filter = { kind };
    const range = dateRange(from, to);
    if (range) filter.date = range;
    const docs = await Transaction.find(filter).populate('party', 'code name').sort({ date: -1 }).lean();
    const rows = docs.map((t) => ({
        invoiceNumber: t.invoiceNumber,
        date: t.date,
        party: t.party ? `${t.party.name} (${t.party.code})` : kind === 'sale' ? 'Walk-in' : '—',
        items: t.items.reduce((s, i) => s + i.quantity, 0),
        subtotal: t.subtotal,
        discount: t.discount,
        tax: t.tax,
        total: t.total,
        amountReceived: t.amountReceived,
        balanceDue: t.balanceDue,
        paymentStatus: t.paymentStatus,
    }));
    const moneyKeys = ['subtotal', 'discount', 'tax', 'total', 'amountReceived', 'balanceDue'];
    return {
        title: kind === 'sale' ? 'Sales report' : 'Purchases report',
        subtitle: `${periodLabel(from, to)} · ${rows.length} invoice${rows.length === 1 ? '' : 's'}`,
        columns: [
            { header: 'Invoice', key: 'invoiceNumber' },
            { header: 'Date', key: 'date', type: 'date' },
            { header: kind === 'sale' ? 'Customer' : 'Supplier', key: 'party' },
            { header: 'Qty', key: 'items', type: 'number' },
            { header: 'Subtotal', key: 'subtotal', type: 'money' },
            { header: 'Discount', key: 'discount', type: 'money' },
            { header: 'GST', key: 'tax', type: 'money' },
            { header: 'Total', key: 'total', type: 'money' },
            { header: kind === 'sale' ? 'Received' : 'Paid', key: 'amountReceived', type: 'money' },
            { header: 'Due', key: 'balanceDue', type: 'money' },
            { header: 'Status', key: 'paymentStatus' },
        ],
        rows,
        totals: Object.fromEntries([...moneyKeys.map((k) => [k, sum(rows, k)]), ['items', sum(rows, 'items')]]),
    };
}

async function stock() {
    const docs = await Product.find().populate('category', 'name').sort({ name: 1 }).lean();
    const rows = docs.map((p) => ({
        code: p.code,
        name: p.name,
        category: p.category?.name || '',
        quantity: p.quantity,
        unit: p.unit,
        minimumStock: p.minimumStock,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        stockValue: money(p.quantity * p.purchasePrice),
        status: p.quantity === 0 ? 'Out of stock' : p.quantity <= p.minimumStock ? 'Low' : 'OK',
    }));
    return {
        title: 'Stock report',
        subtitle: `As of ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · ${rows.length} products`,
        columns: [
            { header: 'Code', key: 'code' },
            { header: 'Product', key: 'name' },
            { header: 'Category', key: 'category' },
            { header: 'Stock', key: 'quantity', type: 'number' },
            { header: 'Unit', key: 'unit' },
            { header: 'Min', key: 'minimumStock', type: 'number' },
            { header: 'Cost', key: 'purchasePrice', type: 'money' },
            { header: 'Price', key: 'sellingPrice', type: 'money' },
            { header: 'Stock value', key: 'stockValue', type: 'money' },
            { header: 'Status', key: 'status' },
        ],
        rows,
        totals: { quantity: sum(rows, 'quantity'), stockValue: sum(rows, 'stockValue') },
    };
}

async function ledger({ party: partyId }) {
    const party = await Party.findById(objectId(partyId, 'Party'));
    if (!party) throw new AppError('Choose a customer or supplier for the statement.', { status: 404 });
    const entries = await statement(party);
    const totals = await balanceFor(party);
    return {
        title: `Statement — ${party.name}`,
        subtitle: `${party.code} · ${party.type === 'customer' ? 'Customer' : 'Supplier'} · Outstanding ${totals.balance.toFixed(2)}`,
        columns: [
            { header: 'Date', key: 'date', type: 'date' },
            { header: 'Description', key: 'description' },
            { header: 'Debit', key: 'debit', type: 'money' },
            { header: 'Credit', key: 'credit', type: 'money' },
            { header: 'Balance', key: 'runningBalance', type: 'money' },
        ],
        rows: entries.map((e) => ({
            date: e.date,
            description: e.description,
            debit: e.entryType === 'debit' ? e.amount : '',
            credit: e.entryType === 'credit' ? e.amount : '',
            runningBalance: e.runningBalance,
        })),
        totals: { debit: totals.debit, credit: totals.credit, runningBalance: totals.balance },
    };
}

export const REPORTS = ['sales', 'purchases', 'stock', 'ledger'];

export function buildReport(kind, query) {
    if (kind === 'sales') return invoices('sale', query);
    if (kind === 'purchases') return invoices('purchase', query);
    if (kind === 'stock') return stock();
    if (kind === 'ledger') return ledger(query);
    throw new AppError('Unknown report.', { status: 404 });
}
