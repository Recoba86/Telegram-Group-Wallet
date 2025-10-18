# 🚀 Deploy Your Bot in 3 Simple Steps

## What You Need First:

### 1. Get Bot Token from @BotFather
Open Telegram → Search `@BotFather` → Send `/newbot` → Copy the token

### 2. Get Your Telegram ID
Open Telegram → Search `@userinfobot` → Start it → Copy your ID number

### 3. Create Admin Group
- Create a new group in Telegram
- Add your bot to the group
- Make bot admin
- Forward any message from group to `@userinfobot`
- Copy the Chat ID (starts with -100)

### 4. Configure DNS (If not done already)
Point your domain to your server IP:
- Login to your DNS provider (Cloudflare, etc.)
- Add A record: `1Win.304050.xyz` → `YOUR_SERVER_IP`
- Wait 5-10 minutes for DNS propagation

---

## 🎯 Deployment (Super Easy!)

### Step 1: SSH to Your Server
```bash
ssh ubuntu@1Win.304050.xyz
# or if DNS not ready yet:
ssh ubuntu@YOUR_SERVER_IP
```

### Step 2: Run This ONE Command
```bash
curl -o deploy.sh https://raw.githubusercontent.com/Recoba86/Telegram-Group-Wallet/main/deploy-server.sh && chmod +x deploy.sh && ./deploy.sh
```

### Step 3: Answer Questions
The script will ask you:
- 🤖 **Bot Token**: Paste from @BotFather
- 👤 **Your Telegram ID**: Paste from @userinfobot
- 💬 **Admin Group ID**: Paste the group chat ID
- 🔐 **JWT Secret**: Just press Enter (auto-generated)
- 📢 **Channel requirement**: Type `n` (or `y` if you want users to join a channel)
- 🔒 **Setup SSL**: Type `y`
- 📧 **Email**: Your email for SSL notifications

**That's it!** ☕ Grab a coffee, script takes ~5-10 minutes.

---

## ✅ After Deployment

### 1. Test Your Bot
- Open Telegram
- Search for your bot
- Send `/start`
- You should get a welcome message!

### 2. Access Admin Panel
- Open: `https://1Win.304050.xyz`
- Login with your Telegram ID
- Configure settings!

### 3. Set Bot Commands in @BotFather
Send this to @BotFather:
```
/setcommands

Then paste:
start - شروع و ثبت‌نام
balance - نمایش موجودی
claim - استفاده از کد هدیه
withdraw - درخواست برداشت
history - تاریخچه تراکنش‌ها
referral - لینک معرفی و پاداش
```

---

## 🎛 Quick Management Commands

### View Logs
```bash
cd ~/telegram-wallet-bot && docker-compose logs -f
```

### Restart Bot
```bash
cd ~/telegram-wallet-bot && docker-compose restart
```

### Update Bot (After GitHub Changes)
```bash
cd ~/telegram-wallet-bot && git pull && docker-compose up -d --build
```

### Stop Bot
```bash
cd ~/telegram-wallet-bot && docker-compose down
```

### Start Bot
```bash
cd ~/telegram-wallet-bot && docker-compose up -d
```

---

## 🆘 If Something Goes Wrong

### Check if containers are running:
```bash
cd ~/telegram-wallet-bot && docker-compose ps
```

### Check logs for errors:
```bash
cd ~/telegram-wallet-bot && docker-compose logs bot
```

### Restart everything:
```bash
cd ~/telegram-wallet-bot
docker-compose down
docker-compose up -d
```

### For detailed troubleshooting, see:
- `SERVER_DEPLOYMENT.md` - Full manual deployment guide
- `README.md` - Complete documentation
- `QUICK_REFERENCE.md` - Common commands

---

## 📱 Bot Commands for Users

```
/start [ref_CODE]    - Register or view welcome message
/balance             - Show current balance
/claim CODE          - Redeem a code
/withdraw AMOUNT NETWORK ADDRESS - Request withdrawal
/history             - View transactions
/referral            - Get referral link
```

---

## 🎯 Next Steps After Deployment

1. ✅ Test bot commands in Telegram
2. ✅ Login to admin panel
3. ✅ Create test redeem codes
4. ✅ Configure withdrawal settings
5. ✅ Set up your channel (if using membership requirement)
6. ✅ Invite users!

---

## 💡 Important Notes

- **Backups**: Automated daily at 2 AM (stored in `~/telegram-wallet-bot/backups/`)
- **Logs**: Located in `~/telegram-wallet-bot/logs/`
- **Auto-restart**: Bot automatically starts after server reboot
- **SSL**: Auto-renews every 90 days
- **Security**: Firewall configured, only ports 22, 80, 443 open

---

## 🎉 That's It!

Your bot should now be:
- ✅ Running at your domain with SSL
- ✅ Responding to Telegram commands
- ✅ Admin panel accessible
- ✅ Database backed up daily
- ✅ Auto-restarting on crashes

**Need help?** Check `SERVER_DEPLOYMENT.md` for detailed troubleshooting!

---

**Bot Live at: https://1Win.304050.xyz** 🚀
