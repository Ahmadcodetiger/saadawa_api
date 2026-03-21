const axios = require('axios');

class PaymentPointService {
  constructor() {
    this.baseURL = 'https://api.paymentpoint.co/api/v1';
    this.apiKey = process.env.PAYMENTPOINT_API_KEY;
    this.apiSecret = process.env.PAYMENTPOINT_API_SECRET;
    this.businessId = process.env.PAYMENTPOINT_BUSINESS_ID;
  }

  // Create Virtual Account
  async createVirtualAccount(userData) {
    try {
      const headers = {
        'Authorization': `Bearer ${this.apiSecret}`,
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      };

      const requestData = {
        email: userData.email,
        name: userData.name,
        phoneNumber: userData.phoneNumber,
        bankCode: ['20946', '20897'], // Palmpay and Opay
        businessId: this.businessId,
      };

      console.log('🏦 Creating PaymentPoint virtual account:', requestData);

      const response = await axios.post(
        `${this.baseURL}/createVirtualAccount`,
        requestData,
        { headers }
      );

      console.log('✅ Virtual account created:', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ PaymentPoint error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create virtual account',
      };
    }
  }

  // Get Virtual Account Balance (if needed)
  async getVirtualAccountBalance(accountNumber) {
    try {
      const headers = {
        'Authorization': `Bearer ${this.apiSecret}`,
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      };

      const response = await axios.get(
        `${this.baseURL}/getAccountBalance/${accountNumber}`,
        { headers }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Get balance error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get balance',
      };
    }
  }

  // Webhook handler for payment notifications
  async handleWebhook(payload) {
    // Verify webhook signature (implement based on PaymentPoint docs)
    // Process payment notification
    console.log('📡 Webhook received:', payload);
    
    // Update user's wallet balance based on the payment
    return { success: true };
  }
}

module.exports = new PaymentPointService();
