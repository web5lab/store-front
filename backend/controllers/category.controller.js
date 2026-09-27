import Category from '../schemas/category.schema.js';
import Product from '../schemas/product.schema.js';
import { AppError, wrap } from '../middlewares/error.middleware.js';
import { objectId, text } from '../lib/validate.js';

export const listCategories = wrap(async (req, res) => {
    const [categories, counts] = await Promise.all([
        Category.find().sort({ name: 1 }).lean(),
        Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 }, units: { $sum: '$quantity' } } }]),
    ]);
    const byId = new Map(counts.map((c) => [String(c._id), c]));
    res.json({
        success: true,
        data: categories.map((c) => ({ ...c, productCount: byId.get(String(c._id))?.count || 0, units: byId.get(String(c._id))?.units || 0 })),
    });
});

export const createCategory = wrap(async (req, res) => {
    const name = text(req.body.name, 80);
    if (!name) throw new AppError('Category name is required.');
    const category = await Category.create({ name, description: text(req.body.description, 500) });
    res.status(201).json({ success: true, message: 'Category added.', data: category });
});

export const updateCategory = wrap(async (req, res) => {
    const name = text(req.body.name, 80);
    if (!name) throw new AppError('Category name is required.');
    const category = await Category.findByIdAndUpdate(
        objectId(req.params.id, 'Category'),
        { name, description: text(req.body.description, 500) },
        { returnDocument: 'after', runValidators: true }
    );
    if (!category) throw new AppError('Category not found.', { status: 404 });
    res.json({ success: true, message: 'Category saved.', data: category });
});

/** Products in a deleted category stay, they just become uncategorised. */
export const deleteCategory = wrap(async (req, res) => {
    const category = await Category.findByIdAndDelete(objectId(req.params.id, 'Category'));
    if (!category) throw new AppError('Category not found.', { status: 404 });
    await Product.updateMany({ category: category._id }, { category: null });
    res.json({ success: true, message: 'Category deleted.' });
});
