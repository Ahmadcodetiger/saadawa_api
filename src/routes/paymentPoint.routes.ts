import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';  // Add .js extension
import * as paymentPointController from '../controllers/paymentPoint.controller.js';  // Add .js extension
const router = express.Router();

// Protected routes (require authentication)
router.post(
  '/create-virtual-account',
  authMiddleware,
  paymentPointController.createVirtualAccount
);

router.get(
  '/virtual-account',
  authMiddleware,
  paymentPointController.getVirtualAccount
);

// Public webhook endpoint (no auth required)
router.post(
  '/webhook',
  paymentPointController.paymentWebhook
);

// Optional: Test webhook endpoint
router.get('/test-webhook', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is active',
    endpoints: {
      webhook: 'POST /api/payment-point/webhook',
      createVirtualAccount: 'POST /api/payment-point/create-virtual-account',
      getVirtualAccount: 'GET /api/payment-point/virtual-account'
    }
  });
});

export default router;
