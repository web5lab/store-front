import Setting from '../schemas/setting.schema.js';
import { AppError, wrap } from '../middlewares/error.middleware.js';
import { text } from '../lib/validate.js';

export const getShop = wrap(async (req, res) => {
    const shop = (await Setting.findById('shop').lean()) || new Setting().toObject();
    res.json({ success: true, data: shop });
});

export const updateShop = wrap(async (req, res) => {
    const gstNumber = text(req.body.gstNumber, 20).toUpperCase();
    if (gstNumber && !/^[0-9A-Z]{15}$/.test(gstNumber)) throw new AppError('GST number should be 15 letters and digits.');
    const shop = await Setting.findByIdAndUpdate(
        'shop',
        {
            shopName: text(req.body.shopName, 160),
            address: text(req.body.address, 500),
            phone: text(req.body.phone, 40),
            email: text(req.body.email, 160),
            gstNumber,
            invoiceFooter: text(req.body.invoiceFooter, 300),
        },
        { upsert: true, returnDocument: 'after', runValidators: true }
    );
    res.json({ success: true, message: 'Shop details saved.', data: shop });
});
