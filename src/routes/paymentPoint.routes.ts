import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';  // Add .js
import * as paymentPointController from '../controllers/paymentPoint.controller.js';  // Add .js

const router = express.Router();

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

router.post(
  '/webhook',
  paymentPointController.paymentWebhook
);

export default router;
