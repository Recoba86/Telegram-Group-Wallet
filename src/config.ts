import { config } from 'dotenv';

config();

export const CONFIG = {
  // Bot
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  ADMIN_IDS: process.env.ADMIN_IDS?.split(',').map(id => parseInt(id.trim())) || [],
  ADMIN_GROUP_ID: parseInt(process.env.ADMIN_GROUP_ID || '0'),
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  SQLITE_PATH: process.env.SQLITE_PATH || './dev.sqlite',
  USE_SQLITE: !process.env.DATABASE_URL,
  
  // Web
  WEB_PORT: parseInt(process.env.WEB_PORT || '8080'),
  WEB_JWT_SECRET: process.env.WEB_JWT_SECRET || 'change-me-in-production',
  BASE_URL: process.env.BASE_URL || 'http://localhost:8080',
  
  // Webhook
  WEBHOOK_DOMAIN: process.env.WEBHOOK_DOMAIN || '',
  WEBHOOK_PATH: process.env.WEBHOOK_PATH || '/webhook',
  
  // Operational defaults
  WITHDRAW_FEE_FIXED: parseFloat(process.env.WITHDRAW_FEE_FIXED || '0.10'),
  WITHDRAW_FEE_PERCENT: parseFloat(process.env.WITHDRAW_FEE_PERCENT || '2.5'),
  DAILY_WITHDRAW_LIMIT: parseInt(process.env.DAILY_WITHDRAW_LIMIT || '2'),
  MIN_WITHDRAW_AMOUNT: parseFloat(process.env.MIN_WITHDRAW_AMOUNT || '0.10'),
  MIN_TX_AMOUNT: parseFloat(process.env.MIN_TX_AMOUNT || '0.01'),
  
  // Referral
  REFERRAL_REWARD: parseFloat(process.env.REFERRAL_REWARD || '0.25'),
  
  // Calendar
  DEFAULT_CALENDAR: (process.env.DEFAULT_CALENDAR || 'jalali') as 'jalali' | 'gregorian',
  
  // Channel membership
  REQUIRE_CHANNEL_ID: process.env.REQUIRE_CHANNEL_ID || '',
  
  // Backup
  BACKUP_CRON: process.env.BACKUP_CRON || '0 2 * * *',
  BACKUP_PATH: process.env.BACKUP_PATH || './backups',
  
  // Rate limits
  RATE_LIMIT_CLAIM_REQUESTS: parseInt(process.env.RATE_LIMIT_CLAIM_REQUESTS || '5'),
  RATE_LIMIT_CLAIM_WINDOW_MS: parseInt(process.env.RATE_LIMIT_CLAIM_WINDOW_MS || '60000'),
  RATE_LIMIT_WITHDRAW_REQUESTS: parseInt(process.env.RATE_LIMIT_WITHDRAW_REQUESTS || '3'),
  RATE_LIMIT_WITHDRAW_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WITHDRAW_WINDOW_MS || '3600000'),
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};

// Validation
if (!CONFIG.BOT_TOKEN) {
  throw new Error('BOT_TOKEN is required');
}

if (CONFIG.ADMIN_IDS.length === 0) {
  throw new Error('ADMIN_IDS is required');
}
