import { Telegraf } from 'telegraf';
import { CONFIG } from './config';
import {
  startCommand,
  balanceCommand,
  claimCommand,
  withdrawCommand,
  historyCommand,
  referralCommand,
} from './handlers/commands';
import { membershipGuard } from './middlewares/membershipGuard';
import { createRateLimiter } from './middlewares/rateLimit';
import notificationService from './services/notifications';
import settingsService from './services/settings';
import logger from './services/logger';

export async function createBot(): Promise<Telegraf> {
  const bot = new Telegraf(CONFIG.BOT_TOKEN);

  // Initialize notification service
  notificationService.initialize(bot);

  // Create rate limiters
  const claimRateLimit = async (ctx: any, next: any) => {
    const maxRequests = await settingsService.get<number>(
      'RATE_LIMIT_CLAIM_REQUESTS',
      CONFIG.RATE_LIMIT_CLAIM_REQUESTS
    );
    const windowMs = await settingsService.get<number>(
      'RATE_LIMIT_CLAIM_WINDOW_MS',
      CONFIG.RATE_LIMIT_CLAIM_WINDOW_MS
    );
    return createRateLimiter(maxRequests, windowMs, 'claim')(ctx, next);
  };

  const withdrawRateLimit = async (ctx: any, next: any) => {
    const maxRequests = await settingsService.get<number>(
      'RATE_LIMIT_WITHDRAW_REQUESTS',
      CONFIG.RATE_LIMIT_WITHDRAW_REQUESTS
    );
    const windowMs = await settingsService.get<number>(
      'RATE_LIMIT_WITHDRAW_WINDOW_MS',
      CONFIG.RATE_LIMIT_WITHDRAW_WINDOW_MS
    );
    return createRateLimiter(maxRequests, windowMs, 'withdraw')(ctx, next);
  };

  // Commands
  bot.command('start', startCommand);
  bot.command('balance', balanceCommand);
  bot.command('claim', membershipGuard, claimRateLimit, claimCommand);
  bot.command('withdraw', membershipGuard, withdrawRateLimit, withdrawCommand);
  bot.command('history', historyCommand);
  bot.command('referral', referralCommand);
  
  // Temporary command to get chat ID (for admin group setup)
  bot.command('chatid', (ctx) => {
    const chatId = ctx.chat.id;
    const chatType = ctx.chat.type;
    ctx.reply(`📋 Chat Info:\nID: <code>${chatId}</code>\nType: ${chatType}`, { parse_mode: 'HTML' });
  });

  // Error handling
  bot.catch((err: any, ctx: any) => {
    logger.error('Bot error:', err);
    ctx.reply('❌ خطایی رخ داد! لطفا دوباره امتحان کنید.');
  });

  return bot;
}

export async function startBot(bot: Telegraf): Promise<void> {
  if (CONFIG.WEBHOOK_DOMAIN) {
    // Webhook mode
    const webhookUrl = `${CONFIG.WEBHOOK_DOMAIN}${CONFIG.WEBHOOK_PATH}`;
    await bot.telegram.setWebhook(webhookUrl);
    logger.info(`Bot started in webhook mode: ${webhookUrl}`);
  } else {
    // Long polling mode
    await bot.launch();
    logger.info('Bot started in long polling mode');
  }

  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
