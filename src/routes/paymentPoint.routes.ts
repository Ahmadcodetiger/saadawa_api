import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import * as paymentPointController from '../controllers/paymentPoint.controller.js';

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

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'PaymentPoint routes are working',
  });
});

export default router;
