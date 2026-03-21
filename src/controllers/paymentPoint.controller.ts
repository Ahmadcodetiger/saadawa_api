import { Request, Response } from 'express';
import User from '../models/User.js';  // Add .js extension
import Wallet from '../models/Wallet.js';  // Add .js extension
import Transaction from '../models/Transaction.js';  // Add .js extension
import paymentPointService from '../services/paymentPoint.service.js';  // Add .js extension
// Create virtual account for user
export const createVirtualAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user already has a virtual account
    if (user.virtualAccount) {
      return res.status(200).json({
        success: true,
        message: 'Virtual account already exists',
        data: user.virtualAccount,
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

    // Save virtual account details to user
    const bankAccount = result.data.bankAccounts[0];
    user.virtualAccount = {
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      bankName: bankAccount.bankName,
      bankCode: bankAccount.bankCode,
      customerId: result.data.customer.customer_id,
      createdAt: new Date(),
    };
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Virtual account created successfully',
      data: user.virtualAccount,
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
export const getVirtualAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.virtualAccount) {
      return res.status(404).json({
        success: false,
        message: 'Virtual account not found',
        data: { exists: false },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Virtual account retrieved',
      data: user.virtualAccount,
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
export const paymentWebhook = async (req, res) => {
  let transactionId = null;
  
  try {
    // Log the incoming webhook
    console.log('📡 PaymentPoint webhook received at:', new Date().toISOString());
    console.log('📡 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📡 Body:', JSON.stringify(req.body, null, 2));

    const payload = req.body;
    
    // Try to extract payment details (adjust based on actual PaymentPoint structure)
    // Common structures from different payment providers
    let accountNumber, amount, reference, customerEmail, narration, status, event;
    
    // Check for different possible payload structures
    if (payload.data) {
      // Structure: { data: { ... } }
      accountNumber = payload.data.accountNumber || payload.data.account_number;
      amount = payload.data.amount;
      reference = payload.data.reference || payload.data.transactionReference;
      customerEmail = payload.data.customerEmail || payload.data.email;
      narration = payload.data.narration || payload.data.description;
      status = payload.data.status;
      event = payload.event;
    } else {
      // Flat structure
      accountNumber = payload.accountNumber || payload.account_number;
      amount = payload.amount;
      reference = payload.reference || payload.transactionReference;
      customerEmail = payload.customerEmail || payload.email;
      narration = payload.narration || payload.description;
      status = payload.status;
      event = payload.event;
    }
    
    console.log('📋 Parsed payment data:', {
      accountNumber,
      amount,
      reference,
      customerEmail,
      narration,
      status,
      event
    });
    
    // Process only successful payments
    const isSuccess = status === 'successful' || status === 'success' || event === 'payment.success';
    
    if (isSuccess && amount > 0 && accountNumber) {
      // Find user by virtual account number
      const user = await User.findOne({ 
        'virtualAccount.accountNumber': accountNumber 
      });
      
      if (!user) {
        console.error(`❌ User not found for account: ${accountNumber}`);
        return res.status(200).json({ 
          success: true, 
          message: 'User not found but acknowledged' 
        });
      }
      
      // Check if transaction already processed (prevent duplicates)
      transactionId = reference || `PAYMENT_${Date.now()}_${accountNumber}`;
      const existingTransaction = await Transaction.findOne({ 
        reference_number: transactionId 
      });
      
      if (existingTransaction) {
        console.log(`⚠️ Transaction ${transactionId} already processed, skipping`);
        return res.status(200).json({ 
          success: true, 
          message: 'Already processed' 
        });
      }
      
      // Find or create wallet
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
      const transaction = new Transaction({
        user_id: user._id,
        wallet_id: wallet._id,
        type: 'wallet_topup',
        amount: amount,
        fee: 0,
        total_charged: amount,
        status: 'successful',
        reference_number: transactionId,
        description: narration || 'Wallet funding via PaymentPoint',
        payment_method: 'virtual_account',
        destination_account: accountNumber,
        created_at: new Date(),
        updated_at: new Date()
      });
      await transaction.save();
      
      console.log(`✅ Wallet credited: ${user.email}`);
      console.log(`💰 Amount: ₦${amount}`);
      console.log(`📈 Previous balance: ₦${previousBalance}`);
      console.log(`📊 New balance: ₦${wallet.balance}`);
      console.log(`🆔 Transaction ID: ${transaction._id}`);
      
      // Optional: Send notification to user
      // await sendEmailNotification(user.email, amount, wallet.balance);
      // await sendPushNotification(user.deviceToken, amount);
    } else {
      console.log(`ℹ️ Skipping non-payment or failed event: ${event}, status: ${status}`);
    }
    
    // Always return 200 to acknowledge receipt
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook received successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Still return 200 to avoid retries from PaymentPoint
    return res.status(200).json({ 
      success: false, 
      message: 'Webhook received but processing failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
