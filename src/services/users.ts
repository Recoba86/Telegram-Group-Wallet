import { getDatabase } from '../db';
import { User } from '../db';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

class UsersService {
  generateReferralCode(): string {
    // Generate a short unique code (8 chars)
    return uuidv4().substring(0, 8).toUpperCase();
  }

  async findByTelegramId(telegramId: number): Promise<User | null> {
    try {
      const db = getDatabase();
      const user = await db<User>('users')
        .where({ telegram_id: telegramId })
        .first();
      
      return user || null;
    } catch (error) {
      logger.error('Error finding user by telegram_id:', error);
      throw error;
    }
  }

  async findById(id: number): Promise<User | null> {
    try {
      const db = getDatabase();
      const user = await db<User>('users')
        .where({ id })
        .first();
      
      return user || null;
    } catch (error) {
      logger.error('Error finding user by id:', error);
      throw error;
    }
  }

  async findByReferralCode(code: string): Promise<User | null> {
    try {
      const db = getDatabase();
      const user = await db<User>('users')
        .where({ referral_code: code })
        .first();
      
      return user || null;
    } catch (error) {
      logger.error('Error finding user by referral code:', error);
      throw error;
    }
  }

  async create(data: {
    telegramId: number;
    username?: string;
    displayName: string;
    referredBy?: string;
  }): Promise<User> {
    try {
      const db = getDatabase();
      
      // Generate unique referral code
      let referralCode = this.generateReferralCode();
      let exists = await this.findByReferralCode(referralCode);
      
      while (exists) {
        referralCode = this.generateReferralCode();
        exists = await this.findByReferralCode(referralCode);
      }

      const [user] = await db<User>('users')
        .insert({
          telegram_id: data.telegramId,
          username: data.username || null,
          display_name: data.displayName,
          balance: '0.00',
          referral_code: referralCode,
          referred_by: data.referredBy || null,
          created_at: new Date(),
        })
        .returning('*');

      logger.info(`New user created: ${user.telegram_id} (${user.display_name})`);
      
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async updateBalance(userId: number, newBalance: string): Promise<void> {
    try {
      const db = getDatabase();
      await db<User>('users')
        .where({ id: userId })
        .update({ balance: newBalance });
    } catch (error) {
      logger.error('Error updating user balance:', error);
      throw error;
    }
  }

  async search(query: string, limit = 50): Promise<User[]> {
    try {
      const db = getDatabase();
      
      const users = await db<User>('users')
        .where('display_name', 'ilike', `%${query}%`)
        .orWhere('username', 'ilike', `%${query}%`)
        .orWhere('telegram_id', 'like', `%${query}%`)
        .limit(limit);
      
      return users;
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  async list(page = 1, limit = 50): Promise<{ users: User[]; total: number }> {
    try {
      const db = getDatabase();
      const offset = (page - 1) * limit;
      
      const [countResult, users] = await Promise.all([
        db<User>('users').count('* as count').first(),
        db<User>('users')
          .select('*')
          .orderBy('created_at', 'desc')
          .limit(limit)
          .offset(offset),
      ]);

      const total = parseInt(countResult?.count as string || '0');
      
      return { users, total };
    } catch (error) {
      logger.error('Error listing users:', error);
      throw error;
    }
  }

  async getStats(): Promise<{
    totalUsers: number;
    activeToday: number;
    totalBalance: string;
  }> {
    try {
      const db = getDatabase();
      
      const [totalResult, activeResult, balanceResult] = await Promise.all([
        db<User>('users').count('* as count').first(),
        db<User>('users')
          .count('* as count')
          .where('created_at', '>=', db.raw("NOW() - INTERVAL '24 hours'"))
          .first(),
        db<User>('users').sum('balance as total').first(),
      ]);

      return {
        totalUsers: parseInt(totalResult?.count as string || '0'),
        activeToday: parseInt(activeResult?.count as string || '0'),
        totalBalance: balanceResult?.total || '0.00',
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  async getRecentUsers(limit: number = 10): Promise<User[]> {
    try {
      const db = getDatabase();
      const users = await db<User>('users')
        .orderBy('created_at', 'desc')
        .limit(limit);
      
      return users;
    } catch (error) {
      logger.error('Error getting recent users:', error);
      throw error;
    }
  }
}

export default new UsersService();
