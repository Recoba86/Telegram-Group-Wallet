# System Architecture

## High-Level Overview

```
┌─────────────────┐
│  Telegram User  │
└────────┬────────┘
         │
         │ Commands (/start, /balance, etc.)
         ▼
┌─────────────────────────────────────┐
│        Telegraf Bot                 │
│  ┌──────────────────────────────┐  │
│  │  Middlewares                 │  │
│  │  - Rate Limiter              │  │
│  │  - Membership Guard          │  │
│  │  - Admin Guard               │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  Command Handlers            │  │
│  │  - /start → startCommand     │  │
│  │  - /balance → balanceCommand │  │
│  │  - /claim → claimCommand     │  │
│  │  - /withdraw → withdrawCmd   │  │
│  └──────────────────────────────┘  │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│        Service Layer                │
│  ┌──────────────────────────────┐  │
│  │ users.ts    │ wallet.ts      │  │
│  │ codes.ts    │ withdraw.ts    │  │
│  │ referral.ts │ settings.ts    │  │
│  │ backup.ts   │ notifications  │  │
│  └──────────────────────────────┘  │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│     Database (Knex ORM)             │
│  ┌──────────────────────────────┐  │
│  │ PostgreSQL (Production)      │  │
│  │ SQLite (Development)         │  │
│  │                              │  │
│  │ Tables:                      │  │
│  │ - users                      │  │
│  │ - redeem_codes               │  │
│  │ - transactions               │  │
│  │ - withdraw_requests          │  │
│  │ - referrals                  │  │
│  │ - settings                   │  │
│  │ - audit_logs                 │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘


┌─────────────────┐
│  Admin (WebApp) │
└────────┬────────┘
         │
         │ HTTPS/JWT Auth
         ▼
┌─────────────────────────────────────┐
│      Express REST API               │
│  ┌──────────────────────────────┐  │
│  │  Authentication Middleware   │  │
│  │  - JWT Verification          │  │
│  │  - Admin Allowlist Check     │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  API Routes                  │  │
│  │  - /api/users                │  │
│  │  - /api/codes                │  │
│  │  - /api/withdrawals          │  │
│  │  - /api/transactions         │  │
│  │  - /api/settings             │  │
│  │  - /api/backup               │  │
│  └──────────────────────────────┘  │
└─────────────┬───────────────────────┘
              │
              └──────────► Service Layer
```

## Transaction Flow

### Code Redemption Flow

```
User sends /claim CODE
         │
         ▼
┌─────────────────────┐
│  claimCommand       │
│  (handlers)         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  codesService.claim │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Database Transaction       │
│  1. Lock code row (SELECT   │
│     FOR UPDATE)             │
│  2. Validate code           │
│  3. Lock user row           │
│  4. Credit balance          │
│  5. Increment uses_count    │
│  6. Create transaction log  │
│  COMMIT/ROLLBACK            │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────┐
│  Notify User        │
│  (Telegram message) │
└─────────────────────┘
```

### Withdrawal Flow

```
User sends /withdraw AMOUNT NETWORK ADDRESS
         │
         ▼
┌────────────────────────┐
│  withdrawCommand       │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  withdrawService       │
│  .create()             │
└──────┬─────────────────┘
       │
       ▼
┌───────────────────────────────┐
│  Database Transaction         │
│  1. Check daily limit         │
│  2. Calculate fee             │
│  3. Lock user row             │
│  4. Debit amount (RESERVE)    │
│  5. Create withdraw_request   │
│     status: PENDING           │
│  COMMIT                       │
└──────┬────────────────────────┘
       │
       ├──► Notify Admin Group
       └──► Notify User
       
       ┌─────────────────┐
       │ Admin Approves  │
       └──────┬──────────┘
              │
              ▼
       ┌─────────────────────┐
       │  Status: APPROVED   │
       │  (ready for payout) │
       └──────┬──────────────┘
              │
              ▼
       ┌─────────────────────┐
       │  Admin Marks PAID   │
       │  (txid provided)    │
       └──────┬──────────────┘
              │
              ├──► Create WITHDRAW_PAID transaction
              └──► Notify User: Success

       ┌─────────────────┐
       │ Admin Rejects   │
       └──────┬──────────┘
              │
              ▼
       ┌─────────────────────────┐
       │  Database Transaction   │
       │  1. Credit refund       │
       │  2. Status: REJECTED    │
       │  COMMIT                 │
       └──────┬──────────────────┘
              │
              └──► Notify User: Refunded
```

## Data Flow Diagram

```
┌──────────────┐
│   New User   │
│  /start ref_ │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  Create User         │
│  - Generate unique   │
│    referral_code     │
│  - Store referred_by │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Process Referral    │
│  - Find referrer     │
│  - Credit bonus      │
│  - Create referral   │
│    record            │
└──────────────────────┘
```

## Security Layers

```
Request
  │
  ├─► Rate Limiter
  │   └─► Check request count per time window
  │       └─► Block if exceeded
  │
  ├─► Membership Guard (Optional)
  │   └─► Check channel/group membership
  │       └─► Deny if not member
  │
  ├─► Admin Guard (Admin endpoints only)
  │   └─► Check user ID in admin allowlist
  │       └─► Deny if not admin
  │
  ├─► JWT Auth (API endpoints)
  │   └─► Verify token signature
  │       └─► Check expiration
  │           └─► Deny if invalid
  │
  └─► Database Transaction with Locking
      └─► SELECT ... FOR UPDATE
          └─► Prevents race conditions
```

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│           Ubuntu VPS / Server           │
│                                         │
│  ┌────────────────────────────────┐    │
│  │  Nginx (Reverse Proxy)         │    │
│  │  - SSL/TLS (Let's Encrypt)     │    │
│  │  - Port 80/443                 │    │
│  └────────┬───────────────────────┘    │
│           │                             │
│           ▼                             │
│  ┌────────────────────────────────┐    │
│  │  Docker Container: bot         │    │
│  │  - Node.js + TypeScript        │    │
│  │  - Telegraf Bot                │    │
│  │  - Express API                 │    │
│  │  - Port 8080 (internal)        │    │
│  └────────┬───────────────────────┘    │
│           │                             │
│           ▼                             │
│  ┌────────────────────────────────┐    │
│  │  Docker Container: db          │    │
│  │  - PostgreSQL 16               │    │
│  │  - Port 5432 (internal)        │    │
│  │  - Volume: postgres_data       │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │  Docker Volume: backups        │    │
│  │  - SQL dumps                   │    │
│  │  - Cron scheduled              │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Concurrency Handling

### Problem: Race Conditions

```
User A: Balance = 100
User B: Balance = 100

Thread 1              Thread 2
READ balance (100)    READ balance (100)
DEDUCT 50            DEDUCT 60
WRITE 50             WRITE 40  ← Wrong!
```

### Solution: Row-Level Locking

```
User A: Balance = 100

Thread 1                    Thread 2
BEGIN TRANSACTION          BEGIN TRANSACTION
SELECT ... FOR UPDATE      (BLOCKED - waits)
balance = 100              ...
DEDUCT 50                  ...
UPDATE balance = 50        ...
COMMIT                     (UNBLOCKED)
                          SELECT ... FOR UPDATE
                          balance = 50 ← Correct!
                          DEDUCT 60 → Error (insufficient)
```

## Backup Strategy

```
Cron Schedule (e.g., "0 2 * * *")
         │
         ▼
┌─────────────────────┐
│  backupService      │
│  .createBackup()    │
└──────┬──────────────┘
       │
       ├─► PostgreSQL: pg_dump
       │   └─► /backups/backup-2025-01-18.sql
       │
       └─► SQLite: File copy
           └─► /backups/backup-2025-01-18.sqlite
       
       ▼
┌─────────────────────┐
│  .cleanOldBackups() │
│  Keep last 10       │
└─────────────────────┘
```

## Monitoring & Logging

```
┌──────────────────┐
│  Winston Logger  │
└────────┬─────────┘
         │
         ├─► Console (Development)
         │
         ├─► logs/error.log (Errors only)
         │
         └─► logs/combined.log (All logs)

┌──────────────────┐
│  Audit Service   │
└────────┬─────────┘
         │
         └─► audit_logs table
             - Admin actions
             - Target type/ID
             - Timestamp
             - Details (JSON)
```

---

This architecture ensures:
- ✅ **Scalability**: Horizontal scaling possible
- ✅ **Security**: Multiple security layers
- ✅ **Reliability**: Transaction safety with locking
- ✅ **Maintainability**: Modular service layer
- ✅ **Observability**: Comprehensive logging & audit trail
