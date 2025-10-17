import { Telegraf } from 'telegraf';
import { CONFIG } from '../config';
import logger from './logger';

class NotificationService {
  private bot: Telegraf | null = null;

  initialize(bot: Telegraf): void {
    this.bot = bot;
  }

  /**
   * Send message to admin group
   */
  async notifyAdminGroup(message: string): Promise<void> {
    if (!this.bot || !CONFIG.ADMIN_GROUP_ID) {
      logger.warn('Cannot notify admin group: bot not initialized or admin group not set');
      return;
    }

    try {
      await this.bot.telegram.sendMessage(CONFIG.ADMIN_GROUP_ID, message, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      logger.error('Error sending message to admin group:', error);
    }
  }

  /**
   * Send message to specific user
   */
  async notifyUser(userId: number, message: string): Promise<void> {
    if (!this.bot) {
      logger.warn('Cannot notify user: bot not initialized');
      return;
    }

    try {
      await this.bot.telegram.sendMessage(userId, message, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      logger.error(`Error sending message to user ${userId}:`, error);
    }
  }

  /**
   * Notify all admins (DM)
   */
  async notifyAdmins(message: string): Promise<void> {
    for (const adminId of CONFIG.ADMIN_IDS) {
      await this.notifyUser(adminId, message);
    }
  }

  /**
   * Notify about new withdraw request
   */
  async notifyNewWithdrawRequest(data: {
    requestId: number;
    userId: number;
    username: string;
    amount: number;
    fee: number;
    network: string;
    address: string;
  }): Promise<void> {
    const message = `
🆕 <b>درخواست برداشت جدید</b>

📝 شناسه: #${data.requestId}
👤 کاربر: ${data.username} (ID: ${data.userId})
💰 مبلغ: ${data.amount}$
💸 کارمزد: ${data.fee}$
✅ دریافتی: ${(data.amount - data.fee).toFixed(2)}$
🌐 شبکه: ${data.network}
📫 آدرس: <code>${data.address}</code>

⏳ وضعیت: در انتظار تایید
    `.trim();

    await this.notifyAdminGroup(message);
  }

  /**
   * Notify user about withdraw status change
   */
  async notifyWithdrawStatusChange(
    userId: number,
    status: 'approved' | 'rejected' | 'paid',
    data: {
      requestId: number;
      amount: number;
      note?: string;
    }
  ): Promise<void> {
    let message = '';

    switch (status) {
      case 'approved':
        message = `
✅ <b>درخواست برداشت تایید شد</b>

📝 شناسه: #${data.requestId}
💰 مبلغ: ${data.amount}$

⏳ در حال پردازش پرداخت...
        `.trim();
        break;

      case 'rejected':
        message = `
❌ <b>درخواست برداشت رد شد</b>

📝 شناسه: #${data.requestId}
💰 مبلغ: ${data.amount}$ (برگشت داده شد)
📄 دلیل: ${data.note || 'مشخص نشده'}

لطفا دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.
        `.trim();
        break;

      case 'paid':
        message = `
💸 <b>برداشت شما پرداخت شد!</b>

📝 شناسه: #${data.requestId}
💰 مبلغ: ${data.amount}$

✅ لطفا کیف پول خود را چک کنید.
        `.trim();
        break;
    }

    await this.notifyUser(userId, message);
  }

  /**
   * Notify about successful code claim
   */
  async notifyCodeClaim(
    userId: number,
    data: {
      code: string;
      amount: number;
      newBalance: number;
    }
  ): Promise<void> {
    const message = `
✅ <b>کد با موفقیت استفاده شد!</b>

🎟 کد: <code>${data.code}</code>
💰 مبلغ: ${data.amount}$
💵 موجودی جدید: ${data.newBalance}$
    `.trim();

    await this.notifyUser(userId, message);
  }

  /**
   * Notify about referral bonus
   */
  async notifyReferralBonus(
    referrerId: number,
    data: {
      reward: number;
      referredUsername: string;
    }
  ): Promise<void> {
    const message = `
🎉 <b>پاداش معرفی دریافت کردید!</b>

👤 کاربر معرفی شده: ${data.referredUsername}
💰 پاداش: ${data.reward}$

از اینکه دوستانتون رو دعوت میکنید ممنونیم! 🙏
    `.trim();

    await this.notifyUser(referrerId, message);
  }
}

export default new NotificationService();
