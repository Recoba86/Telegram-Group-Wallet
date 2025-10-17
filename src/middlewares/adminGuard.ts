import { Context, MiddlewareFn } from 'telegraf';
import { CONFIG } from '../config';
import { messages } from '../handlers/messages';

/**
 * Admin guard middleware - only allows admins
 */
export const adminGuard: MiddlewareFn<Context> = async (ctx, next) => {
  if (!ctx.from) {
    return;
  }

  if (!CONFIG.ADMIN_IDS.includes(ctx.from.id)) {
    await ctx.reply(messages.notAuthorized());
    return;
  }

  return next();
};

/**
 * Check if admin
 */
export function isAdmin(userId: number): boolean {
  return CONFIG.ADMIN_IDS.includes(userId);
}
