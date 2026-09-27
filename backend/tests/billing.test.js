import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTotals, statusFor } from '../services/transaction.service.js';
import { outstanding } from '../services/ledger.service.js';

const items = [
    { quantity: 2, price: 250 },
    { quantity: 1, price: 99.99 },
];

test('totals: discount comes off before GST, all rounded to paise', () => {
    const t = computeTotals({ items, discount: '49.99', gstPercent: '18', amountReceived: '300' });
    assert.equal(t.subtotal, 599.99);
    assert.equal(t.tax, 99);
    assert.equal(t.total, 649);
    assert.equal(t.balanceDue, 349);
    assert.equal(t.paymentStatus, 'Partial');
});

test('totals: refuses discounts over the subtotal and overpayment', () => {
    assert.throws(() => computeTotals({ items, discount: 1000 }), /Discount cannot be more/);
    assert.throws(() => computeTotals({ items, amountReceived: 10000 }), /cannot be more than the invoice total/);
    assert.throws(() => computeTotals({ items, gstPercent: 120 }), /GST %/);
});

test('status follows what is left to pay', () => {
    assert.equal(statusFor(100, 100), 'Paid');
    assert.equal(statusFor(100, 40), 'Partial');
    assert.equal(statusFor(100, 0), 'Pending');
});

test('outstanding is measured from the shop side for both parties', () => {
    /* A ₹500 sale with ₹400 paid leaves the customer owing ₹100 — the case the
       old Python ledger got wrong (it showed −₹300). */
    assert.equal(outstanding('customer', 500, 400), 100);
    assert.equal(outstanding('supplier', 200, 900), 700);
});
