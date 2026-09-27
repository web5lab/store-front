import express from 'express';
import { listProducts, getProduct, createProduct, updateProduct, adjustStock, deleteProduct } from '../controllers/product.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { uploadTo, verifyUpload } from '../middlewares/upload.middleware.js';

const router = express.Router();
const upload = uploadTo('products');

router.get('/', protect, listProducts);
router.get('/:id', protect, getProduct);
router.post('/', protect, upload.single('file'), verifyUpload, createProduct);
router.put('/:id', protect, upload.single('file'), verifyUpload, updateProduct);
router.post('/:id/adjust', protect, adjustStock);
router.delete('/:id', protect, deleteProduct);

export default router;
