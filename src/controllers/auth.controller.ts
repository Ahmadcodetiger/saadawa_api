
// controllers/auth.controller.ts
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/bootstrap.js';
import { User } from '../models/index.js';
import { OTPService } from '../services/otp.service.js';
import { WalletService } from '../services/wallet.service.js';
import { ApiResponse } from '../utils/response.js';
import { userValidation } from '../utils/validators.js';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { error } = userValidation.register.validate(req.body);
      if (error) {
        return ApiResponse.error(res, error.details[0].message, 400);
      }

      const { email, phone_number, password, first_name, last_name, referral_code, pin } = req.body;

      const existingUser = await User.findOne({ $or: [{ email }, { phone_number }] });
      if (existingUser) {
        return ApiResponse.error(res, 'User already exists', 400);
      }

      const password_hash = await bcrypt.hash(password, 10);
      const user_referral_code = Math.random().toString(36).substring(2, 10).toUpperCase();

      let referred_by;
      if (referral_code) {
        const referrer = await User.findOne({ referral_code });
        referred_by = referrer?._id;
      }

      const user = await User.create({
        email,
        phone_number,
        password_hash,
        first_name,
        last_name,
        referral_code: user_referral_code,
        referred_by,
        country: 'Nigeria',
        kyc_status: 'pending',
        status: 'active',
        transaction_pin: pin ? await bcrypt.hash(String(pin), 10) : undefined
      });

      await WalletService.createWallet(user._id);
      await OTPService.createOTP(phone_number, email, user._id.toString());

      const token = jwt.sign({ id: user._id }, config.jwtSecret as string, { expiresIn: config.jwtExpiry } as SignOptions);

      return ApiResponse.success(res, { user, token }, 'Registration successful', 201);
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 500);
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { error } = userValidation.login.validate(req.body);
      if (error) {
        return ApiResponse.error(res, error.details[0].message, 400);
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return ApiResponse.error(res, 'Invalid credentials', 401);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return ApiResponse.error(res, 'Invalid credentials', 401);
      }

      if (user.status !== 'active') {
        return ApiResponse.error(res, 'Account is inactive', 403);
      }

      const token = jwt.sign({ id: user._id }, config.jwtSecret as string, { expiresIn: config.jwtExpiry } as SignOptions);

      return ApiResponse.success(res, { user, token }, 'Login successful');
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 500);
    }
  }

  static async verifyOTP(req: Request, res: Response) {
    try {
      const { phone_number, otp_code } = req.body;

      const isValid = await OTPService.verifyOTP(phone_number, otp_code);
      if (!isValid) {
        return ApiResponse.error(res, 'Invalid or expired OTP', 400);
      }

      return ApiResponse.success(res, null, 'OTP verified successfully');
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 500);
    }
  }

  static async resendOTP(req: Request, res: Response) {
    try {
      const { phone_number, email } = req.body;

      if (!phone_number) {
        return ApiResponse.error(res, 'Phone number is required', 400);
      }

      // Try to find the user to get their email if not provided
      let userEmail = email;
      if (!userEmail) {
        const user = await User.findOne({ phone_number });
        if (user) {
          userEmail = user.email;
        }
      }

      const otp_code = await OTPService.createOTP(phone_number, userEmail);

      return ApiResponse.success(res, null, 'OTP sent successfully');
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 500);
    }
  }
}