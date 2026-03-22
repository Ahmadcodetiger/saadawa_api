import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';  // Named import with curly braces
import * as paymentPointController from '../controllers/paymentPoint.controller.js';

const router = express.Router();

// Protected routes (require authentication)
router.post(
  '/create-virtual-account',
  authMiddleware,  // Use the named export
  paymentPointController.createVirtualAccount
);

router.get(
  '/virtual-account',
  authMiddleware,  // Use the named export
  paymentPointController.getVirtualAccount
);

// Public webhook endpoint (no auth required)
router.post(
  '/webhook',
  paymentPointController.paymentWebhook
);

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'PaymentPoint routes are working',
  });
});

export default router;
