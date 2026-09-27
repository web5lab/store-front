import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: [true, 'Product name is required'], trim: true },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
        supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', default: null },
        purchasePrice: { type: Number, default: 0, min: [0, 'Purchase price cannot be negative'] },
        sellingPrice: { type: Number, default: 0, min: [0, 'Selling price cannot be negative'] },
        /* Only ever changed by a sale, a purchase or a recorded adjustment —
           never by editing the product — so every unit has a paper trail. */
        quantity: { type: Number, default: 0, min: [0, 'Stock cannot go below zero'] },
        minimumStock: { type: Number, default: 5, min: [0, 'Minimum stock cannot be negative'] },
        unit: { type: String, trim: true, default: 'Piece' },
        description: { type: String, trim: true, default: '' },
        file: {
            url: { type: String, default: '' },
            name: { type: String, default: '' },
            mimeType: { type: String, default: '' },
        },
    },
    { timestamps: true }
);

productSchema.index({ name: 1 });

export default mongoose.model('Product', productSchema);
