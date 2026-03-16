import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// Wallet routes (protected)
router.get('/', authMiddleware, WalletController.getWallet);
router.post('/fund', authMiddleware, WalletController.fundWallet);
router.get('/transactions', authMiddleware, WalletController.getWalletTransactions);
router.put('/adjust', authMiddleware, WalletController.adjustBalance);
router.post('/transfer', authMiddleware, WalletController.transferFunds);

export default router;
