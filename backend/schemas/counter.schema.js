import mongoose from 'mongoose';

/** One row per running number: products, customers, suppliers, sale and purchase invoices. */
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

export default mongoose.model('Counter', counterSchema);
