// services wallet.service.ts
import { Wallet } from '../models/index.js';
export class WalletService {
    static async createWallet(user_id) {
        return await Wallet.create({
            user_id,
            balance: 0,
            currency: 'NGN'
        });
    }
    static async getBalance(user_id) {
        const wallet = await Wallet.findOne({ user_id });
        return wallet?.balance || 0;
    }
    static async creditWallet(user_id, amount) {
        const wallet = await Wallet.findOne({ user_id });
        if (!wallet)
            throw new Error('Wallet not found');
        wallet.balance += amount;
        wallet.last_transaction_at = new Date();
        await wallet.save();
        return true;
    }
    static async debitWallet(user_id, amount) {
        const wallet = await Wallet.findOne({ user_id });
        if (!wallet)
            throw new Error('Wallet not found');
        if (wallet.balance < amount)
            throw new Error('Insufficient balance');
        wallet.balance -= amount;
        wallet.last_transaction_at = new Date();
        await wallet.save();
        return true;
    }
    // Alias methods for compatibility
    static async getWalletByUserId(user_id) {
        return await Wallet.findOne({ user_id });
    }
    static async debit(user_id, amount, description) {
        return await this.debitWallet(user_id, amount);
    }
    static async credit(user_id, amount, description) {
        return await this.creditWallet(user_id, amount);
    }
}
