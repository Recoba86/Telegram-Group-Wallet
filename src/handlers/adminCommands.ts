import { Context } from 'telegraf';
import usersService from '../services/users';
import withdrawService from '../services/withdraw';
import codesService from '../services/codes';
import settingsService from '../services/settings';
import walletService from '../services/wallet';
import { TransactionType, WithdrawStatus } from '../db';
import logger from '../services/logger';

/**
 * /admin command - show admin menu
 */
export async function adminCommand(ctx: Context) {
  try {
    const menu = `
🎛 <b>پنل مدیریت</b>

دستورات در دسترس:

💸 <b>مدیریت برداشت‌ها:</b>
/admin_withdrawals - لیست برداشت‌های در انتظار
/admin_approve &lt;id&gt; - تایید برداشت
/admin_reject &lt;id&gt; &lt;دلیل&gt; - رد برداشت
/admin_paid &lt;id&gt; [txid] - ثبت پرداخت

🎟 <b>مدیریت کدها:</b>
/admin_createcode &lt;amount&gt; &lt;uses&gt; - ساخت کد
/admin_codes - لیست کدهای فعال

👥 <b>مدیریت کاربران:</b>
/admin_users - آمار کاربران
/admin_user &lt;user_id&gt; - اطلاعات کاربر
/admin_addbalance &lt;user_id&gt; &lt;amount&gt; - تغییر موجودی (+ یا -)

📊 <b>آمار:</b>
/admin_stats - آمار کلی سیستم

⚙️ <b>تنظیمات:</b>
/admin_settings - مشاهده تنظیمات
    `.trim();

    await ctx.reply(menu, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Error in admin command:', error);
    await ctx.reply('❌ خطایی رخ داد');
  }
}

/**
 * /admin_withdrawals - show pending withdrawals
 */
export async function adminWithdrawalsCommand(ctx: Context) {
  try {
    const { requests } = await withdrawService.getAllRequests({ status: WithdrawStatus.PENDING }, 1, 10);

    if (requests.length === 0) {
      await ctx.reply('✅ هیچ درخواست برداشتی در انتظار نیست');
      return;
    }

    let message = '💸 <b>درخواست‌های برداشت در انتظار:</b>\n\n';

    for (const req of requests) {
      const user = await usersService.findById(req.user_id);
      message += `━━━━━━━━━━━━━━━\n`;
      message += `🆔 شناسه: #${req.id}\n`;
      message += `👤 کاربر: ${user?.display_name || 'Unknown'} (ID: ${req.user_id})\n`;
      message += `💰 مبلغ: ${req.amount}$\n`;
      message += `💸 کارمزد: ${req.fee_applied}$\n`;
      message += `✅ دریافتی: ${(parseFloat(req.amount) - parseFloat(req.fee_applied)).toFixed(2)}$\n`;
      message += `🌐 شبکه: ${req.target_network}\n`;
      message += `📫 آدرس: <code>${req.target_address}</code>\n`;
      message += `📅 تاریخ: ${new Date(req.created_at).toLocaleString('fa-IR')}\n`;
      message += `\n`;
    }

    message += `\nبرای تایید: /admin_approve &lt;id&gt;\n`;
    message += `برای رد: /admin_reject &lt;id&gt; &lt;دلیل&gt;`;

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Error in admin withdrawals command:', error);
    await ctx.reply('❌ خطا در دریافت لیست برداشت‌ها');
  }
}

/**
 * /admin_approve <id> - approve withdrawal
 */
export async function adminApproveCommand(ctx: Context) {
  try {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = text.split(' ');

    if (parts.length < 2) {
      await ctx.reply('❌ فرمت: /admin_approve &lt;id&gt;', { parse_mode: 'HTML' });
      return;
    }

    const requestId = parseInt(parts[1]);
    if (isNaN(requestId)) {
      await ctx.reply('❌ شناسه نامعتبر است');
      return;
    }

    const user = await usersService.findByTelegramId(ctx.from!.id);
    if (!user) {
      await ctx.reply('❌ خطا در احراز هویت');
      return;
    }

    await withdrawService.approve(requestId, user.id, 'Approved by admin');

    await ctx.reply(`✅ درخواست برداشت #${requestId} تایید شد.\n\nحالا باید مبلغ را پرداخت کرده و از دستور زیر استفاده کنید:\n/admin_paid ${requestId} [txid]`);
  } catch (error) {
    logger.error('Error in admin approve command:', error);
    await ctx.reply('❌ خطا در تایید درخواست: ' + (error instanceof Error ? error.message : ''));
  }
}

/**
 * /admin_reject <id> <reason> - reject withdrawal
 */
export async function adminRejectCommand(ctx: Context) {
  try {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = text.split(' ');

    if (parts.length < 3) {
      await ctx.reply('❌ فرمت: /admin_reject &lt;id&gt; &lt;دلیل&gt;', { parse_mode: 'HTML' });
      return;
    }

    const requestId = parseInt(parts[1]);
    if (isNaN(requestId)) {
      await ctx.reply('❌ شناسه نامعتبر است');
      return;
    }

    const reason = parts.slice(2).join(' ');

    const user = await usersService.findByTelegramId(ctx.from!.id);
    if (!user) {
      await ctx.reply('❌ خطا در احراز هویت');
      return;
    }

    await withdrawService.reject(requestId, user.id, reason);

    await ctx.reply(`✅ درخواست برداشت #${requestId} رد شد و موجودی به کاربر بازگشت داده شد.`);
  } catch (error) {
    logger.error('Error in admin reject command:', error);
    await ctx.reply('❌ خطا در رد درخواست: ' + (error instanceof Error ? error.message : ''));
  }
}

/**
 * /admin_paid <id> [txid] - mark withdrawal as paid
 */
export async function adminPaidCommand(ctx: Context) {
  try {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = text.split(' ');

    if (parts.length < 2) {
      await ctx.reply('❌ فرمت: /admin_paid &lt;id&gt; [txid]', { parse_mode: 'HTML' });
      return;
    }

    const requestId = parseInt(parts[1]);
    if (isNaN(requestId)) {
      await ctx.reply('❌ شناسه نامعتبر است');
      return;
    }

    const txid = parts.length > 2 ? parts[2] : undefined;

    const user = await usersService.findByTelegramId(ctx.from!.id);
    if (!user) {
      await ctx.reply('❌ خطا در احراز هویت');
      return;
    }

    await withdrawService.markPaid(requestId, user.id, txid);

    await ctx.reply(`✅ درخواست برداشت #${requestId} به عنوان پرداخت شده ثبت شد.${txid ? `\n\nTXID: <code>${txid}</code>` : ''}`, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Error in admin paid command:', error);
    await ctx.reply('❌ خطا در ثبت پرداخت: ' + (error instanceof Error ? error.message : ''));
  }
}

/**
 * /admin_createcode <amount> <uses> - create redemption code
 */
export async function adminCreateCodeCommand(ctx: Context) {
  try {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = text.split(' ');

    if (parts.length < 3) {
      await ctx.reply('❌ فرمت: /admin_createcode &lt;amount&gt; &lt;uses&gt;\n\nمثال: /admin_createcode 10 100', { parse_mode: 'HTML' });
      return;
    }

    const amount = parseFloat(parts[1]);
    const maxUses = parseInt(parts[2]);

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ مبلغ نامعتبر است');
      return;
    }

    if (isNaN(maxUses) || maxUses <= 0) {
      await ctx.reply('❌ تعداد استفاده نامعتبر است');
      return;
    }

    const user = await usersService.findByTelegramId(ctx.from!.id);
    if (!user) {
      await ctx.reply('❌ خطا در احراز هویت');
      return;
    }

    const code = await codesService.create({
      prefix: 'ADMIN',
      amount,
      usesAllowed: maxUses,
      createdBy: user.id,
    });

    await ctx.reply(
      `✅ کد با موفقیت ساخته شد!\n\n` +
      `🎟 کد: <code>${code.code}</code>\n` +
      `💰 مبلغ: ${amount}$\n` +
      `🔢 تعداد استفاده: ${maxUses}\n\n` +
      `کاربران می‌توانند با دستور زیر از این کد استفاده کنند:\n` +
      `/claim ${code.code}`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    logger.error('Error in admin create code command:', error);
    await ctx.reply('❌ خطا در ساخت کد: ' + (error instanceof Error ? error.message : ''));
  }
}

/**
 * /admin_codes - list active redemption codes
 */
export async function adminCodesCommand(ctx: Context) {
  try {
    const codes = await codesService.getActiveCodes();

    if (codes.length === 0) {
      await ctx.reply('📋 هیچ کد فعالی وجود ندارد');
      return;
    }

    let message = '🎟 <b>کدهای فعال:</b>\n\n';

    for (const code of codes) {
      const remaining = code.uses_allowed === 0 ? '∞' : (code.uses_allowed - code.uses_count).toString();
      const expiryText = code.expires_at 
        ? `\n📅 انقضا: ${new Date(code.expires_at).toLocaleString('fa-IR')}`
        : '';
      
      message += `━━━━━━━━━━━━━━━\n`;
      message += `🎟 کد: <code>${code.code}</code>\n`;
      message += `💰 مبلغ: ${code.amount}$\n`;
      message += `📊 استفاده: ${code.uses_count}/${code.uses_allowed === 0 ? '∞' : code.uses_allowed}\n`;
      message += `✨ باقیمانده: ${remaining}\n`;
      message += expiryText;
      if (code.note) {
        message += `\n📝 یادداشت: ${code.note}`;
      }
      message += `\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Error in admin codes command:', error);
    await ctx.reply('❌ خطا در دریافت لیست کدها');
  }
}

/**
 * /admin_users - show user statistics
 */
export async function adminUsersCommand(ctx: Context) {
  try {
    const stats = await usersService.getStats();
    const recentUsers = await usersService.getRecentUsers(10);

    let message = `👥 <b>آمار کاربران</b>\n\n`;
    message += `📊 کل کاربران: ${stats.totalUsers}\n`;
    message += `💰 موجودی کل: ${parseFloat(stats.totalBalance).toFixed(2)}$\n`;
    message += `💵 میانگین موجودی: ${(parseFloat(stats.totalBalance) / stats.totalUsers).toFixed(2)}$\n\n`;
    
    message += `👤 <b>آخرین کاربران:</b>\n\n`;
    
    for (const user of recentUsers) {
      message += `━━━━━━━━━━━━━━━\n`;
      message += `🆔 ID: ${user.id}\n`;
      message += `📱 Telegram ID: <code>${user.telegram_id}</code>\n`;
      if (user.username) {
        message += `� ID Name: @${user.username}\n`;
      }
      message += `�👤 نام: ${user.display_name}\n`;
      message += `💰 موجودی: ${user.balance}$\n`;
      message += `📅 عضویت: ${new Date(user.created_at).toLocaleString('fa-IR')}\n`;
      message += `\n`;
    }

    message += `\nبرای مشاهده جزئیات:\n/admin_user &lt;user_id&gt;`;

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Error in admin users command:', error);
    await ctx.reply('❌ خطا در دریافت آمار کاربران');
  }
}

/**
 * /admin_user <user_id> - show user details
 */
export async function adminUserCommand(ctx: Context) {
  try {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = text.split(' ');

    if (parts.length < 2) {
      await ctx.reply('❌ فرمت: /admin_user &lt;user_id&gt;', { parse_mode: 'HTML' });
      return;
    }

    const userId = parseInt(parts[1]);
    if (isNaN(userId)) {
      await ctx.reply('❌ شناسه کاربر نامعتبر است');
      return;
    }

    const user = await usersService.findById(userId);
    if (!user) {
      await ctx.reply('❌ کاربر یافت نشد');
      return;
    }

    // Get user's withdrawal requests
    const { requests: withdrawals } = await withdrawService.getUserRequests(userId, 1, 5);
    
    let message = `👤 <b>اطلاعات کاربر</b>\n\n`;
    message += `🆔 ID: ${user.id}\n`;
    message += `📱 Telegram ID: <code>${user.telegram_id}</code>\n`;
    message += `👤 نام: ${user.display_name}\n`;
    if (user.username) {
      message += `🔗 Username: @${user.username}\n`;
    }
    message += `💰 موجودی: ${user.balance}$\n`;
    message += `🎟 کد معرف: <code>${user.referral_code}</code>\n`;
    message += `📅 عضویت: ${new Date(user.created_at).toLocaleString('fa-IR')}\n\n`;
    
    if (withdrawals.length > 0) {
      message += `💸 <b>آخرین برداشت‌ها:</b>\n\n`;
      for (const w of withdrawals) {
        const statusEmoji = {
          pending: '⏳',
          approved: '✅',
          rejected: '❌',
          paid: '💚'
        }[w.status] || '❓';
        
        message += `${statusEmoji} #${w.id} - ${w.amount}$ (${w.status})\n`;
      }
    }

    message += `\n<b>عملیات:</b>\n`;
    message += `/admin_addbalance ${userId} &lt;amount&gt; - افزایش موجودی`;

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Error in admin user command:', error);
    await ctx.reply('❌ خطا در دریافت اطلاعات کاربر: ' + (error instanceof Error ? error.message : ''));
  }
}

/**
 * /admin_stats - show system statistics
 */
export async function adminStatsCommand(ctx: Context) {
  try {
    const [userStats, withdrawStats, codeStats] = await Promise.all([
      usersService.getStats(),
      withdrawService.getStats(),
      codesService.getStats(),
    ]);

    const message = `
📊 <b>آمار سیستم</b>

👥 <b>کاربران:</b>
• کل: ${userStats.totalUsers}
• موجودی کل: ${parseFloat(userStats.totalBalance).toFixed(2)}$

💸 <b>برداشت‌ها:</b>
• کل درخواست‌ها: ${withdrawStats.totalRequests}
• در انتظار: ${withdrawStats.pending}
• تایید شده: ${withdrawStats.approved}
• پرداخت شده: ${withdrawStats.paid}
• رد شده: ${withdrawStats.rejected}
• مجموع پرداختی: ${parseFloat(withdrawStats.totalAmount).toFixed(2)}$
• کارمزد کل: ${parseFloat(withdrawStats.totalFees).toFixed(2)}$

🎟 <b>کدها:</b>
• کدهای فعال: ${codeStats.activeCodes}
• کل استفاده: ${codeStats.totalUses}
• مجموع توزیع شده: ${parseFloat(codeStats.totalRedeemed).toFixed(2)}$
    `.trim();

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Error in admin stats command:', error);
    await ctx.reply('❌ خطا در دریافت آمار');
  }
}

/**
 * /admin_addbalance <user_id> <amount> - add balance to user
 */
export async function adminAddBalanceCommand(ctx: Context) {
  try {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = text.split(' ');

    if (parts.length < 3) {
      await ctx.reply('❌ فرمت: /admin_addbalance &lt;user_id&gt; &lt;amount&gt;\n\nمثال:\n/admin_addbalance 1 100 (افزایش)\n/admin_addbalance 1 -50 (کاهش)', { parse_mode: 'HTML' });
      return;
    }

    const userId = parseInt(parts[1]);
    const amount = parseFloat(parts[2]);

    if (isNaN(userId)) {
      await ctx.reply('❌ شناسه کاربر نامعتبر است');
      return;
    }

    if (isNaN(amount) || amount === 0) {
      await ctx.reply('❌ مبلغ نامعتبر است (نمی‌تواند صفر باشد)');
      return;
    }

    const user = await usersService.findById(userId);
    if (!user) {
      await ctx.reply('❌ کاربر یافت نشد');
      return;
    }

    // For negative amounts, use debit instead of credit
    if (amount < 0) {
      const absAmount = Math.abs(amount);
      await walletService.debit(userId, absAmount, TransactionType.ADMIN_ADJUST, {
        admin_id: ctx.from!.id,
        reason: 'Manual balance adjustment by admin (decrease)',
      });
      await ctx.reply(`✅ مبلغ ${absAmount}$ از حساب ${user.display_name} (ID: ${userId}) کسر شد.`);
    } else {
      await walletService.credit(userId, amount, TransactionType.ADMIN_ADJUST, {
        admin_id: ctx.from!.id,
        reason: 'Manual balance adjustment by admin (increase)',
      });
      await ctx.reply(`✅ مبلغ ${amount}$ به حساب ${user.display_name} (ID: ${userId}) اضافه شد.`);
    }
  } catch (error) {
    logger.error('Error in admin add balance command:', error);
    await ctx.reply('❌ خطا در افزایش موجودی: ' + (error instanceof Error ? error.message : ''));
  }
}
