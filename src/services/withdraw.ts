import { getDatabase } from '../db';
import { WithdrawRequest, WithdrawStatus, User, TransactionType } from '../db';
import walletService from './wallet';
import settingsService from './settings';
import logger from './logger';
import { CONFIG } from '../config';

class WithdrawService {
  /**
   * Calculate withdrawal fee
   */
  async calculateFee(amount: number): Promise<{ fee: number; netAmount: number }> {
    const feeFixed = await settingsService.get<number>('WITHDRAW_FEE_FIXED', CONFIG.WITHDRAW_FEE_FIXED);
    const feePercent = await settingsService.get<number>('WITHDRAW_FEE_PERCENT', CONFIG.WITHDRAW_FEE_PERCENT);
    
    const percentageFee = (amount * feePercent) / 100;
    const totalFee = feeFixed + percentageFee;
    const netAmount = amount - totalFee;
    
    return {
      fee: parseFloat(totalFee.toFixed(2)),
      netAmount: parseFloat(netAmount.toFixed(2)),
    };
  }

  /**
   * Check if user can withdraw (daily limit)
   */
  async canWithdraw(userId: number): Promise<{ can: boolean; reason?: string }> {
    try {
      const db = getDatabase();
      const dailyLimit = await settingsService.get<number>('DAILY_WITHDRAW_LIMIT', CONFIG.DAILY_WITHDRAW_LIMIT);
      
      // Count today's withdrawals
      const count = await db<WithdrawRequest>('withdraw_requests')
        .where({ user_id: userId })
        .where('created_at', '>=', db.raw("DATE_TRUNC('day', NOW())"))
        .count('* as count')
        .first();

      const todayCount = parseInt(count?.count as string || '0');
      
      if (todayCount >= dailyLimit) {
        return {
          can: false,
          reason: `شما امروز ${dailyLimit} بار برداشت کردین. فردا دوباره امتحان کنید 📅`,
        };
      }

      return { can: true };
    } catch (error) {
      logger.error('Error checking withdraw limit:', error);
      throw error;
    }
  }

  /**
   * Create a withdrawal request (reserves amount immediately)
   */
  async create(data: {
    userId: number;
    amount: number;
    targetNetwork: string;
    targetAddress: string;
  }): Promise<{ success: boolean; message: string; request?: WithdrawRequest }> {
    try {
      const db = getDatabase();
      
      // Validate minimum amount
      const minAmount = await settingsService.get<number>('MIN_WITHDRAW_AMOUNT', CONFIG.MIN_WITHDRAW_AMOUNT);
      
      if (data.amount < minAmount) {
        return {
          success: false,
          message: `حداقل مبلغ برداشت ${minAmount}$ است ⚠️`,
        };
      }

      // Check daily limit
      const limitCheck = await this.canWithdraw(data.userId);
      
      if (!limitCheck.can) {
        return {
          success: false,
          message: limitCheck.reason || 'محدودیت برداشت روزانه',
        };
      }

      // Calculate fee
      const { fee } = await this.calculateFee(data.amount);

      // Check user balance
      const userResult = await db.raw(
        'SELECT id, balance FROM users WHERE id = ?',
        [data.userId]
      );
      const user = userResult.rows[0];

      if (!user) {
        return { success: false, message: 'کاربر یافت نشد' };
      }

      const balance = parseFloat(user.balance);
      
      if (balance < data.amount) {
        return {
          success: false,
          message: `موجودی شما کافی نیست. موجودی فعلی: ${balance}$ 💰`,
        };
      }

      // Reserve amount (debit immediately)
      await walletService.debit(
        data.userId,
        data.amount,
        TransactionType.WITHDRAW_RESERVE,
        {
          target_network: data.targetNetwork,
          target_address: data.targetAddress,
          fee,
        }
      );

      // Create withdraw request
      const insertResult = await db.raw(
        `INSERT INTO withdraw_requests 
         (user_id, amount, fee_applied, target_network, target_address, status)
         VALUES (?, ?, ?, ?, ?, 'pending')
         RETURNING *`,
        [
          data.userId,
          data.amount.toFixed(2),
          fee.toFixed(2),
          data.targetNetwork,
          data.targetAddress
        ]
      );
      
      const request = insertResult.rows[0];
      
      if (!request) {
        throw new Error('Failed to create withdrawal request - no result returned');
      }

      logger.info(`Withdraw request created: ${request.id} by user ${data.userId}, amount: ${data.amount}$`);
      
      const netAmount = data.amount - fee;
      
      return {
        success: true,
        message: `📝 درخواست برداشت ثبت شد!\n💵 مبلغ: ${data.amount}$\n💸 کارمزد: ${fee}$\n✅ دریافتی: ${netAmount}$\n⏳ وضعیت: در انتظار تایید`,
        request,
      };
    } catch (error) {
      logger.error('Error creating withdraw request:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Insufficient balance') {
          return {
            success: false,
            message: 'موجودی شما کافی نیست 💰',
          };
        }
      }
      
      return {
        success: false,
        message: 'خطا در ثبت درخواست. دوباره امتحان کنید 🔄',
      };
    }
  }

  /**
   * Approve a withdrawal request
   */
  async approve(requestId: number, adminId: number, note?: string): Promise<void> {
    try {
      const db = getDatabase();
      
      const request = await db<WithdrawRequest>('withdraw_requests')
        .where({ id: requestId })
        .first();

      if (!request) {
        throw new Error('Withdraw request not found');
      }

      if (request.status !== WithdrawStatus.PENDING) {
        throw new Error('Request is not pending');
      }

      await db<WithdrawRequest>('withdraw_requests')
        .where({ id: requestId })
        .update({
          status: WithdrawStatus.APPROVED,
          note: note || null,
          processed_at: new Date(),
          processed_by: adminId,
        });

      logger.info(`Withdraw request ${requestId} approved by admin ${adminId}`);
    } catch (error) {
      logger.error('Error approving withdraw request:', error);
      throw error;
    }
  }

  /**
   * Reject a withdrawal request (refund amount)
   */
  async reject(requestId: number, adminId: number, reason: string): Promise<void> {
    try {
      const db = getDatabase();
      
      const request = await db<WithdrawRequest>('withdraw_requests')
        .where({ id: requestId })
        .first();

      if (!request) {
        throw new Error('Withdraw request not found');
      }

      if (request.status !== WithdrawStatus.PENDING) {
        throw new Error('Request is not pending');
      }

      // Refund the reserved amount
      const amount = parseFloat(request.amount);
      await walletService.credit(
        request.user_id,
        amount,
        TransactionType.CREDIT,
        { reason: 'withdraw_rejected', request_id: requestId }
      );

      await db<WithdrawRequest>('withdraw_requests')
        .where({ id: requestId })
        .update({
          status: WithdrawStatus.REJECTED,
          rejection_reason: reason,
          processed_at: new Date(),
          processed_by: adminId,
        });

      logger.info(`Withdraw request ${requestId} rejected by admin ${adminId}, amount refunded`);
    } catch (error) {
      logger.error('Error rejecting withdraw request:', error);
      throw error;
    }
  }

  /**
   * Mark as paid (final step)
   */
  async markPaid(requestId: number, adminId: number, txid?: string): Promise<void> {
    try {
      const db = getDatabase();
      
      const request = await db<WithdrawRequest>('withdraw_requests')
        .where({ id: requestId })
        .first();

      if (!request) {
        throw new Error('Withdraw request not found');
      }

      if (request.status !== WithdrawStatus.APPROVED) {
        throw new Error('Request must be approved first');
      }

      // Create final paid transaction
      const netAmount = parseFloat(request.amount) - parseFloat(request.fee_applied);
      await walletService.debit(
        request.user_id,
        0, // Already deducted
        TransactionType.WITHDRAW_PAID,
        {
          request_id: requestId,
          txid: txid || null,
          net_amount: netAmount,
        }
      );

      await db<WithdrawRequest>('withdraw_requests')
        .where({ id: requestId })
        .update({
          status: WithdrawStatus.PAID,
          processed_at: new Date(),
          processed_by: adminId,
        });

      logger.info(`Withdraw request ${requestId} marked as paid by admin ${adminId}`);
    } catch (error) {
      logger.error('Error marking withdraw as paid:', error);
      throw error;
    }
  }

  /**
   * Get user's withdrawal requests
   */
  async getUserRequests(
    userId: number,
    page = 1,
    limit = 20
  ): Promise<{ requests: WithdrawRequest[]; total: number }> {
    try {
      const db = getDatabase();
      const offset = (page - 1) * limit;

      const [countResult, requests] = await Promise.all([
        db<WithdrawRequest>('withdraw_requests')
          .where({ user_id: userId })
          .count('* as count')
          .first(),
        db<WithdrawRequest>('withdraw_requests')
          .where({ user_id: userId })
          .orderBy('created_at', 'desc')
          .limit(limit)
          .offset(offset),
      ]);

      const total = parseInt(countResult?.count as string || '0');
      
      return { requests, total };
    } catch (error) {
      logger.error('Error getting user withdraw requests:', error);
      throw error;
    }
  }

  /**
   * Get all withdrawal requests (admin)
   */
  async getAllRequests(
    filters: {
      status?: WithdrawStatus;
      userId?: number;
    } = {},
    page = 1,
    limit = 50
  ): Promise<{ requests: WithdrawRequest[]; total: number }> {
    try {
      const db = getDatabase();
      const offset = (page - 1) * limit;

      let query = db<WithdrawRequest>('withdraw_requests');
      let countQuery = db<WithdrawRequest>('withdraw_requests');

      if (filters.status) {
        query = query.where({ status: filters.status });
        countQuery = countQuery.where({ status: filters.status });
      }

      if (filters.userId) {
        query = query.where({ user_id: filters.userId });
        countQuery = countQuery.where({ user_id: filters.userId });
      }

      const [countResult, requests] = await Promise.all([
        countQuery.count('* as count').first(),
        query.orderBy('created_at', 'desc').limit(limit).offset(offset),
      ]);

      const total = parseInt(countResult?.count as string || '0');
      
      return { requests, total };
    } catch (error) {
      logger.error('Error getting all withdraw requests:', error);
      throw error;
    }
  }

  /**
   * Get stats
   */
  async getStats(): Promise<{
    totalRequests: number;
    pending: number;
    approved: number;
    rejected: number;
    paid: number;
    totalAmount: string;
    totalFees: string;
  }> {
    try {
      const db = getDatabase();
      
      const [totalResult, pendingResult, approvedResult, rejectedResult, paidResult, amountResult, feesResult] = await Promise.all([
        db<WithdrawRequest>('withdraw_requests').count('* as count').first(),
        db<WithdrawRequest>('withdraw_requests').where({ status: WithdrawStatus.PENDING }).count('* as count').first(),
        db<WithdrawRequest>('withdraw_requests').where({ status: WithdrawStatus.APPROVED }).count('* as count').first(),
        db<WithdrawRequest>('withdraw_requests').where({ status: WithdrawStatus.REJECTED }).count('* as count').first(),
        db<WithdrawRequest>('withdraw_requests').where({ status: WithdrawStatus.PAID }).count('* as count').first(),
        db<WithdrawRequest>('withdraw_requests').where({ status: WithdrawStatus.PAID }).sum('amount as total').first(),
        db<WithdrawRequest>('withdraw_requests').where({ status: WithdrawStatus.PAID }).sum('fee_applied as total').first(),
      ]);

      return {
        totalRequests: parseInt(totalResult?.count as string || '0'),
        pending: parseInt(pendingResult?.count as string || '0'),
        approved: parseInt(approvedResult?.count as string || '0'),
        rejected: parseInt(rejectedResult?.count as string || '0'),
        paid: parseInt(paidResult?.count as string || '0'),
        totalAmount: (amountResult?.total as string) || '0.00',
        totalFees: (feesResult?.total as string) || '0.00',
      };
    } catch (error) {
      logger.error('Error getting withdraw stats:', error);
      throw error;
    }
  }
}

export default new WithdrawService();
