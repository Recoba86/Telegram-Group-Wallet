import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Users table
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.bigInteger('telegram_id').notNullable().unique();
    table.string('username', 255);
    table.string('display_name', 255).notNullable();
    table.decimal('balance', 18, 2).notNullable().defaultTo(0);
    table.string('referral_code', 50).notNullable().unique();
    table.string('referred_by', 50);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['telegram_id']);
    table.index(['referral_code']);
  });

  // Redeem codes table
  await knex.schema.createTable('redeem_codes', (table) => {
    table.increments('id').primary();
    table.string('code', 100).notNullable().unique();
    table.string('prefix', 50).notNullable();
    table.decimal('amount', 18, 2).notNullable();
    table.integer('uses_allowed').notNullable().defaultTo(1); // 0 = unlimited
    table.integer('uses_count').notNullable().defaultTo(0);
    table.timestamp('expires_at');
    table.text('note');
    table.bigInteger('created_by').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['code']);
    table.index(['is_active']);
    table.index(['prefix']);
  });

  // Transactions table
  await knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', [
      'credit',
      'debit',
      'redeem',
      'withdraw_reserve',
      'withdraw_paid',
      'admin_adjust',
      'referral_bonus'
    ]).notNullable();
    table.decimal('amount', 18, 2).notNullable();
    table.decimal('balance_after', 18, 2).notNullable();
    table.json('meta').notNullable().defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['user_id']);
    table.index(['type']);
    table.index(['created_at']);
  });

  // Withdraw requests table
  await knex.schema.createTable('withdraw_requests', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('amount', 18, 2).notNullable();
    table.decimal('fee_applied', 18, 2).notNullable();
    table.string('target_network', 50).notNullable();
    table.string('target_address', 255).notNullable();
    table.enum('status', ['pending', 'approved', 'rejected', 'paid']).notNullable().defaultTo('pending');
    table.text('admin_note');
    table.timestamp('processed_at');
    table.bigInteger('processed_by');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['user_id']);
    table.index(['status']);
    table.index(['created_at']);
  });

  // Settings table
  await knex.schema.createTable('settings', (table) => {
    table.string('key', 100).primary();
    table.json('value').notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Referrals table
  await knex.schema.createTable('referrals', (table) => {
    table.increments('id').primary();
    table.integer('referrer_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('referred_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('reward', 18, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['referrer_user_id']);
    table.index(['referred_user_id']);
    table.unique(['referred_user_id']); // Each user can only be referred once
  });

  // Audit logs table
  await knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.bigInteger('admin_id').notNullable();
    table.string('action', 100).notNullable();
    table.string('target_type', 50);
    table.integer('target_id');
    table.json('details').notNullable().defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['admin_id']);
    table.index(['action']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('referrals');
  await knex.schema.dropTableIfExists('settings');
  await knex.schema.dropTableIfExists('withdraw_requests');
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('redeem_codes');
  await knex.schema.dropTableIfExists('users');
}
