import knex, { Knex } from 'knex';
import { CONFIG } from '../config';
import knexConfig from './knexfile';

let db: Knex;

export function initDatabase(): Knex {
  if (db) {
    return db;
  }

  const environment = CONFIG.IS_PRODUCTION ? 'production' : 'development';
  const config = knexConfig[environment];

  db = knex(config);

  return db;
}

export function getDatabase(): Knex {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
  }
}

// Types
export interface User {
  id: number;
  telegram_id: number;
  username: string | null;
  display_name: string;
  balance: string; // NUMERIC as string
  referral_code: string;
  referred_by: string | null;
  created_at: Date;
}

export interface RedeemCode {
  id: number;
  code: string;
  prefix: string;
  amount: string; // NUMERIC as string
  uses_allowed: number; // 0 = unlimited
  uses_count: number;
  expires_at: Date | null;
  note: string | null;
  created_by: number;
  is_active: boolean;
  created_at: Date;
}

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  REDEEM = 'redeem',
  WITHDRAW_RESERVE = 'withdraw_reserve',
  WITHDRAW_PAID = 'withdraw_paid',
  ADMIN_ADJUST = 'admin_adjust',
  REFERRAL_BONUS = 'referral_bonus',
}

export interface Transaction {
  id: number;
  user_id: number;
  type: TransactionType;
  amount: string; // NUMERIC as string
  balance_after: string; // NUMERIC as string
  meta: Record<string, any>;
  created_at: Date;
}

export enum WithdrawStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
}

export interface WithdrawRequest {
  id: number;
  user_id: number;
  amount: string; // NUMERIC as string
  fee_applied: string; // NUMERIC as string
  target_network: string;
  target_address: string;
  status: WithdrawStatus;
  admin_note: string | null;
  processed_at: Date | null;
  processed_by: number | null;
  created_at: Date;
}

export interface Setting {
  key: string;
  value: any; // JSONB
  updated_at: Date;
}

export interface Referral {
  id: number;
  referrer_user_id: number;
  referred_user_id: number;
  reward: string; // NUMERIC as string
  created_at: Date;
}

export interface AuditLog {
  id: number;
  admin_id: number;
  action: string;
  target_type: string | null;
  target_id: number | null;
  details: Record<string, any>;
  created_at: Date;
}
