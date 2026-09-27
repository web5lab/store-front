/**
 * One-time import from the Python/Flask version's SQLite database.
 *
 *   npm run migrate:sqlite -- ../../python-project/data/inventory.db
 *
 * The SQLite file is opened read-only and never changed. Uploaded photos and
 * attachments are copied from the Python project's uploads folder.
 *
 * Ledgers are rebuilt from invoices and opening balances rather than copied:
 * the Python version posted only the unpaid part of an invoice as a debit and
 * the paid part as a credit, which made every part-paid customer look like they
 * were owed money. Manual entries typed in by hand are carried over as they are.
 *
 * User accounts are not imported — their password hashes use Werkzeug's scrypt
 * format — so sign in with the admin from .env and add staff again.
 */
import '../config/env.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { DatabaseSync } from 'node:sqlite';

import Category from '../schemas/category.schema.js';
import Party from '../schemas/party.schema.js';
import Product from '../schemas/product.schema.js';
import Transaction from '../schemas/transaction.schema.js';
import LedgerEntry from '../schemas/ledgerEntry.schema.js';
import StockMovement from '../schemas/stockMovement.schema.js';
import { UPLOAD_ROOT } from '../middlewares/upload.middleware.js';
import { bumpCounter } from '../services/code.service.js';
import { money } from '../lib/validate.js';
import { statusFor } from '../services/transaction.service.js';
import { seedAdmin } from './seed.js';

const source = process.argv[2];
const force = process.argv.includes('--force');
if (!source || !fs.existsSync(source)) {
    console.error('Usage: npm run migrate:sqlite -- path/to/inventory.db [--force]');
    process.exit(2);
}

const legacyUploads = path.resolve(path.dirname(source), '..', 'uploads');
const db = new DatabaseSync(source, { readOnly: true });
const all = (sql) => {
    try {
        return db.prepare(sql).all();
    } catch {
        return [];
    }
};
/* SQLite CURRENT_TIMESTAMP is UTC without a zone marker. */
const when = (s) => (s ? new Date(`${String(s).replace(' ', 'T')}Z`) : new Date());

function copyUpload(relative, folder) {
    if (!relative) return null;
    const from = path.resolve(legacyUploads, relative);
    if (!from.startsWith(legacyUploads) || !fs.existsSync(from)) return null;
    const ext = path.extname(from).toLowerCase();
    const name = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    fs.mkdirSync(path.join(UPLOAD_ROOT, folder), { recursive: true });
    fs.copyFileSync(from, path.join(UPLOAD_ROOT, folder, name));
    return { url: `/uploads/${folder}/${name}`, name: path.basename(from), mimeType: ext === '.pdf' ? 'application/pdf' : `image/${ext.slice(1).replace('jpg', 'jpeg')}` };
}

/** Keep the highest running number so new codes never collide with imported ones. */
/* Only sequential codes count (CUS-000014); the old random hex codes (SUP-A77A4559) do not. */
const seqOf = (code) => (/^[A-Z]{3}-\d{1,9}$/.test(String(code)) ? Number(String(code).split('-')[1]) : 0);

await mongoose.connect(process.env.MONGO_URI);
await seedAdmin();

if (!force && ((await Party.exists({})) || (await Product.exists({})) || (await Transaction.exists({})))) {
    console.error('MongoDB already has inventory data. Re-run with --force to import on top of it anyway.');
    process.exit(1);
}

const ids = { category: new Map(), customer: new Map(), supplier: new Map(), product: new Map(), sale: new Map(), purchase: new Map() };
const seq = { customer: 0, supplier: 0, product: 0, sale: 0, purchase: 0 };

for (const r of all('SELECT * FROM categories')) {
    const doc = await Category.findOneAndUpdate({ name: r.name }, { $setOnInsert: { name: r.name, description: r.description || '' } }, { upsert: true, returnDocument: 'after' });
    ids.category.set(r.id, doc._id);
}

for (const type of ['supplier', 'customer']) {
    for (const r of all(`SELECT * FROM ${type}s`)) {
        const code = r[`${type}_code`] || `${type === 'customer' ? 'CUS' : 'SUP'}-${String(r.id).padStart(6, '0')}`;
        const photo = copyUpload(r.photo_path, `${type}s`);
        const party = await Party.create({
            type,
            code,
            name: r.name,
            companyName: r.company_name || '',
            phone: r.phone ? String(r.phone) : '',
            email: r.email || '',
            address: r.address || '',
            gstNumber: r.gst_number ? String(r.gst_number) : '',
            openingBalance: money(r.opening_balance || 0),
            photoUrl: photo?.url || '',
            createdAt: when(r.created_at),
        });
        ids[type].set(r.id, party._id);
        seq[type] = Math.max(seq[type], seqOf(code));
        if (party.openingBalance > 0) {
            await LedgerEntry.create({
                party: party._id,
                partyType: type,
                entryType: type === 'customer' ? 'debit' : 'credit',
                amount: party.openingBalance,
                description: 'Opening balance',
                reference: { kind: 'opening' },
                date: when(r.created_at),
            });
        }
    }
}

for (const r of all('SELECT * FROM products')) {
    const file = copyUpload(r.file_path, 'products');
    const doc = await Product.create({
        code: r.product_code,
        name: r.name,
        category: ids.category.get(r.category_id) || null,
        supplier: ids.supplier.get(r.supplier_id) || null,
        purchasePrice: money(r.purchase_price),
        sellingPrice: money(r.selling_price),
        quantity: Math.max(0, Number(r.quantity) || 0),
        minimumStock: Number(r.minimum_stock ?? 5),
        unit: r.unit || 'Piece',
        description: r.description || '',
        file: file || undefined,
        createdAt: when(r.created_at),
    });
    ids.product.set(r.id, doc);
    seq.product = Math.max(seq.product, seqOf(r.product_code));
}

for (const [kind, table, itemTable, partyKey, priceKey, dateKey] of [
    ['sale', 'sales', 'sale_items', 'customer_id', 'selling_price', 'sale_date'],
    ['purchase', 'purchases', 'purchase_items', 'supplier_id', 'purchase_price', 'purchase_date'],
]) {
    const partyType = kind === 'sale' ? 'customer' : 'supplier';
    const lines = all(`SELECT * FROM ${itemTable}`);
    for (const r of all(`SELECT * FROM ${table} ORDER BY id`)) {
        const items = lines
            .filter((l) => l[`${kind}_id`] === r.id && ids.product.has(l.product_id))
            .map((l) => {
                const p = ids.product.get(l.product_id);
                return { product: p._id, code: p.code, name: p.name, unit: p.unit, quantity: l.quantity, price: money(l[priceKey]), total: money(l.total) };
            });
        if (!items.length) continue;

        const partyId = ids[partyType].get(r[partyKey]) || null;
        const date = when(r[dateKey]);
        const total = money(r.total_amount);
        const received = money(r.amount_received);
        const doc = await Transaction.create({
            kind,
            invoiceNumber: r.invoice_number,
            party: partyId,
            date,
            items,
            subtotal: money(r.subtotal),
            discount: money(r.discount),
            gstPercent: Number(r.gst_percent) || 0,
            tax: money(r.tax),
            total,
            amountReceived: received,
            balanceDue: money(total - received),
            paymentStatus: statusFor(total, received),
            payments: received > 0 ? [{ amount: received, note: 'At billing', date }] : [],
            notes: r.notes || '',
            attachment: copyUpload(r.attachment_path, table) || undefined,
        });
        ids[kind].set(r.id, doc._id);
        seq[kind] = Math.max(seq[kind], seqOf(r.invoice_number));

        if (partyId) {
            const charge = partyType === 'customer' ? 'debit' : 'credit';
            const pay = partyType === 'customer' ? 'credit' : 'debit';
            const label = kind === 'sale' ? 'Sale' : 'Purchase';
            const entries = [{ party: partyId, partyType, entryType: charge, amount: total, description: `${label} ${doc.invoiceNumber}`, reference: { kind, id: doc._id }, date }];
            if (received > 0) entries.push({ party: partyId, partyType, entryType: pay, amount: received, description: `Payment on ${doc.invoiceNumber}`, reference: { kind, id: doc._id }, date });
            await LedgerEntry.insertMany(entries.filter((e) => e.amount > 0));
        }
    }
}

/* Hand-typed ledger lines: no reference, not the opening balance. */
let manual = 0;
for (const r of all("SELECT * FROM account_ledgers WHERE reference_type IS NULL AND COALESCE(description,'') <> 'Opening balance'")) {
    const party = ids[r.party_type]?.get(r.party_id);
    if (!party || !(r.amount > 0)) continue;
    await LedgerEntry.create({
        party,
        partyType: r.party_type,
        entryType: r.entry_type,
        amount: money(r.amount),
        description: r.description || 'Manual entry',
        reference: { kind: 'manual' },
        date: when(r.created_at),
    });
    manual++;
}

let movements = 0;
for (const r of all('SELECT * FROM stock_transactions')) {
    const product = ids.product.get(r.product_id);
    if (!product) continue;
    const kind = r.reference_type === 'sales' ? 'sale' : r.reference_type === 'purchases' ? 'purchase' : null;
    const out = r.transaction_type === 'OUT';
    await StockMovement.create({
        product: product._id,
        type: out ? 'OUT' : 'IN',
        quantity: out ? -r.quantity : r.quantity,
        reference: { kind, id: kind ? ids[kind].get(r.reference_id) || null : null, label: '' },
        notes: r.notes || '',
        date: when(r.transaction_date),
    });
    movements++;
}

for (const [key, value] of Object.entries(seq)) await bumpCounter(key, value);

console.log(
    `Imported ${ids.category.size} categories, ${ids.customer.size} customers, ${ids.supplier.size} suppliers, ` +
        `${ids.product.size} products, ${ids.sale.size} sales, ${ids.purchase.size} purchases, ` +
        `${manual} manual ledger entries and ${movements} stock movements.`
);
await mongoose.disconnect();
