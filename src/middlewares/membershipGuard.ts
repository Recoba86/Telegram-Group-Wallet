import { Context, MiddlewareFn } from 'telegraf';
import settingsService from '../services/settings';
import { CONFIG } from '../config';
import { messages } from '../handlers/messages';
import logger from '../services/logger';

/**
 * Membership verification middleware
 */
export const membershipGuard: MiddlewareFn<Context> = async (ctx, next) => {
  if (!ctx.from) {
    return;
  }

  // Get required channel from settings
  const requiredChannelId = await settingsService.get<string>(
    'REQUIRE_CHANNEL_ID',
    CONFIG.REQUIRE_CHANNEL_ID
  );

  // Skip if no channel requirement
  if (!requiredChannelId) {
    return next();
  }

  try {
    // Check if user is member of the required channel
    const chatMember = await ctx.telegram.getChatMember(requiredChannelId, ctx.from.id);
    
    const validStatuses = ['creator', 'administrator', 'member'];
    if (!validStatuses.includes(chatMember.status)) {
      await ctx.reply(messages.membershipRequired(requiredChannelId));
      return;
    }

    return next();
  } catch (error) {
    logger.error('Error checking membership:', error);
    // On error, allow the request to proceed
    return next();
  }
};
