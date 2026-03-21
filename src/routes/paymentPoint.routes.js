import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import * as paymentPointController from '../controllers/paymentPoint.controller.js';

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

// Public webhook endpoint
router.post(
  '/webhook',
  paymentPointController.paymentWebhook
);

export default router;
