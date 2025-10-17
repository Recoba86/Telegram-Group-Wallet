import { Knex } from 'knex';
import { CONFIG } from '../../config';

export async function seed(knex: Knex): Promise<void> {
  // Seed default settings
  await knex('settings').del();
  
  const defaultSettings = [
    {
      key: 'WITHDRAW_FEE_FIXED',
      value: JSON.stringify(CONFIG.WITHDRAW_FEE_FIXED),
    },
    {
      key: 'WITHDRAW_FEE_PERCENT',
      value: JSON.stringify(CONFIG.WITHDRAW_FEE_PERCENT),
    },
    {
      key: 'DAILY_WITHDRAW_LIMIT',
      value: JSON.stringify(CONFIG.DAILY_WITHDRAW_LIMIT),
    },
    {
      key: 'MIN_WITHDRAW_AMOUNT',
      value: JSON.stringify(CONFIG.MIN_WITHDRAW_AMOUNT),
    },
    {
      key: 'MIN_TX_AMOUNT',
      value: JSON.stringify(CONFIG.MIN_TX_AMOUNT),
    },
    {
      key: 'REFERRAL_REWARD',
      value: JSON.stringify(CONFIG.REFERRAL_REWARD),
    },
    {
      key: 'DEFAULT_CALENDAR',
      value: JSON.stringify(CONFIG.DEFAULT_CALENDAR),
    },
    {
      key: 'REQUIRE_CHANNEL_ID',
      value: JSON.stringify(CONFIG.REQUIRE_CHANNEL_ID),
    },
    {
      key: 'BACKUP_CRON',
      value: JSON.stringify(CONFIG.BACKUP_CRON),
    },
    {
      key: 'RATE_LIMIT_CLAIM_REQUESTS',
      value: JSON.stringify(CONFIG.RATE_LIMIT_CLAIM_REQUESTS),
    },
    {
      key: 'RATE_LIMIT_CLAIM_WINDOW_MS',
      value: JSON.stringify(CONFIG.RATE_LIMIT_CLAIM_WINDOW_MS),
    },
    {
      key: 'RATE_LIMIT_WITHDRAW_REQUESTS',
      value: JSON.stringify(CONFIG.RATE_LIMIT_WITHDRAW_REQUESTS),
    },
    {
      key: 'RATE_LIMIT_WITHDRAW_WINDOW_MS',
      value: JSON.stringify(CONFIG.RATE_LIMIT_WITHDRAW_WINDOW_MS),
    },
  ];

  await knex('settings').insert(defaultSettings);
}
