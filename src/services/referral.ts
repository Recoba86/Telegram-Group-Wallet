import { getDatabase } from '../db';
import { Referral, TransactionType } from '../db';
import usersService from './users';
import walletService from './wallet';
import settingsService from './settings';
import logger from './logger';
import { CONFIG } from '../config';

class ReferralService {
  /**
   * Process a referral (called when a new user joins with a referral code)
   */
  async processReferral(referralCode: string, newUserId: number): Promise<boolean> {
    try {
      const db = getDatabase();
      
      // Find referrer
      const referrer = await usersService.findByReferralCode(referralCode);
      if (!referrer) {
        logger.warn(`Referral code not found: ${referralCode}`);
        return false;
      }

      // Check if this user was already referred
      const existingReferral = await db<Referral>('referrals')
        .where({ referred_user_id: newUserId })
        .first();

      if (existingReferral) {
        logger.warn(`User ${newUserId} already has a referral`);
        return false;
      }

      // Get reward amount from settings
      const reward = await settingsService.get<number>('REFERRAL_REWARD', CONFIG.REFERRAL_REWARD);

      // Credit referrer
      await walletService.credit(
        referrer.id,
        reward,
        TransactionType.REFERRAL_BONUS,
        {
          referred_user_id: newUserId,
          referral_code: referralCode,
        }
      );

      // Create referral record
      await db<Referral>('referrals')
        .insert({
          referrer_user_id: referrer.id,
          referred_user_id: newUserId,
          reward: reward.toFixed(2),
          created_at: new Date(),
        });

      logger.info(`Referral processed: Referrer ${referrer.id} got ${reward}$ for referring user ${newUserId}`);
      
      return true;
    } catch (error) {
      logger.error('Error processing referral:', error);
      return false;
    }
  }

  /**
   * Get referral stats for a user
   */
  async getUserStats(userId: number): Promise<{
    totalReferrals: number;
    totalRewards: string;
  }> {
    try {
      const db = getDatabase();
      
      const [countResult, rewardsResult] = await Promise.all([
        db<Referral>('referrals')
          .where({ referrer_user_id: userId })
          .count('* as count')
          .first(),
        db<Referral>('referrals')
          .where({ referrer_user_id: userId })
          .sum('reward as total')
          .first(),
      ]);

      return {
        totalReferrals: parseInt(countResult?.count as string || '0'),
        totalRewards: (rewardsResult?.total as string) || '0.00',
      };
    } catch (error) {
      logger.error('Error getting user referral stats:', error);
      throw error;
    }
  }

  /**
   * Get referral list for a user
   */
  async getUserReferrals(
    userId: number,
    page = 1,
    limit = 20
  ): Promise<{ referrals: Referral[]; total: number }> {
    try {
      const db = getDatabase();
      const offset = (page - 1) * limit;

      const [countResult, referrals] = await Promise.all([
        db<Referral>('referrals')
          .where({ referrer_user_id: userId })
          .count('* as count')
          .first(),
        db<Referral>('referrals')
          .where({ referrer_user_id: userId })
          .orderBy('created_at', 'desc')
          .limit(limit)
          .offset(offset),
      ]);

      const total = parseInt(countResult?.count as string || '0');
      
      return { referrals, total };
    } catch (error) {
      logger.error('Error getting user referrals:', error);
      throw error;
    }
  }

  /**
   * Get global referral stats (admin)
   */
  async getGlobalStats(): Promise<{
    totalReferrals: number;
    totalRewards: string;
  }> {
    try {
      const db = getDatabase();
      
      const [countResult, rewardsResult] = await Promise.all([
        db<Referral>('referrals').count('* as count').first(),
        db<Referral>('referrals').sum('reward as total').first(),
      ]);

      return {
        totalReferrals: parseInt(countResult?.count as string || '0'),
        totalRewards: (rewardsResult?.total as string) || '0.00',
      };
    } catch (error) {
      logger.error('Error getting global referral stats:', error);
      throw error;
    }
  }
}

export default new ReferralService();
