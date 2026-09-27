import Transaction from '../schemas/transaction.schema.js';
import Product from '../schemas/product.schema.js';
import Party from '../schemas/party.schema.js';
import Category from '../schemas/category.schema.js';
import LedgerEntry from '../schemas/ledgerEntry.schema.js';
import { money } from '../lib/validate.js';

const TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';

/** YYYY-MM-DD in the shop's own timezone, so "today" means the shop's today. */
const dayKey = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

export async function overview() {
    const now = new Date();
    const since = new Date(now.getTime() - 62 * 24 * 60 * 60 * 1000);

    const [daily, counts, lowStock, lowStockCount, stockValue, balances, recent, topProducts] = await Promise.all([
        Transaction.aggregate([
            { $match: { date: { $gte: since } } },
            {
                $group: {
                    _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: TZ } }, kind: '$kind' },
                    total: { $sum: '$total' },
                    count: { $sum: 1 },
                },
            },
        ]),
        Promise.all([
            Product.countDocuments(),
            Category.countDocuments(),
            Party.countDocuments({ type: 'customer' }),
            Party.countDocuments({ type: 'supplier' }),
        ]),
        Product.find({ $expr: { $lte: ['$quantity', '$minimumStock'] } })
            .select('code name quantity minimumStock unit')
            .sort({ quantity: 1 })
            .limit(8)
            .lean(),
        Product.countDocuments({ $expr: { $lte: ['$quantity', '$minimumStock'] } }),
        Product.aggregate([{ $group: { _id: null, cost: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } }, units: { $sum: '$quantity' } } }]),
        LedgerEntry.aggregate([
            {
                $group: {
                    _id: '$partyType',
                    debit: { $sum: { $cond: [{ $eq: ['$entryType', 'debit'] }, '$amount', 0] } },
                    credit: { $sum: { $cond: [{ $eq: ['$entryType', 'credit'] }, '$amount', 0] } },
                },
            },
        ]),
        Transaction.find().sort({ date: -1, _id: -1 }).limit(7).populate('party', 'name code').select('kind invoiceNumber date total balanceDue paymentStatus party').lean(),
        Transaction.aggregate([
            { $match: { kind: 'sale', date: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } },
            { $unwind: '$items' },
            { $group: { _id: '$items.product', name: { $first: '$items.name' }, code: { $first: '$items.code' }, quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.total' } } },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
        ]),
    ]);

    /* 30 zero-filled days, oldest first, for the chart. */
    const byDay = new Map();
    for (const row of daily) {
        const entry = byDay.get(row._id.day) || { sale: 0, purchase: 0, saleCount: 0, purchaseCount: 0 };
        entry[row._id.kind] = money(row.total);
        entry[`${row._id.kind}Count`] = row.count;
        byDay.set(row._id.day, entry);
    }
    const series = [];
    for (let i = 29; i >= 0; i--) {
        const key = dayKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
        const e = byDay.get(key) || {};
        series.push({ date: key, sales: e.sale || 0, purchases: e.purchase || 0 });
    }

    const todayKey = dayKey(now);
    const monthKey = todayKey.slice(0, 7);
    const today = byDay.get(todayKey) || {};
    const month = [...byDay.entries()]
        .filter(([k]) => k.startsWith(monthKey))
        .reduce((acc, [, e]) => ({ sales: acc.sales + (e.sale || 0), purchases: acc.purchases + (e.purchase || 0), invoices: acc.invoices + (e.saleCount || 0) }), {
            sales: 0,
            purchases: 0,
            invoices: 0,
        });

    const side = (type) => balances.find((b) => b._id === type) || { debit: 0, credit: 0 };
    const customers = side('customer');
    const suppliers = side('supplier');

    return {
        counts: { products: counts[0], categories: counts[1], customers: counts[2], suppliers: counts[3] },
        today: { sales: today.sale || 0, salesCount: today.saleCount || 0, purchases: today.purchase || 0, purchasesCount: today.purchaseCount || 0 },
        month: { sales: money(month.sales), purchases: money(month.purchases), invoices: month.invoices },
        receivable: money(customers.debit - customers.credit),
        payable: money(suppliers.credit - suppliers.debit),
        stock: { value: money(stockValue[0]?.cost), units: stockValue[0]?.units || 0, lowCount: lowStockCount, low: lowStock },
        series,
        recent,
        topProducts,
    };
}
