// controllers/payment.controller.ts
import { Response, Request } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types/index.js';
import { User } from '../models/user.model.js';
import VirtualAccount from '../models/VirtualAccount.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { ApiResponse } from '../utils/response.js';

// Import services
import { MonnifyService } from '../services/monnify.service.js';
import { PaystackService } from '../services/paystack.service.js';

// Initialize services
const monnifyService = new MonnifyService();
const paystackService = new PaystackService();

// Mock services for now
const mockServices = {
  payrant: {
    initializePayment: async () => ({
      checkoutUrl: 'https://payrant.com/checkout/mock',
      reference: 'MOCK' + Date.now()
    })
  }
};

export class PaymentController {
  /**
   * Deactivate user's virtual account
   */
  static async deactivateVirtualAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ApiResponse.error(res, 'User not authenticated', 401);
      }

      // Find user and update virtual account status
      const user = await User.findById(userId);

      if (!user || !user.virtual_account) {
        return ApiResponse.error(res, 'No active virtual account found', 404);
      }

      user.virtual_account.status = 'inactive';
      await user.save();

      return ApiResponse.success(res, null, 'Virtual account deactivated successfully');
    } catch (error) {
      console.error('Error deactivating virtual account:', error);
      return ApiResponse.error(res, 'Failed to deactivate virtual account');
    }
  }

  /**
   * Get list of supported banks from Paystack
   */
  static async getBanks(_req: Request, res: Response) {
    try {
      const banks = await paystackService.listBanks();
      return ApiResponse.success(res, 'Banks retrieved successfully', banks);
    } catch (error: any) {
      console.error('Error fetching banks:', error);
      return ApiResponse.error(res, error.message || 'Failed to fetch banks', 500);
    }
  }

  /**
   * Initiate payment
   */
  static async initiatePayment(req: AuthRequest, res: Response) {
    try {
      const { amount, gateway = 'paystack', email } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return ApiResponse.error(res, 'User not authenticated', 401);
      }

      if (!amount || amount <= 0) {
        return ApiResponse.error(res, 'Invalid amount', 400);
      }

      if (amount < 100) {
        return ApiResponse.error(res, 'Minimum amount is NGN 100', 400);
      }

      if (amount > 1000000) {
        return ApiResponse.error(res, 'Maximum amount is NGN 1,000,000', 400);
      }

      // Get user and wallet
      const user = await User.findById(userId);
      if (!user) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      const wallet = await Wallet.findOne({ user_id: userId });
      if (!wallet) {
        return ApiResponse.error(res, 'Wallet not found', 404);
      }

      // Route to the appropriate payment gateway
      switch (gateway) {
        case 'paystack':
          if (!email) {
            return ApiResponse.error(res, 'Email is required for Paystack payments', 400);
          }
          return await PaymentController.initiatePaystackPayment(res, user, wallet, amount, email);

        case 'monnify':
          return await PaymentController.initiateMonnifyPayment(res, user, wallet, amount);

        case 'payrant':
          return await PaymentController.initiatePayrantPayment(res, user, wallet, amount);

        default:
          return ApiResponse.error(res, 'Invalid payment gateway', 400);
      }
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      return ApiResponse.error(res, error.message || 'Failed to initialize payment', 500);
    }
  }

  /**
   * Initiate Paystack payment
   */
  private static async initiatePaystackPayment(res: Response, user: any, wallet: any, amount: number, email: string) {
    try {
      const reference = `PAYSTACK_${Date.now()}_${user._id}`;

      // Initialize payment with Paystack
      const paymentData = await paystackService.initializeTransaction(
        email,
        amount * 100, // Convert to kobo
        reference
      );

      // Create a pending transaction
      await Transaction.create({
        user_id: user._id,
        wallet_id: wallet._id,
        type: 'credit',
        amount,
        status: 'pending',
        reference_number: paymentData.data.reference || reference,
        gateway: 'paystack',
        description: 'Wallet funding via Paystack',
        metadata: {
          authorization_url: paymentData.data.authorization_url,
          access_code: paymentData.data.access_code,
          payment_method: 'card'
        }
      });

      return ApiResponse.success(
        res,
        {
          authorization_url: paymentData.data.authorization_url,
          access_code: paymentData.data.access_code,
          reference: paymentData.data.reference || reference,
          amount,
          email
        },
        'Payment initialized successfully'
      );
    } catch (error: any) {
      console.error('Paystack payment error:', error);
      throw new Error(error.message || 'Failed to initialize Paystack payment');
    }
  }

  /**
   * Initiate Payrant payment
   */
  private static async initiatePayrantPayment(res: Response, user: any, wallet: any, amount: number) {
    try {
      const reference = `PAYRANT_${Date.now()}_${user._id}`;

      // Use mock service for now
      const paymentData = await mockServices.payrant.initializePayment();

      // Create a pending transaction
      await Transaction.create({
        user_id: user._id,
        wallet_id: wallet._id,
        type: 'credit',
        amount,
        status: 'pending',
        reference_number: paymentData.reference || reference,
        gateway: 'payrant',
        description: 'Wallet funding via Payrant',
        metadata: {
          checkoutUrl: paymentData.checkoutUrl,
          payment_method: 'virtual_account'
        }
      });

      return ApiResponse.success(
        res,
        {
          checkout_url: paymentData.checkoutUrl,
          reference: paymentData.reference || reference,
          amount,
          gateway: 'payrant'
        },
        'Payment initialized successfully'
      );
    } catch (error: any) {
      console.error('Payrant payment error:', error);
      throw new Error(error.message || 'Failed to initialize Payrant payment');
    }
  }

  /**
   * Initiate Monnify payment
   */
  private static async initiateMonnifyPayment(res: Response, user: any, wallet: any, amount: number) {
    try {
      const reference = `MONNIFY_${Date.now()}_${user._id}`;

      // Use mock service for now
      const paymentData = {
        checkoutUrl: `https://monnify.com/checkout/${reference}`,
        reference: reference
      };

      // Create a pending transaction
      await Transaction.create({
        user_id: user._id,
        wallet_id: wallet._id,
        type: 'credit',
        amount,
        status: 'pending',
        reference_number: paymentData.reference,
        gateway: 'monnify',
        description: 'Wallet funding via Monnify',
        metadata: {
          checkoutUrl: paymentData.checkoutUrl,
          payment_method: 'bank_transfer'
        }
      });

      return ApiResponse.success(
        res,
        {
          checkout_url: paymentData.checkoutUrl,
          reference: paymentData.reference,
          amount,
          gateway: 'monnify'
        },
        'Payment initialized successfully'
      );
    } catch (error: any) {
      console.error('Monnify payment error:', error);
      throw new Error(error.message || 'Failed to initialize Monnify payment');
    }
  }

  /**
   * Verify payment status for any supported gateway
   */
  static async verifyPayment(req: Request, res: Response) {
    try {
      const { reference } = req.params;

      if (!reference) {
        return ApiResponse.error(res, 'Payment reference is required', 400);
      }

      // Find the transaction by reference
      const transaction = await Transaction.findOne({ reference_number: reference });

      if (!transaction) {
        return ApiResponse.error(res, 'Transaction not found', 404);
      }

      // Verify payment based on the gateway used
      let verificationResult;
      switch (transaction.gateway) {
        case 'paystack':
          verificationResult = await paystackService.verifyTransaction(reference);
          break;

        case 'monnify':
          // For Monnify, we'll just return the transaction status
          return ApiResponse.success(res, 'Payment status retrieved', {
            status: transaction.status,
            reference: transaction.reference_number,
            amount: transaction.amount,
            gateway: transaction.gateway
          });

        case 'payrant':
          // For Payrant, we'll just return the transaction status
          return ApiResponse.success(res, 'Payment status retrieved', {
            status: transaction.status,
            reference: transaction.reference_number,
            amount: transaction.amount,
            gateway: transaction.gateway
          });

        default:
          return ApiResponse.error(res, 'Unsupported payment gateway', 400);
      }

      // Update transaction status if it has changed
      if (verificationResult.status && verificationResult.status !== transaction.status) {
        transaction.status = verificationResult.status;

        // If payment is successful, update the wallet balance
        if (verificationResult.status === true && transaction.type === 'credit') {
          const wallet = await Wallet.findById(transaction.wallet_id);
          if (wallet) {
            wallet.balance = (wallet.balance || 0) + transaction.amount;
            await wallet.save();
          }
        }

        await transaction.save();
      }

      // Extract all properties except status from verificationResult
      const { status: _, ...restVerification } = verificationResult;

      return ApiResponse.success(
        res,
        {
          status: transaction.status,
          reference: transaction.reference_number,
          amount: transaction.amount,
          gateway: transaction.gateway,
          ...restVerification
        },
        'Payment verification successful'
      );

    } catch (error: any) {
      console.error('Payment verification error:', error);
      return ApiResponse.error(res, error.message || 'Failed to verify payment', 500);
    }
  }

  /**
   * Create Payrant virtual account for user
   */
  static async createVirtualAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ApiResponse.error(res, 'User not authenticated', 401);
      }

      // Get user details
      const user = await User.findById(userId);
      if (!user) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      // Check if user already has a virtual account
      if (user.virtual_account?.account_number) {
        return ApiResponse.success(
          res,
          {
            ...user.virtual_account,
            exists: true
          },
          'Virtual account already exists'
        );
      }

      // Use phone number as NIN (Payrant requires a document number)
      let documentNumber = user.phone_number;
      if (!documentNumber) {
        return ApiResponse.error(res, 'Phone number is required to create virtual account', 400);
      }

      // Normalize phone number: if it's 10 digits, prepend '0' to make it 11 digits
      documentNumber = documentNumber.replace(/\D/g, '');
      if (documentNumber.length === 10) {
        documentNumber = '0' + documentNumber;
      } else if (documentNumber.length !== 11) {
        return ApiResponse.error(res, 'Phone number must be 10 or 11 digits', 400);
      }

      // Import Payrant service
      const { PayrantService } = await import('../services/payrant.service.js');
      const payrantService = new PayrantService();

      // Generate account reference
      const accountReference = `VTU-${userId}-${Date.now().toString(36)}`;

      // Create virtual account with Payrant
      const virtualAccount = await payrantService.createVirtualAccount(
        {
          documentType: 'nin',
          documentNumber: documentNumber,
          virtualAccountName: `${user.first_name} ${user.last_name}`.substring(0, 50),
          customerName: `${user.first_name} ${user.last_name}`.substring(0, 100),
          email: user.email,
          accountReference,
        },
        userId.toString()
      );

      // Fetch the saved account
      const savedAccount = await VirtualAccount.findOne({
        user: userId,
        provider: 'payrant'
      }).sort({ createdAt: -1 });

      if (!savedAccount) {
        return ApiResponse.error(res, 'Virtual account created but failed to save details', 500);
      }

      return ApiResponse.success(res, savedAccount.toObject(), 'Virtual account created successfully');
    } catch (error: any) {
      console.error('Create virtual account error:', error);
      return ApiResponse.error(res, error.message || 'Failed to create virtual account', 500);
    }
  }

  /**
   * Get user's virtual account
   */
  static async getVirtualAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ApiResponse.error(res, 'User not authenticated', 401);
      }

      const user = await User.findById(userId);
      if (!user) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      if (!user.virtual_account || !user.virtual_account.account_number) {
        return ApiResponse.success(res, null, 'No virtual account found');
      }

      return ApiResponse.success(res, user.virtual_account, 'Virtual account retrieved successfully');
    } catch (error: any) {
      console.error('Get virtual account error:', error);
      return ApiResponse.error(res, error.message || 'Failed to get virtual account', 500);
    }
  }

  /**
   * Handle Monnify webhook for payment confirmation
   */
  static async handleMonnifyWebhook(req: Request, res: Response) {
    try {
      const event = req.body;
      const signature = req.headers['monnify-signature'] as string;
      const isVerified = monnifyService.validateWebhookSignature(event, signature);

      if (!isVerified) {
        return res.status(400).json({ status: false, message: 'Invalid webhook signature' });
      }

      if (event.eventType === 'SUCCESSFUL_TRANSACTION') {
        const { paymentReference, amount, customer } = event.eventData;

        const wallet = await Wallet.findOne({ user_id: customer.email });
        if (wallet) {
          wallet.balance += amount;
          await wallet.save();

          await Transaction.create({
            user_id: wallet.user_id,
            amount,
            type: 'credit',
            status: 'completed',
            reference: paymentReference,
            description: 'Wallet funding via Monnify',
            metadata: { gateway: 'monnify' }
          });
        }
      }

      return res.status(200).json({ status: true });
    } catch (error) {
      console.error('Monnify webhook error:', error);
      return res.status(500).json({ status: false, message: 'Webhook processing failed' });
    }
  }

  /**
   * Handle Payrant webhook for virtual account deposits
   */
  static async handlePayrantWebhook(req: Request, res: Response) {
    try {
      const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);
      const webhookData = req.body instanceof Buffer ? JSON.parse(rawBody) : req.body;

      const signature = req.headers['x-payrant-signature'] as string;
      const eventType = req.headers['x-payrant-event'] as string;

      console.log('🔔 Payrant webhook received:');
      console.log('Event Type:', eventType);
      console.log('Body:', JSON.stringify(webhookData, null, 2));

      const { PayrantService } = await import('../services/payrant.service.js');
      const payrantService = new PayrantService();

      if (signature) {
        const isValid = payrantService.verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
          console.error('❌ Invalid Payrant webhook signature');
          return res.status(400).json({ status: false, message: 'Invalid signature' });
        }
        console.log('✅ Webhook signature verified');
      }

      if (webhookData.status !== 'success') {
        return res.status(200).json({ status: true, message: 'Webhook received but status not success' });
      }

      const transaction = webhookData.transaction;
      if (!transaction) {
        return res.status(400).json({ status: false, message: 'Missing transaction data' });
      }

      const accountReference = transaction.metadata?.account_reference;
      const amount = transaction.net_amount || transaction.amount;
      const reference = transaction.reference;

      if (!accountReference || !amount || !reference) {
        return res.status(400).json({ status: false, message: 'Missing required fields' });
      }

      const virtualAccount = await VirtualAccount.findOne({ reference: accountReference });
      if (!virtualAccount) {
        return res.status(404).json({ status: false, message: 'Virtual account not found' });
      }

      const user = await User.findById(virtualAccount.user);
      if (!user) {
        return res.status(404).json({ status: false, message: 'User not found' });
      }

      let wallet = await Wallet.findOne({ user_id: user._id });
      if (!wallet) {
        wallet = await Wallet.create({
          user_id: user._id,
          balance: 0,
        });
      }

      const existingTransaction = await Transaction.findOne({ reference_number: reference });
      if (existingTransaction) {
        return res.status(200).json({ status: true, message: 'Already processed' });
      }

      const oldBalance = wallet.balance;
      wallet.balance += amount;
      await wallet.save();

      await Transaction.create({
        user_id: user._id,
        amount: amount,
        type: 'deposit',
        status: 'completed',
        reference_number: reference,
        description: `Virtual account deposit`,
        gateway: 'payrant',
        metadata: {
          fee: transaction.fee || 0,
          gross_amount: transaction.amount,
          net_amount: transaction.net_amount,
          timestamp: transaction.timestamp,
          webhook_event: eventType,
        },
      });

      console.log(`✅ Wallet credited: ${user.email}, Amount: ₦${amount}, New Balance: ₦${wallet.balance}`);

      return res.status(200).json({ status: true, message: 'Webhook processed successfully' });
    } catch (error: any) {
      console.error('❌ Payrant webhook error:', error.message);
      return res.status(500).json({ status: false, message: 'Webhook processing failed', error: error.message });
    }
  }
}
