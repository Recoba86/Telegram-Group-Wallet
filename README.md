# Telegram Group Wallet Bot

A production-ready Telegram Bot with WebApp admin panel for managing virtual wallets, redeem codes, withdrawals, and referrals. Built with Node.js, TypeScript, Telegraf, Express, and PostgreSQL.

## 🌟 Features

### User Features (Persian/RTL Interface)
- 💰 **Virtual Wallet**: Per-user USD balance with transaction history
- 🎟️ **Redeem Codes**: Single-use and multi-use codes with expiration
- 💸 **Withdrawals**: Request withdrawals with configurable fees and daily limits
- 👥 **Referral System**: Invite friends and earn rewards
- 📊 **Transaction History**: View all wallet activities
- 🔒 **Security**: Rate limiting, membership verification, audit logging

### Admin Features (WebApp Dashboard)
- 👤 **User Management**: Search, view profiles, adjust balances
- 🎫 **Code Management**: Create/revoke codes, bulk generation, CSV export
- 💳 **Withdrawal Management**: Approve/reject/process withdrawals
- 📈 **Reports & Analytics**: Daily/weekly/monthly statistics
- ⚙️ **Settings Panel**: Configure ALL limits/fees without code changes
- 🗄️ **Backup System**: Automated and manual database backups
- 📝 **Audit Logs**: Track all admin actions

## 🛠 Tech Stack

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript
- **Bot Framework**: Telegraf
- **Web Framework**: Express
- **Database**: PostgreSQL (production), SQLite (development)
- **ORM**: Knex.js
- **Deployment**: Docker + docker-compose

## 📋 Prerequisites

- Node.js >= 20.0.0
- PostgreSQL 16+ (production) or SQLite (development)
- Docker & docker-compose (for containerized deployment)
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/telegram-group-wallet.git
cd telegram-group-wallet
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Required
BOT_TOKEN=your_bot_token_from_botfather
ADMIN_IDS=123456789,987654321
ADMIN_GROUP_ID=-1001234567890
WEB_JWT_SECRET=your-secret-key-change-in-production

# Database (choose one)
DATABASE_URL=postgresql://user:password@localhost:5432/telegram_wallet
# OR for development
SQLITE_PATH=./dev.sqlite

# Optional
WEB_PORT=8080
BASE_URL=https://yourdomain.com
WEBHOOK_DOMAIN=https://yourdomain.com
```

### 4. Run Migrations

```bash
npm run migrate
npm run seed  # Load default settings
```

### 5. Start Development Server

```bash
npm run dev
```

The bot will start in long-polling mode, and the web server will be available at `http://localhost:8080`.

## 🐳 Docker Deployment

### Production Deployment with Docker

1. **Create `.env` file** with your configuration (see `.env.example`)

2. **Update `docker-compose.yml`** with your database password:

```yaml
environment:
  POSTGRES_PASSWORD: your_secure_password
  DB_PASSWORD: your_secure_password
```

3. **Build and start containers**:

```bash
docker-compose up -d
```

4. **Check logs**:

```bash
docker-compose logs -f bot
```

5. **Run migrations** (first time only):

```bash
docker-compose exec bot npm run migrate
docker-compose exec bot npm run seed
```

### Container Management

```bash
# Stop containers
docker-compose stop

# Restart containers
docker-compose restart

# View logs
docker-compose logs -f

# Remove containers
docker-compose down

# Remove with volumes (WARNING: deletes data)
docker-compose down -v
```

## 🌐 Nginx Reverse Proxy (Optional)

For production with custom domain and HTTPS:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable SSL with Let's Encrypt:

```bash
sudo certbot --nginx -d yourdomain.com
```

## 📱 Bot Commands

### User Commands (in Telegram)

- `/start` - Start the bot and register
- `/balance` - View current balance and recent transactions
- `/claim <code>` - Redeem a code (e.g., `/claim GIFT-ABC123`)
- `/withdraw <amount> <network> <address>` - Request withdrawal (e.g., `/withdraw 10.50 TRC20 TXxxx...`)
- `/history` - View transaction history
- `/referral` - Get referral link and statistics

### Admin Commands (via WebApp)

Access the admin panel at: `https://yourdomain.com/admin`

## 🎨 Admin WebApp

The admin panel is a Telegram WebApp that runs inside Telegram. To set it up:

1. Open [@BotFather](https://t.me/BotFather)
2. Send `/setmenubutton`
3. Select your bot
4. Send button text: "مدیریت 🎛"
5. Send WebApp URL: `https://yourdomain.com/admin`

### Admin Panel Features

- **Dashboard**: Active users, total balance, pending withdrawals
- **Users**: Search, view, edit balances
- **Codes**: Create codes (single/bulk), activate/deactivate, export CSV
- **Withdrawals**: View pending, approve, reject, mark as paid
- **Transactions**: Filter, export CSV/JSON
- **Settings**: Configure all operational parameters
- **Backups**: Manual backup, view backup history

## ⚙️ Configuration

All operational settings can be configured from the admin panel without code changes:

### Withdrawal Settings
- `WITHDRAW_FEE_FIXED`: Fixed fee amount (default: 0.10)
- `WITHDRAW_FEE_PERCENT`: Percentage fee (default: 2.5)
- `DAILY_WITHDRAW_LIMIT`: Max withdrawals per day (default: 2)
- `MIN_WITHDRAW_AMOUNT`: Minimum withdrawal (default: 0.10)

### General Settings
- `MIN_TX_AMOUNT`: Minimum transaction amount (default: 0.01)
- `REFERRAL_REWARD`: Reward per referral (default: 0.25)
- `DEFAULT_CALENDAR`: Display calendar (jalali/gregorian)
- `REQUIRE_CHANNEL_ID`: Optional channel membership enforcement

### Rate Limiting
- `RATE_LIMIT_CLAIM_REQUESTS`: Max claims per window (default: 5)
- `RATE_LIMIT_CLAIM_WINDOW_MS`: Claim window in ms (default: 60000)
- `RATE_LIMIT_WITHDRAW_REQUESTS`: Max withdrawals per window (default: 3)
- `RATE_LIMIT_WITHDRAW_WINDOW_MS`: Withdraw window in ms (default: 3600000)

### Backup
- `BACKUP_CRON`: Cron schedule (default: "0 2 * * *" = daily at 2 AM)

## 🔒 Security Features

- **Row-level locking**: Prevents race conditions in transactions
- **Rate limiting**: Per-user limits on sensitive operations
- **Admin authentication**: JWT-based auth with admin allowlist
- **Audit logging**: All admin actions are logged
- **Membership verification**: Optional channel/group requirement
- **Input validation**: Zod schema validation on all inputs

## 🗄 Database Schema

### Tables

- `users`: User profiles and balances
- `redeem_codes`: Redemption codes (single/multi-use)
- `transactions`: All financial transactions
- `withdraw_requests`: Withdrawal request lifecycle
- `referrals`: Referral tracking
- `settings`: Runtime configuration
- `audit_logs`: Admin action audit trail

### Transactions are Atomic

All balance changes use database transactions with `FOR UPDATE` locking to ensure consistency.

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm test -- --coverage
```

### Test Coverage

- User registration and referral processing
- Code redemption (valid/expired/used-up)
- Withdraw flow (reserve → approve → paid/rejected)
- Rate limiting
- Balance adjustments with locking

## 📦 Project Structure

```
telegram-group-wallet/
├── src/
│   ├── bot.ts                 # Telegraf bot initialization
│   ├── config.ts              # Configuration management
│   ├── index.ts               # Application entry point
│   ├── db/
│   │   ├── index.ts           # Database connection & types
│   │   ├── knexfile.ts        # Knex configuration
│   │   ├── migrations/        # Database migrations
│   │   └── seeds/             # Database seeds
│   ├── handlers/
│   │   ├── commands.ts        # Bot command handlers
│   │   └── messages.ts        # Persian message templates
│   ├── middlewares/
│   │   ├── adminGuard.ts      # Admin authentication
│   │   ├── rateLimit.ts       # Rate limiting
│   │   └── membershipGuard.ts # Channel membership check
│   ├── services/
│   │   ├── audit.ts           # Audit logging
│   │   ├── backup.ts          # Database backup
│   │   ├── codes.ts           # Redeem code management
│   │   ├── logger.ts          # Winston logger
│   │   ├── notifications.ts   # Telegram notifications
│   │   ├── referral.ts        # Referral system
│   │   ├── settings.ts        # Settings management
│   │   ├── users.ts           # User management
│   │   ├── wallet.ts          # Wallet operations
│   │   └── withdraw.ts        # Withdrawal processing
│   └── web/
│       ├── server.ts          # Express server
│       ├── auth.ts            # JWT authentication
│       └── routes/            # API endpoints
│           ├── users.ts
│           ├── codes.ts
│           ├── withdrawals.ts
│           └── settings.ts
├── tests/                     # Jest tests
├── Dockerfile                 # Docker image definition
├── docker-compose.yml         # Docker compose configuration
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## 🔧 Development

### Database Migrations

```bash
# Create a new migration
npm run migrate:make migration_name

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code (if using prettier)
npm run format
```

### Building

```bash
# Build TypeScript to JavaScript
npm run build

# Start production build
npm start
```

## 🐛 Troubleshooting

### Bot Not Responding

1. Check bot token is correct
2. Ensure migrations have run
3. Check logs: `docker-compose logs -f bot`
4. Verify network connectivity

### Database Connection Issues

- **PostgreSQL**: Ensure container is running and credentials are correct
- **SQLite**: Check file permissions on `SQLITE_PATH`

### Webhook Issues

- Ensure `WEBHOOK_DOMAIN` uses HTTPS
- Check Nginx configuration
- Verify SSL certificate is valid
- Test webhook: `curl https://yourdomain.com/webhook`

### Admin Panel Not Loading

- Check `WEB_JWT_SECRET` is set
- Verify admin IDs in `ADMIN_IDS`
- Check browser console for errors

## 📊 Monitoring

### Logs

Logs are stored in `logs/` directory:
- `combined.log`: All logs
- `error.log`: Error logs only

### Database Backups

Backups are stored in the `BACKUP_PATH` directory (default: `/backups` or `./backups`).

- Automated backups run according to `BACKUP_CRON`
- Manual backups via admin panel
- Old backups auto-cleaned (keeps last 10)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact: your@email.com

## 🎯 Roadmap

- [ ] Multi-language support
- [ ] Additional payment networks (ERC20, BEP20)
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Telegram Mini App integration
- [ ] Automated KYC verification
- [ ] Multi-currency support

---

Made with ❤️ for the Telegram community
