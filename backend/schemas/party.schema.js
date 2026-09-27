import mongoose from 'mongoose';

/**
 * Customers and suppliers share one collection. They carry the same contact
 * details and the same kind of running account; `type` is the only thing that
 * decides which side of the books they sit on.
 */
const partySchema = new mongoose.Schema(
    {
        type: { type: String, enum: ['customer', 'supplier'], required: true, index: true },
        code: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: [true, 'Name is required'], trim: true },
        companyName: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        email: { type: String, trim: true, lowercase: true, default: '' },
        address: { type: String, trim: true, default: '' },
        gstNumber: { type: String, trim: true, uppercase: true, default: '' },
        openingBalance: { type: Number, default: 0, min: [0, 'Opening balance cannot be negative'] },
        photoUrl: { type: String, default: '' },
    },
    { timestamps: true }
);

partySchema.index({ type: 1, name: 1 });

export default mongoose.model('Party', partySchema);
