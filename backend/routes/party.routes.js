import express from 'express';
import { listParties, getParty, createParty, updateParty, deleteParty, getLedger, addLedgerEntry } from '../controllers/party.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { uploadTo, verifyUpload } from '../middlewares/upload.middleware.js';

/** One router, built per book: partyRouter('customer') and partyRouter('supplier'). */
export default function partyRouter(type) {
    const router = express.Router();
    const upload = uploadTo(`${type}s`, { imagesOnly: true });

    router.use((req, res, next) => {
        req.partyType = type;
        next();
    });

    router.get('/', protect, listParties);
    router.get('/:id', protect, getParty);
    router.post('/', protect, upload.single('photo'), verifyUpload, createParty);
    router.put('/:id', protect, upload.single('photo'), verifyUpload, updateParty);
    router.delete('/:id', protect, deleteParty);
    router.get('/:id/ledger', protect, getLedger);
    router.post('/:id/ledger', protect, addLedgerEntry);

    return router;
}
