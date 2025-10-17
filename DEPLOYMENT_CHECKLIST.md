# Deployment Checklist

Use this checklist when deploying the Telegram Wallet Bot to production.

## Pre-Deployment

### 1. Code Preparation
- [ ] All code committed to repository
- [ ] No sensitive data in code (check with `git grep -i password`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)

### 2. Environment Configuration
- [ ] `.env` file created and configured
- [ ] `BOT_TOKEN` obtained from @BotFather
- [ ] `ADMIN_IDS` verified (your Telegram user ID)
- [ ] `ADMIN_GROUP_ID` set (group chat ID)
- [ ] `WEB_JWT_SECRET` set to strong random string (min 32 chars)
- [ ] `DATABASE_URL` configured for PostgreSQL
- [ ] `BASE_URL` set to your domain
- [ ] `WEBHOOK_DOMAIN` set if using webhooks
- [ ] All other settings reviewed

### 3. Database Setup
- [ ] PostgreSQL installed and running
- [ ] Database created
- [ ] Database user created with appropriate permissions
- [ ] Connection tested
- [ ] Migrations prepared (`npm run migrate`)
- [ ] Seeds prepared (`npm run seed`)

### 4. Server Setup
- [ ] Ubuntu/Debian server with SSH access
- [ ] Node.js 20+ installed OR Docker installed
- [ ] Nginx installed (if using reverse proxy)
- [ ] Certbot installed (for SSL/TLS)
- [ ] Firewall configured (ports 80, 443, 22)
- [ ] Sufficient disk space for backups

### 5. Security
- [ ] Strong passwords for all accounts
- [ ] SSH key-based authentication enabled
- [ ] Root login disabled
- [ ] Firewall rules configured
- [ ] PostgreSQL not exposed to internet
- [ ] Backup encryption considered

## Deployment

### Option A: Docker Deployment (Recommended)

#### 1. Transfer Files
```bash
# On local machine
scp -r . user@yourserver.com:/opt/telegram-wallet
```

- [ ] Files transferred to server
- [ ] `.env` file copied separately (secure transfer)
- [ ] `.gitignore` prevents committing sensitive files

#### 2. Install Docker
```bash
# On server
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Log out and back in
docker --version
docker-compose --version
```

- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] User added to docker group

#### 3. Build and Start
```bash
cd /opt/telegram-wallet
sudo docker-compose up -d
```

- [ ] Containers built successfully
- [ ] Containers running (`docker-compose ps`)
- [ ] No errors in logs (`docker-compose logs -f`)

#### 4. Run Migrations
```bash
docker-compose exec bot npm run migrate
docker-compose exec bot npm run seed
```

- [ ] Migrations executed successfully
- [ ] Seeds loaded
- [ ] Database tables created

### Option B: Manual Deployment

#### 1. Install Dependencies
```bash
cd /opt/telegram-wallet
npm install --production
```

- [ ] Dependencies installed
- [ ] No errors or warnings

#### 2. Build TypeScript
```bash
npm run build
```

- [ ] Build completed successfully
- [ ] `dist/` directory created

#### 3. Setup Process Manager (PM2)
```bash
sudo npm install -g pm2
pm2 start dist/index.js --name telegram-wallet
pm2 save
pm2 startup
```

- [ ] PM2 installed
- [ ] Application started
- [ ] Auto-restart configured
- [ ] Startup script enabled

#### 4. Run Migrations
```bash
npm run migrate
npm run seed
```

- [ ] Migrations executed
- [ ] Seeds loaded

## Post-Deployment

### 1. Verify Bot
- [ ] Bot responds to `/start` command
- [ ] Bot shows in Telegram search
- [ ] Commands work correctly
- [ ] Persian text displays correctly (RTL)

### 2. Setup Nginx (Reverse Proxy)
```bash
sudo nano /etc/nginx/sites-available/telegram-wallet
```

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

```bash
sudo ln -s /etc/nginx/sites-available/telegram-wallet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

- [ ] Nginx configuration created
- [ ] Configuration tested
- [ ] Nginx reloaded
- [ ] Site accessible via HTTP

### 3. Setup SSL/TLS
```bash
sudo certbot --nginx -d yourdomain.com
```

- [ ] Let's Encrypt certificate obtained
- [ ] HTTPS enabled
- [ ] Auto-renewal tested
- [ ] HTTP redirects to HTTPS

### 4. Configure Bot Menu Button
1. Open @BotFather in Telegram
2. Send `/setmenubutton`
3. Select your bot
4. Send button text: "مدیریت 🎛"
5. Send WebApp URL: `https://yourdomain.com/admin`

- [ ] Menu button configured
- [ ] Button appears in bot chat
- [ ] WebApp opens correctly

### 5. Setup Webhook (If Using)
```bash
# Test webhook
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -d "url=https://yourdomain.com/webhook"
```

- [ ] Webhook URL set
- [ ] Bot receives updates via webhook
- [ ] Webhook SSL verification passes

### 6. Verify Admin Panel
- [ ] Admin panel accessible at `https://yourdomain.com/admin`
- [ ] Login works with Telegram WebApp
- [ ] Dashboard shows correct stats
- [ ] All CRUD operations work
- [ ] Settings can be changed

### 7. Test Core Features
- [ ] User registration (`/start`)
- [ ] Balance check (`/balance`)
- [ ] Code creation (admin panel)
- [ ] Code redemption (`/claim CODE`)
- [ ] Withdrawal request (`/withdraw`)
- [ ] Withdrawal approval (admin panel)
- [ ] Referral system
- [ ] Notifications work

### 8. Setup Monitoring
- [ ] Check logs: `docker-compose logs -f bot` or `pm2 logs`
- [ ] Monitor disk space
- [ ] Monitor database size
- [ ] Setup uptime monitoring (e.g., UptimeRobot)
- [ ] Setup error alerting

### 9. Backup Configuration
- [ ] Backup directory created
- [ ] Backup cron job running
- [ ] Test manual backup
- [ ] Verify backup files created
- [ ] Test backup restoration (on test database)

### 10. Security Hardening
- [ ] Change default PostgreSQL password
- [ ] Disable PostgreSQL remote access (if not needed)
- [ ] Review firewall rules
- [ ] Enable fail2ban
- [ ] Setup SSH key only authentication
- [ ] Disable root SSH login
- [ ] Review `.env` file permissions (chmod 600)

### 11. Documentation
- [ ] Document server credentials (in password manager)
- [ ] Document deployment process
- [ ] Document backup/restore procedure
- [ ] Document rollback procedure
- [ ] Share access with team (if applicable)

## Regular Maintenance

### Daily
- [ ] Check bot is responding
- [ ] Check error logs
- [ ] Monitor pending withdrawals

### Weekly
- [ ] Review audit logs
- [ ] Check disk space
- [ ] Verify backups exist

### Monthly
- [ ] Test backup restoration
- [ ] Update dependencies (`npm update`)
- [ ] Review and adjust rate limits
- [ ] Review user activity

### As Needed
- [ ] Update Node.js version
- [ ] Apply security patches
- [ ] Optimize database (VACUUM, ANALYZE)
- [ ] Clean old logs

## Rollback Plan

If deployment fails:

### Docker
```bash
docker-compose down
docker-compose pull  # if using pre-built images
docker-compose up -d --build
```

### Manual
```bash
pm2 stop telegram-wallet
cd /opt/telegram-wallet
git reset --hard <previous-commit>
npm install
npm run build
pm2 restart telegram-wallet
```

- [ ] Rollback procedure documented
- [ ] Rollback procedure tested (in staging)
- [ ] Database rollback procedure documented

## Emergency Contacts

- Server Provider: _______________
- Domain Registrar: _______________
- Database Admin: _______________
- DevOps Contact: _______________
- Bot Owner: _______________

## Success Criteria

The deployment is successful when:
- [ ] Bot responds to all commands
- [ ] Admin panel is accessible and functional
- [ ] Database is accepting connections
- [ ] Backups are running automatically
- [ ] Monitoring is active
- [ ] No errors in logs
- [ ] SSL/TLS is working
- [ ] Performance is acceptable (response time < 1s)

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Server**: _______________
**Version**: _______________
**Notes**: _______________
