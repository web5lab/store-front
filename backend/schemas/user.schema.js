import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true, trim: true, lowercase: true },
        /* Never leaves the database unless a query asks for it by name. */
        passwordHash: { type: String, required: true, select: false },
        fullName: { type: String, trim: true, default: '' },
        role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.model('User', userSchema);
