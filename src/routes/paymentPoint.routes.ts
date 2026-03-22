import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { 
  createVirtualAccount, 
  getVirtualAccount, 
  paymentWebhook 
} from '../controllers/paymentPoint.controller.js';

const router = express.Router();

// Protected routes (require authentication)
router.post(
  '/create-virtual-account',
  authMiddleware,
  createVirtualAccount
);

router.get(
  '/virtual-account',
  authMiddleware,
  getVirtualAccount
);

// Public webhook endpoint (no auth required)
router.post(
  '/webhook',
  paymentWebhook
);

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'PaymentPoint routes are working',
    endpoints: {
      createVirtualAccount: 'POST /api/payment-point/create-virtual-account',
      getVirtualAccount: 'GET /api/payment-point/virtual-account',
      webhook: 'POST /api/payment-point/webhook'
    }
  });
});

export default router;
