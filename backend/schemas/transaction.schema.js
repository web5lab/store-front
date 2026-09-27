import mongoose from 'mongoose';

/**
 * A sale or a purchase invoice. Line items keep a copy of the product's code
 * and name at the time of billing, so renaming a product later never rewrites
 * an invoice that has already been handed to someone.
 */
const itemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        code: { type: String, required: true },
        name: { type: String, required: true },
        unit: { type: String, default: 'Piece' },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const paymentSchema = new mongoose.Schema(
    {
        amount: { type: Number, required: true, min: 0 },
        note: { type: String, default: '' },
        date: { type: Date, default: Date.now },
    },
    { _id: true }
);

const transactionSchema = new mongoose.Schema(
    {
        kind: { type: String, enum: ['sale', 'purchase'], required: true, index: true },
        invoiceNumber: { type: String, required: true, unique: true, trim: true },
        party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', default: null, index: true },
        date: { type: Date, default: Date.now, index: true },
        items: { type: [itemSchema], validate: [(v) => v.length > 0, 'At least one product is required'] },
        subtotal: { type: Number, required: true, min: 0 },
        discount: { type: Number, default: 0, min: 0 },
        gstPercent: { type: Number, default: 0, min: 0 },
        tax: { type: Number, default: 0, min: 0 },
        total: { type: Number, required: true, min: 0 },
        amountReceived: { type: Number, default: 0, min: 0 },
        balanceDue: { type: Number, default: 0, min: 0 },
        paymentStatus: { type: String, enum: ['Paid', 'Partial', 'Pending'], default: 'Paid', index: true },
        payments: { type: [paymentSchema], default: [] },
        notes: { type: String, trim: true, default: '' },
        attachment: {
            url: { type: String, default: '' },
            name: { type: String, default: '' },
            mimeType: { type: String, default: '' },
        },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true }
);

transactionSchema.index({ kind: 1, date: -1 });
transactionSchema.index({ 'items.product': 1 });

export default mongoose.model('Transaction', transactionSchema);
