# Server Deployment Guide
## Oracle Cloud Ubuntu 24 - 1Win.304050.xyz

## 🚀 Quick Deployment (Recommended)

### Step 1: Connect to Your Server
```bash
ssh ubuntu@1Win.304050.xyz
# or
ssh ubuntu@YOUR_SERVER_IP
```

### Step 2: Download and Run Deployment Script
```bash
# Download the deployment script
curl -o deploy.sh https://raw.githubusercontent.com/Recoba86/Telegram-Group-Wallet/main/deploy-server.sh

# Make it executable
chmod +x deploy.sh

# Run the script
./deploy.sh
```

The script will ask you for:
- 🤖 Bot Token (from @BotFather)
- 👤 Your Telegram ID (get from @userinfobot)
- 💬 Admin Group Chat ID (forward message from group to @userinfobot)
- 🔐 JWT Secret (can auto-generate)
- 📢 Channel requirement (optional)
- 📧 Email for SSL certificate

### Step 3: Wait for Completion
The script will automatically:
- ✅ Install Docker & Docker Compose
- ✅ Install Nginx & configure reverse proxy
- ✅ Setup SSL certificate (Let's Encrypt)
- ✅ Clone repository
- ✅ Build containers
- ✅ Run database migrations
- ✅ Configure firewall
- ✅ Setup auto-start on reboot

## 📋 What You Need Before Starting

### 1. Get Bot Token
```
1. Open Telegram and search for @BotFather
2. Send /newbot
3. Follow instructions and choose name
4. Copy the token (looks like: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)
```

### 2. Get Your Telegram ID
```
1. Search for @userinfobot in Telegram
2. Start the bot
3. Copy your ID (pure number like: 123456789)
```

### 3. Create Admin Group
```
1. Create a new group in Telegram
2. Add your bot to the group
3. Make bot admin
4. Forward any message from the group to @userinfobot
5. Copy the Chat ID (looks like: -1001234567890)
```

### 4. DNS Configuration
Point your domain to server IP:
```
A record: 1Win.304050.xyz → YOUR_SERVER_IP
```

## 🔧 Manual Deployment (If Script Fails)

### Step 1: Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
sudo apt install -y nginx

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Logout and login to apply docker group
```

### Step 2: Clone Repository
```bash
cd ~
git clone https://github.com/Recoba86/Telegram-Group-Wallet.git telegram-wallet-bot
cd telegram-wallet-bot
```

### Step 3: Configure Environment
```bash
# Copy example and edit
cp .env.example .env
nano .env
```

Edit these values:
```env
BOT_TOKEN=your_bot_token_here
ADMIN_IDS=your_telegram_id
ADMIN_GROUP_ID=-1001234567890
DATABASE_URL=postgresql://wallet_user:secure_password@db:5432/telegram_wallet
WEB_JWT_SECRET=your_random_secret_32_chars
BASE_URL=https://1Win.304050.xyz
```

### Step 4: Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/telegram-wallet
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name 1Win.304050.xyz;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/telegram-wallet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Setup SSL
```bash
sudo certbot --nginx -d 1Win.304050.xyz --email your@email.com --agree-tos --redirect
```

### Step 6: Start Services
```bash
# Build and start
docker-compose up -d --build

# Run migrations
docker-compose exec bot npm run migrate
docker-compose exec bot npm run seed

# Check status
docker-compose ps
docker-compose logs -f
```

## 🔍 Verification Steps

### 1. Check Containers
```bash
docker-compose ps
```
Should show both `db` and `bot` as running.

### 2. Check Logs
```bash
docker-compose logs -f bot
```
Should show "Bot started successfully" and "Web server listening on port 8080"

### 3. Check Database
```bash
docker-compose exec db psql -U wallet_user -d telegram_wallet -c "\dt"
```
Should list all tables (users, redeem_codes, transactions, etc.)

### 4. Test Bot
1. Open Telegram
2. Search for your bot
3. Send `/start`
4. Should receive welcome message

### 5. Test Admin Panel
1. Open https://1Win.304050.xyz in browser
2. Should see admin login page
3. Use Telegram ID to login

## 🛠 Management Commands

### View Logs
```bash
cd ~/telegram-wallet-bot

# All logs
docker-compose logs -f

# Bot only
docker-compose logs -f bot

# Database only
docker-compose logs -f db

# Last 100 lines
docker-compose logs --tail=100
```

### Restart Services
```bash
cd ~/telegram-wallet-bot

# Restart everything
docker-compose restart

# Restart bot only
docker-compose restart bot

# Full rebuild
docker-compose down
docker-compose up -d --build
```

### Update Code
```bash
cd ~/telegram-wallet-bot

# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Run new migrations
docker-compose exec bot npm run migrate
```

### Database Backup
```bash
cd ~/telegram-wallet-bot

# Manual backup
docker-compose exec bot npm run backup

# Backups are stored in ./backups/
ls -lh backups/
```

### Database Restore
```bash
cd ~/telegram-wallet-bot

# Stop bot
docker-compose stop bot

# Restore from backup
docker-compose exec db psql -U wallet_user -d telegram_wallet < backups/backup-YYYY-MM-DD.sql

# Restart bot
docker-compose start bot
```

## 🔥 Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

## 📊 Monitoring

### Check Resource Usage
```bash
# System resources
htop
# or
free -h
df -h

# Docker resources
docker stats

# Container resource limits
docker-compose exec bot cat /sys/fs/cgroup/memory/memory.limit_in_bytes
```

### Check Port Usage
```bash
sudo netstat -tulpn | grep LISTEN
# Should show:
# 0.0.0.0:80 (nginx)
# 0.0.0.0:443 (nginx)
# 127.0.0.1:8080 (bot)
# 127.0.0.1:5432 (postgres - only in container)
```

## 🚨 Troubleshooting

### Bot Not Starting
```bash
# Check logs
docker-compose logs bot

# Check environment
docker-compose exec bot env | grep BOT_TOKEN

# Restart
docker-compose restart bot
```

### Database Connection Error
```bash
# Check database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Test connection
docker-compose exec db psql -U wallet_user -d telegram_wallet -c "SELECT 1"
```

### Nginx Error
```bash
# Check nginx status
sudo systemctl status nginx

# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### SSL Certificate Error
```bash
# Check certificate
sudo certbot certificates

# Renew manually
sudo certbot renew --dry-run

# Force renew
sudo certbot renew --force-renewal
```

### Out of Memory
```bash
# Check memory
free -h

# Restart with memory cleanup
docker-compose down
docker system prune -f
docker-compose up -d
```

### Port Already in Use
```bash
# Find process using port 8080
sudo lsof -i :8080

# Kill process
sudo kill -9 PID

# Or change port in .env
nano .env
# Change WEB_PORT=8081
docker-compose up -d
```

## 🔄 Auto-Update Setup

Create update script:
```bash
nano ~/update-bot.sh
```

```bash
#!/bin/bash
cd ~/telegram-wallet-bot
git pull
docker-compose down
docker-compose up -d --build
docker-compose exec -T bot npm run migrate
echo "Bot updated at $(date)" >> ~/bot-updates.log
```

Make executable and add to cron:
```bash
chmod +x ~/update-bot.sh

# Add to crontab (weekly updates on Sunday 3 AM)
crontab -e
# Add this line:
0 3 * * 0 /home/ubuntu/update-bot.sh
```

## 📱 Post-Deployment Checklist

- [ ] Bot responds to `/start` command
- [ ] Admin panel accessible at https://1Win.304050.xyz
- [ ] SSL certificate is valid (green padlock)
- [ ] Can login to admin panel
- [ ] Database migrations completed
- [ ] Firewall configured
- [ ] Automatic backups working
- [ ] Auto-restart on reboot configured
- [ ] Logs are being written
- [ ] Set bot commands in @BotFather
- [ ] Test referral system
- [ ] Test code redemption
- [ ] Test withdrawal flow
- [ ] Configure operational settings in admin panel

## 📞 Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Check system resources: `htop` or `free -h`
3. Verify configuration: `cat .env`
4. Review documentation: `cat README.md`
5. Check GitHub issues

## 🎯 Performance Optimization for 1GB RAM

### Adjust Docker Memory Limits
Edit `docker-compose.yml`:
```yaml
services:
  bot:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

### Add Swap Space
```bash
# Create 2GB swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### PostgreSQL Tuning
Edit `docker-compose.yml` and add:
```yaml
services:
  db:
    command: postgres -c shared_buffers=128MB -c max_connections=20
```

---

**Your bot is now live at: https://1Win.304050.xyz** 🎉
