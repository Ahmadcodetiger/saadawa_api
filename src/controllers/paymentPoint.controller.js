const paymentPointService = require('../services/paymentPoint.service');
const User = require('../models/User');
const Wallet = require('../models/Wallet');

// Create virtual account for user
exports.createVirtualAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user details
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
    const bankAccount = result.data.bankAccounts[0]; // Get first bank account
    user.virtualAccount = {
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      bankName: bankAccount.bankName,
      bankCode: bankAccount.bankCode,
      customerId: result.data.customer.customer_id,
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
exports.getVirtualAccount = async (req, res) => {
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

// Webhook for payment notifications
exports.paymentWebhook = async (req, res) => {
  try {
    const payload = req.body;
    
    // Process webhook
    const result = await paymentPointService.handleWebhook(payload);
    
    if (result.success) {
      // Update wallet balance based on payment
      // Implementation depends on your payment flow
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ success: false });
  }
};
