import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        /* IN/OUT come from purchases and sales; OPENING and ADJUST are typed in by a person. */
        type: { type: String, enum: ['OPENING', 'IN', 'OUT', 'ADJUST'], required: true },
        /* Signed: positive adds stock, negative removes it. */
        quantity: { type: Number, required: true },
        balanceAfter: { type: Number, default: null },
        reference: {
            kind: { type: String, enum: ['sale', 'purchase', null], default: null },
            id: { type: mongoose.Schema.Types.ObjectId, default: null },
            label: { type: String, default: '' },
        },
        notes: { type: String, trim: true, default: '' },
        date: { type: Date, default: Date.now },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true }
);

stockMovementSchema.index({ product: 1, date: -1 });

export default mongoose.model('StockMovement', stockMovementSchema);
