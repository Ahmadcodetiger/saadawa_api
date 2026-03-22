import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as paymentController from '../controllers/payment.controller.js';

const router = express.Router();

// Webhook routes (public, no auth)
router.post('/webhook', paymentController.paymentWebhook);
router.post('/payrant/webhook', paymentController.payrantWebhook);

// Protected routes
router.post('/initiate', authMiddleware, paymentController.initiatePayment);
router.get('/verify/:reference', authMiddleware, paymentController.verifyPayment);
router.get('/history', authMiddleware, paymentController.getPaymentHistory);
router.get('/banks', authMiddleware, paymentController.getBanks);

export default router;
