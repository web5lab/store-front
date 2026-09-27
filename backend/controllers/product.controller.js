import Product from '../schemas/product.schema.js';
import Category from '../schemas/category.schema.js';
import Party from '../schemas/party.schema.js';
import Transaction from '../schemas/transaction.schema.js';
import StockMovement from '../schemas/stockMovement.schema.js';
import { AppError, wrap } from '../middlewares/error.middleware.js';
import { escapeRegex, money, number, objectId, text } from '../lib/validate.js';
import { fileMeta, removeUpload } from '../middlewares/upload.middleware.js';
import { nextCode } from '../services/code.service.js';

async function fields(body) {
    const name = text(body.name, 160);
    if (!name) throw new AppError('Product name is required.');

    const category = objectId(body.category || null, 'Category');
    if (category && !(await Category.exists({ _id: category }))) throw new AppError('That category no longer exists.');
    const supplier = objectId(body.supplier || null, 'Supplier');
    if (supplier && !(await Party.exists({ _id: supplier, type: 'supplier' }))) throw new AppError('That supplier no longer exists.');

    return {
        name,
        category,
        supplier,
        purchasePrice: money(number(body.purchasePrice, 'Purchase price')),
        sellingPrice: money(number(body.sellingPrice, 'Selling price')),
        minimumStock: number(body.minimumStock, 'Minimum stock', { integer: true, fallback: 5 }),
        unit: text(body.unit, 30) || 'Piece',
        description: text(body.description, 2000),
    };
}

export const listProducts = wrap(async (req, res) => {
    const filter = {};
    if (req.query.q) {
        const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 80)), 'i');
        filter.$or = [{ name: rx }, { code: rx }];
    }
    if (req.query.category) filter.category = req.query.category === 'none' ? null : objectId(req.query.category, 'Category');
    if (req.query.stock === 'low') filter.$expr = { $and: [{ $lte: ['$quantity', '$minimumStock'] }, { $gt: ['$quantity', 0] }] };
    if (req.query.stock === 'out') filter.quantity = 0;

    const products = await Product.find(filter).populate('category', 'name').populate('supplier', 'name code').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: products });
});

export const getProduct = wrap(async (req, res) => {
    const product = await Product.findById(objectId(req.params.id, 'Product')).populate('category', 'name').populate('supplier', 'name code phone').lean();
    if (!product) throw new AppError('Product not found.', { status: 404 });
    const movements = await StockMovement.find({ product: product._id }).sort({ date: -1, _id: -1 }).limit(50).lean();
    res.json({ success: true, data: { product, movements } });
});

export const createProduct = wrap(async (req, res) => {
    try {
        const data = await fields(req.body);
        const opening = number(req.body.quantity, 'Opening stock', { integer: true });
        const code = text(req.body.code, 40) || (await nextCode('product'));

        const product = await Product.create({ ...data, code, quantity: opening, file: fileMeta('products', req.file) });
        if (opening > 0) {
            await StockMovement.create({ product: product._id, type: 'OPENING', quantity: opening, balanceAfter: opening, notes: 'Opening stock', createdBy: req.user.userId });
        }
        res.status(201).json({ success: true, message: 'Product added.', data: product });
    } catch (error) {
        if (req.file) await removeUpload(fileMeta('products', req.file).url);
        throw error;
    }
});

/** Stock is deliberately not editable here — see adjustStock. */
export const updateProduct = wrap(async (req, res) => {
    try {
        const product = await Product.findById(objectId(req.params.id, 'Product'));
        if (!product) throw new AppError('Product not found.', { status: 404 });

        Object.assign(product, await fields(req.body));
        const code = text(req.body.code, 40);
        if (code) product.code = code;

        const previousFile = product.file?.url;
        if (req.file) product.file = fileMeta('products', req.file);
        else if (req.body.removeFile === 'true') product.file = { url: '', name: '', mimeType: '' };

        await product.save();
        if ((req.file || req.body.removeFile === 'true') && previousFile) await removeUpload(previousFile);
        res.json({ success: true, message: 'Product saved.', data: product });
    } catch (error) {
        if (req.file) await removeUpload(fileMeta('products', req.file).url);
        throw error;
    }
});

export const adjustStock = wrap(async (req, res) => {
    const change = number(req.body.change, 'Change', { min: -1e9, integer: true });
    if (change === 0) throw new AppError('Enter how many units to add or remove.');
    const reason = text(req.body.reason, 300);
    if (!reason) throw new AppError('Say why the stock is changing, e.g. "Damaged" or "Stock count".');

    const filter = { _id: objectId(req.params.id, 'Product') };
    if (change < 0) filter.quantity = { $gte: -change };
    const product = await Product.findOneAndUpdate(filter, { $inc: { quantity: change } }, { returnDocument: 'after' });
    if (!product) {
        const exists = await Product.findById(req.params.id).select('quantity unit');
        if (!exists) throw new AppError('Product not found.', { status: 404 });
        throw new AppError(`Only ${exists.quantity} ${exists.unit} in stock — cannot remove ${-change}.`);
    }
    await StockMovement.create({ product: product._id, type: 'ADJUST', quantity: change, balanceAfter: product.quantity, notes: reason, createdBy: req.user.userId });
    res.json({ success: true, message: 'Stock updated.', data: product });
});

export const deleteProduct = wrap(async (req, res) => {
    const id = objectId(req.params.id, 'Product');
    if (await Transaction.exists({ 'items.product': id })) {
        throw new AppError('This product appears on invoices, so it cannot be deleted. Keep it for your records.', { status: 409, code: 'in_use' });
    }
    const product = await Product.findByIdAndDelete(id);
    if (!product) throw new AppError('Product not found.', { status: 404 });
    await StockMovement.deleteMany({ product: id });
    await removeUpload(product.file?.url);
    res.json({ success: true, message: 'Product deleted.' });
});
