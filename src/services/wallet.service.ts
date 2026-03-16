// services wallet.service.ts
import { Wallet, Transaction } from '../models/index.js';
import { Types } from 'mongoose';

export class WalletService {
  static async createWallet(user_id: Types.ObjectId) {
    return await Wallet.create({
      user_id,
      balance: 0,
      currency: 'NGN'
    });
  }

  static async getBalance(user_id: Types.ObjectId): Promise<number> {
    const wallet = await Wallet.findOne({ user_id });
    return wallet?.balance || 0;
  }

  static async creditWallet(user_id: Types.ObjectId, amount: number): Promise<boolean> {
    const wallet = await Wallet.findOne({ user_id });
    if (!wallet) throw new Error('Wallet not found');

    wallet.balance += amount;
    wallet.last_transaction_at = new Date();
    await wallet.save();
    return true;
  }

  static async debitWallet(user_id: Types.ObjectId, amount: number): Promise<boolean> {
    const wallet = await Wallet.findOne({ user_id });
    if (!wallet) throw new Error('Wallet not found');
    if (wallet.balance < amount) throw new Error('Insufficient balance');

    wallet.balance -= amount;
    wallet.last_transaction_at = new Date();
    await wallet.save();
    return true;
  }

  // Alias methods for compatibility
  static async getWalletByUserId(user_id: Types.ObjectId | string) {
    return await Wallet.findOne({ user_id });
  }

  static async debit(user_id: Types.ObjectId | string, amount: number, description?: string) {
    return await this.debitWallet(user_id as Types.ObjectId, amount);
  }

  static async credit(user_id: Types.ObjectId | string, amount: number, description?: string) {
    return await this.creditWallet(user_id as Types.ObjectId, amount);
  }
}