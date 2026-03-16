import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';

const router = Router();

// Auth routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/resend-otp', AuthController.resendOTP);

export default router;
