import { getDatabase } from '../db';
import { RedeemCode, User, TransactionType } from '../db';
import walletService from './wallet';
import logger from './logger';
import { v4 as uuidv4 } from 'uuid';

class CodesService {
  /**
   * Generate a unique code
   */
  generateCode(prefix: string): string {
    const random = uuidv4().substring(0, 12).toUpperCase().replace(/-/g, '');
    return `${prefix}-${random}`;
  }

  /**
   * Create a new redeem code
   */
  async create(data: {
    prefix: string;
    amount: number;
    usesAllowed: number;
    expiresAt?: Date;
    note?: string;
    createdBy: number;
  }): Promise<RedeemCode> {
    try {
      const db = getDatabase();
      
      // Generate unique code
      let code = this.generateCode(data.prefix);
      let exists = await this.findByCode(code);
      
      while (exists) {
        code = this.generateCode(data.prefix);
        exists = await this.findByCode(code);
      }

      const [redeemCode] = await db<RedeemCode>('redeem_codes')
        .insert({
          code,
          prefix: data.prefix,
          amount: data.amount.toFixed(2),
          uses_allowed: data.usesAllowed,
          uses_count: 0,
          expires_at: data.expiresAt || null,
          note: data.note || null,
          created_by: data.createdBy,
          is_active: true,
          created_at: new Date(),
        })
        .returning('*');

      logger.info(`Redeem code created: ${code} (${data.amount}$)`);
      
      return redeemCode;
    } catch (error) {
      logger.error('Error creating redeem code:', error);
      throw error;
    }
  }

  /**
   * Create multiple codes in bulk
   */
  async createBulk(data: {
    prefix: string;
    amount: number;
    usesAllowed: number;
    expiresAt?: Date;
    note?: string;
    createdBy: number;
    count: number;
  }): Promise<RedeemCode[]> {
    const codes: RedeemCode[] = [];
    
    for (let i = 0; i < data.count; i++) {
      const code = await this.create(data);
      codes.push(code);
    }
    
    logger.info(`Bulk created ${data.count} codes with prefix ${data.prefix}`);
    return codes;
  }

  /**
   * Find code by code string
   */
  async findByCode(code: string): Promise<RedeemCode | null> {
    try {
      const db = getDatabase();
      const redeemCode = await db<RedeemCode>('redeem_codes')
        .where({ code })
        .first();
      
      return redeemCode || null;
    } catch (error) {
      logger.error('Error finding redeem code:', error);
      throw error;
    }
  }

  /**
   * Validate if a code can be used
   */
  async validate(code: string): Promise<{ valid: boolean; reason?: string; redeemCode?: RedeemCode }> {
    const redeemCode = await this.findByCode(code);
    
    if (!redeemCode) {
      return { valid: false, reason: 'کد نامعتبره ❌' };
    }

    if (!redeemCode.is_active) {
      return { valid: false, reason: 'این کد غیرفعاله 🚫', redeemCode };
    }

    if (redeemCode.expires_at && new Date(redeemCode.expires_at) < new Date()) {
      return { valid: false, reason: 'کد منقضی شده ⏰', redeemCode };
    }

    if (redeemCode.uses_allowed > 0 && redeemCode.uses_count >= redeemCode.uses_allowed) {
      return { valid: false, reason: 'این کد تموم شده 😕', redeemCode };
    }

    return { valid: true, redeemCode };
  }

  /**
   * Claim/redeem a code (thread-safe)
   */
  async claim(code: string, userId: number): Promise<{ success: boolean; message: string; amount?: number }> {
    const db = getDatabase();
    
    try {
      return await db.transaction(async (trx) => {
        // Lock code row
        const redeemCode = await trx<RedeemCode>('redeem_codes')
          .where({ code })
          .forUpdate()
          .first();

        if (!redeemCode) {
          return { success: false, message: 'کد نامعتبره ❌' };
        }

        // Validate
        const validation = await this.validate(code);
        if (!validation.valid) {
          return { success: false, message: validation.reason || 'کد نامعتبره' };
        }

        // Increment uses
        await trx<RedeemCode>('redeem_codes')
          .where({ code })
          .increment('uses_count', 1);

        // Credit user (using nested transaction via wallet service)
        const amount = parseFloat(redeemCode.amount);
        
        // We need to commit the outer transaction first, so we'll do the credit after
        // For now, let's lock the user and do everything in this transaction
        const user = await trx<User>('users')
          .where({ id: userId })
          .forUpdate()
          .first();

        if (!user) {
          throw new Error('User not found');
        }

        const currentBalance = parseFloat(user.balance);
        const newBalance = (currentBalance + amount).toFixed(2);

        await trx<User>('users')
          .where({ id: userId })
          .update({ balance: newBalance });

        // Create transaction record
        await trx('transactions')
          .insert({
            user_id: userId,
            type: TransactionType.REDEEM,
            amount: amount.toFixed(2),
            balance_after: newBalance,
            meta: JSON.stringify({ code, code_id: redeemCode.id }),
            created_at: new Date(),
          });

        logger.info(`Code claimed: ${code} by user ${userId}, amount: ${amount}$`);
        
        return {
          success: true,
          message: `✅ کدت اوکی شد! ${amount}$ اضافه شد. موجودی جدید: ${newBalance}$`,
          amount,
        };
      });
    } catch (error) {
      logger.error('Error claiming code:', error);
      return { success: false, message: 'خطا در استفاده از کد. دوباره امتحان کن 🔄' };
    }
  }

  /**
   * List codes with filters
   */
  async list(
    filters: {
      prefix?: string;
      isActive?: boolean;
      createdBy?: number;
    } = {},
    page = 1,
    limit = 50
  ): Promise<{ codes: RedeemCode[]; total: number }> {
    try {
      const db = getDatabase();
      const offset = (page - 1) * limit;

      let query = db<RedeemCode>('redeem_codes');
      let countQuery = db<RedeemCode>('redeem_codes');

      if (filters.prefix) {
        query = query.where({ prefix: filters.prefix });
        countQuery = countQuery.where({ prefix: filters.prefix });
      }

      if (filters.isActive !== undefined) {
        query = query.where({ is_active: filters.isActive });
        countQuery = countQuery.where({ is_active: filters.isActive });
      }

      if (filters.createdBy) {
        query = query.where({ created_by: filters.createdBy });
        countQuery = countQuery.where({ created_by: filters.createdBy });
      }

      const [countResult, codes] = await Promise.all([
        countQuery.count('* as count').first(),
        query.orderBy('created_at', 'desc').limit(limit).offset(offset),
      ]);

      const total = parseInt(countResult?.count as string || '0');
      
      return { codes, total };
    } catch (error) {
      logger.error('Error listing codes:', error);
      throw error;
    }
  }

  /**
   * Activate/deactivate a code
   */
  async setActive(codeId: number, isActive: boolean): Promise<void> {
    try {
      const db = getDatabase();
      await db<RedeemCode>('redeem_codes')
        .where({ id: codeId })
        .update({ is_active: isActive });
      
      logger.info(`Code ${codeId} ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      logger.error('Error setting code active status:', error);
      throw error;
    }
  }

  /**
   * Get stats
   */
  async getStats(): Promise<{
    totalCodes: number;
    activeCodes: number;
    totalRedeemed: string;
    totalUses: number;
  }> {
    try {
      const db = getDatabase();
      
      const [totalResult, activeResult, redeemedResult, usesResult] = await Promise.all([
        db<RedeemCode>('redeem_codes').count('* as count').first(),
        db<RedeemCode>('redeem_codes').where({ is_active: true }).count('* as count').first(),
        db<RedeemCode>('redeem_codes')
          .sum(db.raw('amount * uses_count'))
          .first(),
        db<RedeemCode>('redeem_codes').sum('uses_count as total').first(),
      ]);

      return {
        totalCodes: parseInt(totalResult?.count as string || '0'),
        activeCodes: parseInt(activeResult?.count as string || '0'),
        totalRedeemed: (redeemedResult?.sum as string) || '0.00',
        totalUses: parseInt(usesResult?.total as string || '0'),
      };
    } catch (error) {
      logger.error('Error getting code stats:', error);
      throw error;
    }
  }
}

export default new CodesService();
