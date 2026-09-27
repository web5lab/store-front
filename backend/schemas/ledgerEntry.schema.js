import mongoose from 'mongoose';

/**
 * Double-entry style account lines per party.
 *
 * Customer: debit = they owe more (invoice, opening balance), credit = they paid.
 * Supplier: credit = we owe more (purchase, opening balance), debit = we paid.
 */
const ledgerEntrySchema = new mongoose.Schema(
    {
        party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
        partyType: { type: String, enum: ['customer', 'supplier'], required: true },
        entryType: { type: String, enum: ['debit', 'credit'], required: true },
        amount: { type: Number, required: true, min: [0.01, 'Amount must be more than zero'] },
        description: { type: String, trim: true, default: '' },
        reference: {
            kind: { type: String, enum: ['sale', 'purchase', 'opening', 'manual', 'payment', null], default: null },
            id: { type: mongoose.Schema.Types.ObjectId, default: null },
        },
        date: { type: Date, default: Date.now },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true }
);

ledgerEntrySchema.index({ party: 1, date: 1, _id: 1 });

export default mongoose.model('LedgerEntry', ledgerEntrySchema);
