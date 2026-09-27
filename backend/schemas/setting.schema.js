import mongoose from 'mongoose';

/** The shop's own details, printed at the top of every bill. A single document. */
const settingSchema = new mongoose.Schema(
    {
        _id: { type: String, default: 'shop' },
        shopName: { type: String, trim: true, default: '' },
        address: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        email: { type: String, trim: true, default: '' },
        gstNumber: { type: String, trim: true, uppercase: true, default: '' },
        invoiceFooter: { type: String, trim: true, default: 'Thank you for your business.' },
    },
    { timestamps: true }
);

export default mongoose.model('Setting', settingSchema);
