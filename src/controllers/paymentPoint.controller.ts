import { Request, Response } from 'express';
import { User } from '../models/User.js';
import VirtualAccount from '../models/VirtualAccount.js';
import paymentPointService from '../services/paymentPoint.service.js';
import mongoose from 'mongoose';

// Create virtual account for user
export const createVirtualAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user already has a PaymentPoint virtual account
    const existingAccount = await VirtualAccount.findOne({
      user: userId,
      provider: 'paymentpoint'
    });

    if (existingAccount) {
      return res.status(200).json({
        success: true,
        message: 'Virtual account already exists',
        data: {
          accountNumber: existingAccount.accountNumber,
          accountName: existingAccount.accountName,
          bankName: existingAccount.bankName,
          reference: existingAccount.reference,
          provider: existingAccount.provider,
          status: existingAccount.status
        },
      });
    }

    // Create virtual account with PaymentPoint
    const result = await paymentPointService.createVirtualAccount({
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      phoneNumber: user.phone_number,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    // Get the first bank account from response
    const bankAccount = result.data.bankAccounts[0];
    
    // Save virtual account to database
    const virtualAccount = new VirtualAccount({
      user: userId,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      bankName: bankAccount.bankName,
      provider: 'paymentpoint',
      reference: result.data.customer.customer_id,
      status: 'active',
      metadata: {
        virtualAccountName: result.data.customer.customer_name,
        customerId: result.data.customer.customer_id,
        customerEmail: result.data.customer.customer_email,
        customerPhone: result.data.customer.customer_phone_number,
        businessName: result.data.business?.business_name,
        bankCode: bankAccount.bankCode,
        reservedAccountId: bankAccount.Reserved_Account_Id
      }
    });
    
    await virtualAccount.save();

    // Also update user's virtual_account field for backward compatibility
    user.virtual_account = {
      account_number: bankAccount.accountNumber,
      account_name: bankAccount.accountName,
      bank_name: bankAccount.bankName,
      account_reference: result.data.customer.customer_id,
      provider: 'paymentpoint',
      status: 'active'
    };
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Virtual account created successfully',
      data: {
        accountNumber: virtualAccount.accountNumber,
        accountName: virtualAccount.accountName,
        bankName: virtualAccount.bankName,
        reference: virtualAccount.reference,
        provider: virtualAccount.provider,
        status: virtualAccount.status
      },
    });
  } catch (error) {
    console.error('Create virtual account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get user's virtual account
export const getVirtualAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Find virtual account
    const virtualAccount = await VirtualAccount.findOne({
      user: userId,
      provider: 'paymentpoint'
    });

    if (!virtualAccount) {
      return res.status(404).json({
        success: false,
        message: 'Virtual account not found',
        data: { exists: false },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Virtual account retrieved',
      data: {
        accountNumber: virtualAccount.accountNumber,
        accountName: virtualAccount.accountName,
        bankName: virtualAccount.bankName,
        reference: virtualAccount.reference,
        provider: virtualAccount.provider,
        status: virtualAccount.status
      },
    });
  } catch (error) {
    console.error('Get virtual account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Webhook for PaymentPoint payment notifications
export const paymentWebhook = async (req: Request, res: Response) => {
  try {
    console.log('📡 PaymentPoint webhook received:', new Date().toISOString());
    console.log('📡 Body:', JSON.stringify(req.body, null, 2));

    const payload = req.body;
    
    // Parse payment details based on PaymentPoint structure
    let accountNumber: string;
    let amount: number;
    let reference: string;
    let status: string;
    
    if (payload.data) {
      accountNumber = payload.data.accountNumber || payload.data.account_number;
      amount = payload.data.amount;
      reference = payload.data.reference || payload.data.transactionReference;
      status = payload.data.status;
    } else {
      accountNumber = payload.accountNumber || payload.account_number;
      amount = payload.amount;
      reference = payload.reference || payload.transactionReference;
      status = payload.status;
    }
    
    // Process only successful payments
    const isSuccess = status === 'successful' || status === 'success' || payload.event === 'payment.success';
    
    if (isSuccess && amount > 0 && accountNumber) {
      // Find virtual account by account number
      const virtualAccount = await VirtualAccount.findOne({ 
        accountNumber: accountNumber 
      });
      
      if (!virtualAccount) {
        console.log(`Virtual account not found for account: ${accountNumber}`);
        return res.status(200).json({ success: true, message: 'Account not found' });
      }
      
      // Find user
      const user = await User.findById(virtualAccount.user);
      if (!user) {
        console.log(`User not found for account: ${accountNumber}`);
        return res.status(200).json({ success: true, message: 'User not found' });
      }
      
      // Find or create wallet
      const Wallet = mongoose.model('Wallet');
      let wallet = await Wallet.findOne({ user_id: user._id });
      if (!wallet) {
        wallet = new Wallet({
          user_id: user._id,
          balance: 0,
          currency: 'NGN'
        });
      }
      
      // Update wallet balance
      const previousBalance = wallet.balance;
      wallet.balance += amount;
      await wallet.save();
      
      // Create transaction record
      const Transaction = mongoose.model('Transaction');
      const transaction = new Transaction({
        user_id: user._id,
        wallet_id: wallet._id,
        type: 'wallet_topup',
        amount: amount,
        fee: 0,
        total_charged: amount,
        status: 'successful',
        reference_number: reference,
        description: 'Wallet funding via PaymentPoint',
        payment_method: 'virtual_account',
        destination_account: accountNumber,
        created_at: new Date(),
        updated_at: new Date()
      });
      await transaction.save();
      
      console.log(`✅ Wallet credited: ${user.email} - ₦${amount}`);
      console.log(`💰 Previous: ₦${previousBalance} → New: ₦${wallet.balance}`);
    }
    
    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ success: true, message: 'Webhook received' });
  }
};
