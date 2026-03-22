import { Response, Request } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types/index.js';
import { User } from '../models/user.model.js';
import VirtualAccount from '../models/VirtualAccount.js';
import { Wallet } from '../models/wallet.model.js';
import { Transaction } from '../models/transaction.model.js';
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

    const existingAccount = await VirtualAccount.findOne({
      user: new mongoose.Types.ObjectId(userId),
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

    if (!result.data || !result.data.bankAccounts || !result.data.bankAccounts[0]) {
      return res.status(500).json({
        success: false,
        message: 'Invalid response from PaymentPoint',
      });
    }

    const bankAccount = result.data.bankAccounts[0];
    
    const virtualAccount = new VirtualAccount({
      user: new mongoose.Types.ObjectId(userId),
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      bankName: bankAccount.bankName,
      provider: 'paymentpoint',
      reference: result.data.customer?.customer_id || `REF_${Date.now()}`,
      status: 'active',
      metadata: {
        virtualAccountName: result.data.customer?.customer_name,
        virtualAccountNo: bankAccount.accountNumber,
        identityType: 'NIN',
        licenseNumber: result.data.customer?.customer_id
      }
    });
    
    await virtualAccount.save();

    user.virtual_account = {
      account_number: bankAccount.accountNumber,
      account_name: bankAccount.accountName,
      bank_name: bankAccount.bankName,
      account_reference: result.data.customer?.customer_id || `REF_${Date.now()}`,
      provider: 'paymentpoint',
      status: 'active'
    };
    await user.save();

    let wallet = await Wallet.findOne({ user_id: new mongoose.Types.ObjectId(userId) });
    if (!wallet) {
      wallet = new Wallet({
        user_id: new mongoose.Types.ObjectId(userId),
        balance: 0,
        currency: 'NGN'
      });
      await wallet.save();
    }

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
      user: new mongoose.Types.ObjectId(userId),
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
    
    let payload: any;
    if (req.body instanceof Buffer) {
      const rawBody = req.body.toString('utf8');
      payload = JSON.parse(rawBody);
    } else {
      payload = req.body;
    }
    
    console.log('📡 Payload:', JSON.stringify(payload, null, 2));

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
      
      const existingTransaction = await Transaction.findOne({ 
        reference_number: reference 
      });
      
      if (existingTransaction) {
        console.log(`⚠️ Transaction ${reference} already processed`);
        return res.status(200).json({ success: true });
      }
      
      let wallet = await Wallet.findOne({ user_id: virtualAccount.user });
      if (!wallet) {
        wallet = new Wallet({
          user_id: virtualAccount.user,
          balance: 0,
          currency: 'NGN'
        });
        await wallet.save();
      }
      
      const previousBalance = wallet.balance;
      wallet.balance += amount;
      await wallet.save();
      
      const transaction = new Transaction({
        user_id: virtualAccount.user,
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
