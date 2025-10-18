import { Context } from 'telegraf';
import usersService from '../services/users';
import walletService from '../services/wallet';
import codesService from '../services/codes';
import withdrawService from '../services/withdraw';
import referralService from '../services/referral';
import notificationService from '../services/notifications';
import { messages } from './messages';
import { CONFIG } from '../config';
import logger from '../services/logger';

/**
 * /start command handler
 */
export async function startCommand(ctx: Context) {
  try {
    if (!ctx.from) return;

    const telegramId = ctx.from.id;
    const username = ctx.from.username || null;
    const displayName = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

    // Check if user exists
    let user = await usersService.findByTelegramId(telegramId);
    
    // Extract referral code from start parameter
    const startParam = ctx.message && 'text' in ctx.message 
      ? ctx.message.text.split(' ')[1] 
      : undefined;
    const referralCode = startParam?.startsWith('ref_') ? startParam.substring(4) : undefined;

    if (!user) {
      // Create new user
      user = await usersService.create({
        telegramId,
        username: username || undefined,
        displayName,
        referredBy: referralCode,
      });

      // Process referral if exists
      if (referralCode) {
        await referralService.processReferral(referralCode, user.id);
      }

      logger.info(`New user registered: ${telegramId} (${displayName})`);
    }

    await ctx.reply(
      messages.welcome(ctx.from.first_name, user.referral_code, CONFIG.BASE_URL),
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    logger.error('Error in start command:', error);
    await ctx.reply(messages.error());
  }
}

/**
 * /balance command handler
 */
export async function balanceCommand(ctx: Context) {
  try {
    if (!ctx.from) return;

    const user = await usersService.findByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply('لطفا ابتدا /start را بزنید');
      return;
    }

    const balance = parseFloat(user.balance);
    const transactions = await walletService.getLastTransactions(user.id, 5);

    await ctx.reply(
      messages.balanceWithTransactions(balance, transactions),
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    logger.error('Error in balance command:', error);
    await ctx.reply(messages.error());
  }
}

/**
 * /claim command handler
 */
export async function claimCommand(ctx: Context) {
  try {
    if (!ctx.from) return;

    const user = await usersService.findByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply('لطفا ابتدا /start را بزنید');
      return;
    }

    // Extract code from message
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = text.split(' ');
    
    if (parts.length < 2) {
      await ctx.reply(messages.claimPrompt(), { parse_mode: 'HTML' });
      return;
    }

    const code = parts[1].trim().toUpperCase();
    
    // Claim the code
    const result = await codesService.claim(code, user.id);
    
    if (result.success) {
      await ctx.reply(result.message, { parse_mode: 'HTML' });
      
      // Notify user
      if (result.amount) {
        const updatedUser = await usersService.findById(user.id);
        if (updatedUser) {
          await notificationService.notifyCodeClaim(ctx.from.id, {
            code,
            amount: result.amount,
            newBalance: parseFloat(updatedUser.balance),
          });
        }
      }
    } else {
      await ctx.reply(result.message);
    }
  } catch (error) {
    logger.error('Error in claim command:', error);
    await ctx.reply(messages.error());
  }
}

/**
 * /withdraw command handler
 */
export async function withdrawCommand(ctx: Context) {
  const fs = require('fs');
  try {
    fs.appendFileSync('/app/logs/withdraw-debug.log', `\n=== WITHDRAW COMMAND CALLED ===\n[${new Date().toISOString()}] From: ${ctx.from?.id}\n`);
    
    if (!ctx.from) return;

    const user = await usersService.findByTelegramId(ctx.from.id);
    fs.appendFileSync('/app/logs/withdraw-debug.log', `[${new Date().toISOString()}] User found: ${user?.id}\n`);
    
    if (!user) {
      await ctx.reply('لطفا ابتدا /start را بزنید');
      return;
    }

    // Extract parameters
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = text.split(' ').filter(p => p.trim());
    fs.appendFileSync('/app/logs/withdraw-debug.log', `[${new Date().toISOString()}] Parts: ${JSON.stringify(parts)}\n`);
    
    if (parts.length < 3) {
      await ctx.reply(messages.withdrawPrompt(), { parse_mode: 'HTML' });
      return;
    }

    const amount = parseFloat(parts[1]);
    const address = parts[2];
    const network = 'TON'; // Always use TON network
    
    fs.appendFileSync('/app/logs/withdraw-debug.log', `[${new Date().toISOString()}] Amount: ${amount}, Address: ${address}\n`);

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ مبلغ نامعتبر است');
      return;
    }

    // Validate TON address (basic check)
    if (!address || address.length < 48) {
      await ctx.reply('❌ آدرس TON نامعتبر است\n\nآدرس باید 48 کاراکتر یا بیشتر باشد');
      return;
    }

    // Show fee info
    fs.appendFileSync('/app/logs/withdraw-debug.log', `[${new Date().toISOString()}] About to calculate fee\n`);
    const feeInfo = await withdrawService.calculateFee(amount);
    fs.appendFileSync('/app/logs/withdraw-debug.log', `[${new Date().toISOString()}] Fee calculated: ${feeInfo.fee}\n`);
    
    // Create withdraw request
    fs.appendFileSync('/app/logs/withdraw-debug.log', `[${new Date().toISOString()}] About to create withdrawal\n`);
    const result = await withdrawService.create({
      userId: user.id,
      amount,
      targetNetwork: network,
      targetAddress: address,
    });
    fs.appendFileSync('/app/logs/withdraw-debug.log', `[${new Date().toISOString()}] Withdrawal result: ${JSON.stringify(result)}\n`);

    if (result.success && result.request) {
      await ctx.reply(result.message, { parse_mode: 'HTML' });
      
      // Notify admins
      await notificationService.notifyNewWithdrawRequest({
        requestId: result.request.id,
        userId: user.id,
        username: user.display_name,
        amount,
        fee: feeInfo.fee,
        network,
        address,
      });
    } else {
      await ctx.reply(result.message, { parse_mode: 'HTML' });
    }
  } catch (error) {
    fs.appendFileSync('/app/logs/withdraw-debug.log', `[${new Date().toISOString()}] COMMAND ERROR: ${error}\n`);
    if (error instanceof Error) {
      fs.appendFileSync('/app/logs/withdraw-debug.log', `[${new Date().toISOString()}] Error message: ${error.message}\nStack: ${error.stack}\n`);
    }
    logger.error('Error in withdraw command:', error);
    await ctx.reply(messages.error());
  }
}

/**
 * /history command handler
 */
export async function historyCommand(ctx: Context) {
  try {
    if (!ctx.from) return;

    const user = await usersService.findByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply('لطفا ابتدا /start را بزنید');
      return;
    }

    const page = 1;
    const limit = 10;
    const { transactions, total } = await walletService.getTransactions(user.id, page, limit);
    const totalPages = Math.ceil(total / limit);

    await ctx.reply(
      messages.history(transactions, page, totalPages),
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    logger.error('Error in history command:', error);
    await ctx.reply(messages.error());
  }
}

/**
 * /referral command handler
 */
export async function referralCommand(ctx: Context) {
  try {
    if (!ctx.from) return;

    const user = await usersService.findByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply('لطفا ابتدا /start را بزنید');
      return;
    }

    const stats = await referralService.getUserStats(user.id);
    const rewardAmount = CONFIG.REFERRAL_REWARD;

    await ctx.reply(
      messages.referralInfo(
        user.referral_code,
        CONFIG.BASE_URL,
        stats.totalReferrals,
        parseFloat(stats.totalRewards),
        rewardAmount
      ),
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    logger.error('Error in referral command:', error);
    await ctx.reply(messages.error());
  }
}
