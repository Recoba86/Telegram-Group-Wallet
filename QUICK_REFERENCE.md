# Quick Reference Guide

## 🚀 Common Commands

### Development
```bash
npm run dev          # Start in development mode with auto-reload
npm run build        # Compile TypeScript to JavaScript
npm start            # Start production build
npm test             # Run tests
npm run lint         # Check code style
```

### Database
```bash
npm run migrate                    # Run all pending migrations
npm run migrate:rollback           # Rollback last migration
npm run migrate:make migration_name  # Create new migration
npm run seed                       # Run database seeds
```

### Docker
```bash
docker-compose up -d              # Start containers in background
docker-compose down               # Stop and remove containers
docker-compose ps                 # List running containers
docker-compose logs -f            # Follow logs
docker-compose logs -f bot        # Follow bot logs only
docker-compose exec bot bash      # Access bot container shell
docker-compose restart bot        # Restart bot container
```

## 📝 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOT_TOKEN` | ✅ | - | Telegram bot token from @BotFather |
| `ADMIN_IDS` | ✅ | - | Comma-separated admin Telegram IDs |
| `ADMIN_GROUP_ID` | ✅ | - | Admin group chat ID |
| `DATABASE_URL` | Production | - | PostgreSQL connection string |
| `SQLITE_PATH` | Development | `./dev.sqlite` | SQLite database file |
| `WEB_PORT` | ❌ | `8080` | Web server port |
| `WEB_JWT_SECRET` | ✅ | - | JWT signing secret |
| `BASE_URL` | ❌ | `http://localhost:8080` | Public base URL |
| `WEBHOOK_DOMAIN` | ❌ | - | Webhook domain (if using webhooks) |
| `WITHDRAW_FEE_FIXED` | ❌ | `0.10` | Fixed withdrawal fee |
| `WITHDRAW_FEE_PERCENT` | ❌ | `2.5` | Percentage withdrawal fee |
| `DAILY_WITHDRAW_LIMIT` | ❌ | `2` | Max withdrawals per day per user |
| `MIN_WITHDRAW_AMOUNT` | ❌ | `0.10` | Minimum withdrawal amount |
| `REFERRAL_REWARD` | ❌ | `0.25` | Reward per referral |

## 🤖 Bot Commands

### User Commands
```
/start [ref_CODE]    - Register or view welcome message
/balance             - Show current balance and recent transactions
/claim CODE          - Redeem a code
/withdraw AMOUNT NETWORK ADDRESS - Request withdrawal
/history             - View transaction history
/referral            - Get referral link and stats
```

### Examples
```
/claim GIFT-ABC123
/withdraw 10.50 TRC20 TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🔌 API Endpoints

### Authentication
```http
POST /api/auth/login
Body: { telegramId: number, initData: string }
Response: { token: string, adminId: number, expiresIn: string }
```

### Users
```http
GET /api/users?page=1&limit=50&search=query
GET /api/users/stats
GET /api/users/:id
POST /api/users/:id/adjust-balance
  Body: { amount: number, reason: string }
GET /api/users/:id/transactions?page=1&limit=20
```

### Codes
```http
GET /api/codes?page=1&limit=50&prefix=GIFT&isActive=true
GET /api/codes/stats
POST /api/codes
  Body: {
    prefix: string,
    amount: number,
    usesAllowed: number,
    expiresAt?: string,
    note?: string,
    count?: number
  }
PATCH /api/codes/:id/active
  Body: { isActive: boolean }
```

### Withdrawals
```http
GET /api/withdrawals?page=1&status=pending
GET /api/withdrawals/stats
POST /api/withdrawals/:id/approve
  Body: { note?: string }
POST /api/withdrawals/:id/reject
  Body: { reason: string }
POST /api/withdrawals/:id/paid
  Body: { txid?: string }
```

### Transactions
```http
GET /api/transactions?page=1&limit=50&userId=123&type=credit
```

### Settings
```http
GET /api/settings
PUT /api/settings/:key
  Body: { value: any }
```

### Backup
```http
POST /api/backup
GET /api/backups
```

## 🗄 Database Schema Quick Ref

### users
- `id`, `telegram_id`, `username`, `display_name`
- `balance` (NUMERIC), `referral_code`, `referred_by`

### redeem_codes
- `id`, `code`, `prefix`, `amount`
- `uses_allowed`, `uses_count`, `expires_at`
- `is_active`, `created_by`

### transactions
- `id`, `user_id`, `type`, `amount`
- `balance_after`, `meta` (JSON), `created_at`

### withdraw_requests
- `id`, `user_id`, `amount`, `fee_applied`
- `target_network`, `target_address`
- `status` (pending/approved/rejected/paid)
- `processed_by`, `processed_at`

## 🔧 Troubleshooting

### Bot Not Responding
```bash
# Check if bot is running
docker-compose ps
# OR
pm2 status

# Check logs
docker-compose logs -f bot
# OR
pm2 logs telegram-wallet

# Restart
docker-compose restart bot
# OR
pm2 restart telegram-wallet
```

### Database Connection Error
```bash
# Check PostgreSQL is running
docker-compose ps db
# OR
sudo systemctl status postgresql

# Test connection
docker-compose exec db psql -U wallet_user -d telegram_wallet
# OR
psql -U wallet_user -h localhost -d telegram_wallet

# Check .env file
cat .env | grep DATABASE_URL
```

### Migration Errors
```bash
# Check current migration state
npm run knex migrate:currentVersion

# Rollback and retry
npm run migrate:rollback
npm run migrate

# Force unlock (if stuck)
# Connect to database and run:
DELETE FROM knex_migrations_lock WHERE is_locked = 1;
```

### Permission Errors
```bash
# Fix file permissions
chmod 600 .env
chmod +x setup.sh

# Fix log directory
mkdir -p logs
chmod 755 logs

# Fix backup directory
mkdir -p backups
chmod 755 backups
```

### Out of Memory
```bash
# Check memory usage
free -h
docker stats

# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Restart with Docker
docker-compose restart
```

## 📊 Useful SQL Queries

### Get Top Users by Balance
```sql
SELECT display_name, balance
FROM users
ORDER BY balance DESC
LIMIT 10;
```

### Get Today's Transactions
```sql
SELECT COUNT(*), SUM(amount)
FROM transactions
WHERE created_at >= CURRENT_DATE;
```

### Get Pending Withdrawals
```sql
SELECT w.id, u.display_name, w.amount, w.created_at
FROM withdraw_requests w
JOIN users u ON w.user_id = u.id
WHERE w.status = 'pending'
ORDER BY w.created_at;
```

### Get Most Used Codes
```sql
SELECT code, amount, uses_count
FROM redeem_codes
ORDER BY uses_count DESC
LIMIT 10;
```

### Get User Stats
```sql
SELECT
  COUNT(*) as total_users,
  SUM(balance) as total_balance,
  AVG(balance) as avg_balance
FROM users;
```

## 🔐 Security Best Practices

1. **Never commit `.env`** to git
2. **Use strong JWT secret** (min 32 random chars)
3. **Enable HTTPS** in production (Let's Encrypt)
4. **Restrict admin IDs** to trusted users only
5. **Regular backups** (test restoration)
6. **Monitor logs** for suspicious activity
7. **Update dependencies** regularly
8. **Use firewall** (UFW/iptables)
9. **Disable root SSH** access
10. **Use SSH keys** instead of passwords

## 📞 Getting Help

- 📖 Read `README.md` for full documentation
- 🏗 Check `ARCHITECTURE.md` for system design
- ✅ Use `DEPLOYMENT_CHECKLIST.md` for deployment
- 🐛 Check issues on GitHub
- 💬 Ask in discussions

## 🎯 Performance Tips

1. **Database Indexes**: Already created on frequently queried columns
2. **Connection Pooling**: Configured (min: 2, max: 10)
3. **Rate Limiting**: Adjust based on load
4. **Caching**: Consider Redis for high traffic
5. **Pagination**: Always use pagination in admin panel
6. **Backups**: Schedule during low-traffic hours

## 📈 Monitoring

### Key Metrics to Watch
- Response time (should be < 1s)
- Error rate (should be < 1%)
- Database size (plan for growth)
- Disk space (keep > 20% free)
- Memory usage (keep < 80%)
- Active users count
- Transaction volume
- Pending withdrawals

### Log Locations
- Development: Console output
- Production (Docker): `docker-compose logs`
- Production (PM2): `~/.pm2/logs/`
- Application logs: `./logs/`

---

**Quick Start**: `bash setup.sh` → Edit `.env` → `npm run dev`

**Production**: `docker-compose up -d` → Configure bot menu → Done! ✅
