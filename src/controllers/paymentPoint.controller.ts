import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types/index.js';
import { User } from '../models/user.model.js';
import VirtualAccount from '../models/VirtualAccount.js';
import paymentPointService from '../services/paymentPoint.service.js';

export const createVirtualAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // ... rest of the code
  } catch (error) {
    console.error('Create virtual account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getVirtualAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }
    
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

export const paymentWebhook = async (req: Request, res: Response) => {
  try {
    console.log('📡 PaymentPoint webhook received:', new Date().toISOString());
    console.log('📡 Body:', JSON.stringify(req.body, null, 2));

    const payload = req.body;
    
    let accountNumber: string;
    let amount: number;
    let reference: string;
    
    if (payload.data) {
      accountNumber = payload.data.accountNumber || payload.data.account_number;
      amount = payload.data.amount;
      reference = payload.data.reference || payload.data.transactionReference;
    } else {
      accountNumber = payload.accountNumber || payload.account_number;
      amount = payload.amount;
      reference = payload.reference || payload.transactionReference;
    }
    
    if (amount > 0 && accountNumber) {
      const virtualAccount = await VirtualAccount.findOne({ 
        accountNumber: accountNumber 
      });
      
      if (!virtualAccount) {
        console.log(`Virtual account not found for: ${accountNumber}`);
        return res.status(200).json({ success: true });
      }
      
      const user = await User.findById(virtualAccount.user);
      if (!user) {
        console.log(`User not found for account: ${accountNumber}`);
        return res.status(200).json({ success: true });
      }
      
      const Wallet = mongoose.model('Wallet');
      let wallet = await Wallet.findOne({ user_id: user._id });
      if (!wallet) {
        wallet = new Wallet({
          user_id: user._id,
          balance: 0,
          currency: 'NGN'
        });
      }
      
      wallet.balance += amount;
      await wallet.save();
      
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
      });
      await transaction.save();
      
      console.log(`✅ Wallet credited: ${user.email} - ₦${amount}`);
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ success: true });
  }
};
