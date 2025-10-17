import { Context, MiddlewareFn } from 'telegraf';
import { messages } from '../handlers/messages';

// Simple in-memory rate limiter
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Create a rate limit middleware
 */
export function createRateLimiter(
  maxRequests: number,
  windowMs: number,
  keyPrefix: string
): MiddlewareFn<Context> {
  return async (ctx, next) => {
    if (!ctx.from) {
      return next();
    }

    const key = `${keyPrefix}:${ctx.from.id}`;
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    // Clean up expired entry
    if (entry && entry.resetAt < now) {
      rateLimitStore.delete(key);
      entry = undefined;
    }

    if (!entry) {
      // First request in window
      entry = {
        count: 1,
        resetAt: now + windowMs,
      };
      rateLimitStore.set(key, entry);
      return next();
    }

    if (entry.count >= maxRequests) {
      await ctx.reply(messages.rateLimitExceeded());
      return;
    }

    // Increment counter
    entry.count++;
    rateLimitStore.set(key, entry);
    
    return next();
  };
}

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute
