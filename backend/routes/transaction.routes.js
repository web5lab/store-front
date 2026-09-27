import express from 'express';
import { listTransactions, getTransaction, createTransactionHandler, addPayment } from '../controllers/transaction.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { uploadTo, verifyUpload } from '../middlewares/upload.middleware.js';

/** One router, built per kind: transactionRouter('sale') and transactionRouter('purchase'). */
export default function transactionRouter(kind) {
    const router = express.Router();
    const upload = uploadTo(kind === 'sale' ? 'sales' : 'purchases');

    router.use((req, res, next) => {
        req.kind = kind;
        next();
    });

    router.get('/', protect, listTransactions);
    router.get('/:id', protect, getTransaction);
    router.post('/', protect, upload.single('attachment'), verifyUpload, createTransactionHandler);
    router.post('/:id/payments', protect, addPayment);

    return router;
}
