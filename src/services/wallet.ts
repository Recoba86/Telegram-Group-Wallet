import { getDatabase } from '../db';
import { Transaction, TransactionType, User } from '../db';
import usersService from './users';
import logger from './logger';

class WalletService {
  /**
   * Add funds to user balance (thread-safe with row locking)
   */
  async credit(
    userId: number,
    amount: number,
    type: TransactionType,
    meta: Record<string, any> = {}
  ): Promise<Transaction> {
    const db = getDatabase();
    
    return await db.transaction(async (trx) => {
      // Lock user row
      const user = await trx<User>('users')
        .where({ id: userId })
        .forUpdate()
        .first();

      if (!user) {
        throw new Error('User not found');
      }

      const currentBalance = parseFloat(user.balance);
      const newBalance = (currentBalance + amount).toFixed(2);

      // Update balance
      await trx<User>('users')
        .where({ id: userId })
        .update({ balance: newBalance });

      // Create transaction record
      const [transaction] = await trx<Transaction>('transactions')
        .insert({
          user_id: userId,
          type,
          amount: amount.toFixed(2),
          balance_after: newBalance,
          meta,
          created_at: new Date(),
        })
        .returning('*');

      logger.info(`Credit: User ${userId} +${amount} (${type}), new balance: ${newBalance}`);
      
      return transaction;
    });
  }

  /**
   * Deduct funds from user balance (thread-safe with row locking)
   */
  async debit(
    userId: number,
    amount: number,
    type: TransactionType,
    meta: Record<string, any> = {}
  ): Promise<Transaction> {
    const db = getDatabase();
    
    return await db.transaction(async (trx) => {
      // Lock user row
      const user = await trx<User>('users')
        .where({ id: userId })
        .forUpdate()
        .first();

      if (!user) {
        throw new Error('User not found');
      }

      const currentBalance = parseFloat(user.balance);
      
      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      const newBalance = (currentBalance - amount).toFixed(2);

      // Update balance
      await trx<User>('users')
        .where({ id: userId })
        .update({ balance: newBalance });

      // Create transaction record
      const [transaction] = await trx<Transaction>('transactions')
        .insert({
          user_id: userId,
          type,
          amount: amount.toFixed(2),
          balance_after: newBalance,
          meta,
          created_at: new Date(),
        })
        .returning('*');

      logger.info(`Debit: User ${userId} -${amount} (${type}), new balance: ${newBalance}`);
      
      return transaction;
    });
  }

  /**
   * Adjust balance (admin action)
   */
  async adminAdjust(
    userId: number,
    amount: number,
    reason: string,
    adminId: number
  ): Promise<Transaction> {
    const meta = { reason, admin_id: adminId };
    
    if (amount > 0) {
      return this.credit(userId, amount, TransactionType.ADMIN_ADJUST, meta);
    } else {
      return this.debit(userId, Math.abs(amount), TransactionType.ADMIN_ADJUST, meta);
    }
  }

  /**
   * Get user transaction history
   */
  async getTransactions(
    userId: number,
    page = 1,
    limit = 20
  ): Promise<{ transactions: Transaction[]; total: number }> {
    try {
      const db = getDatabase();
      const offset = (page - 1) * limit;

      const [countResult, transactions] = await Promise.all([
        db<Transaction>('transactions')
          .where({ user_id: userId })
          .count('* as count')
          .first(),
        db<Transaction>('transactions')
          .where({ user_id: userId })
          .orderBy('created_at', 'desc')
          .limit(limit)
          .offset(offset),
      ]);

      const total = parseInt(countResult?.count as string || '0');
      
      return { transactions, total };
    } catch (error) {
      logger.error('Error getting transactions:', error);
      throw error;
    }
  }

  /**
   * Get last N transactions for a user
   */
  async getLastTransactions(userId: number, limit = 5): Promise<Transaction[]> {
    try {
      const db = getDatabase();
      
      const transactions = await db<Transaction>('transactions')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(limit);
      
      return transactions;
    } catch (error) {
      logger.error('Error getting last transactions:', error);
      throw error;
    }
  }

  /**
   * Get all transactions (admin)
   */
  async getAllTransactions(
    filters: {
      userId?: number;
      type?: TransactionType;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
    page = 1,
    limit = 50
  ): Promise<{ transactions: Transaction[]; total: number }> {
    try {
      const db = getDatabase();
      const offset = (page - 1) * limit;

      let query = db<Transaction>('transactions');
      let countQuery = db<Transaction>('transactions');

      if (filters.userId) {
        query = query.where({ user_id: filters.userId });
        countQuery = countQuery.where({ user_id: filters.userId });
      }

      if (filters.type) {
        query = query.where({ type: filters.type });
        countQuery = countQuery.where({ type: filters.type });
      }

      if (filters.dateFrom) {
        query = query.where('created_at', '>=', filters.dateFrom);
        countQuery = countQuery.where('created_at', '>=', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.where('created_at', '<=', filters.dateTo);
        countQuery = countQuery.where('created_at', '<=', filters.dateTo);
      }

      const [countResult, transactions] = await Promise.all([
        countQuery.count('* as count').first(),
        query.orderBy('created_at', 'desc').limit(limit).offset(offset),
      ]);

      const total = parseInt(countResult?.count as string || '0');
      
      return { transactions, total };
    } catch (error) {
      logger.error('Error getting all transactions:', error);
      throw error;
    }
  }
}

export default new WalletService();
