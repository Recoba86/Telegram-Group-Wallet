#!/bin/bash

#############################################
# Telegram Wallet Bot - Server Deployment
# Ubuntu 24.04 - Oracle Cloud
# Domain: 1Win.304050.xyz
#############################################

set -e  # Exit on error

echo "🚀 Starting Telegram Wallet Bot Deployment..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Please run as regular user with sudo access, not as root${NC}"
   exit 1
fi

echo -e "${GREEN}✓${NC} Running as user: $(whoami)"

# Update system
echo ""
echo "📦 Step 1: Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install Docker if not installed
echo ""
echo "🐳 Step 2: Installing Docker..."
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✓${NC} Docker installed successfully"
else
    echo -e "${GREEN}✓${NC} Docker already installed"
fi

# Install Docker Compose if not installed
echo ""
echo "🐳 Step 3: Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓${NC} Docker Compose installed successfully"
else
    echo -e "${GREEN}✓${NC} Docker Compose already installed"
fi

# Install Git if not installed
echo ""
echo "📥 Step 4: Installing Git..."
if ! command -v git &> /dev/null; then
    sudo apt install -y git
    echo -e "${GREEN}✓${NC} Git installed successfully"
else
    echo -e "${GREEN}✓${NC} Git already installed"
fi

# Install UFW Firewall
echo ""
echo "🔥 Step 5: Configuring Firewall..."
if ! command -v ufw &> /dev/null; then
    sudo apt install -y ufw
fi

# Configure firewall rules
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8080/tcp  # Web API (can be removed after nginx setup)
echo -e "${GREEN}✓${NC} Firewall configured"

# Install Nginx for reverse proxy
echo ""
echo "🌐 Step 6: Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    echo -e "${GREEN}✓${NC} Nginx installed successfully"
else
    echo -e "${GREEN}✓${NC} Nginx already installed"
fi

# Install Certbot for SSL
echo ""
echo "🔒 Step 7: Installing Certbot for SSL..."
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓${NC} Certbot installed successfully"
else
    echo -e "${GREEN}✓${NC} Certbot already installed"
fi

# Clone repository
echo ""
echo "📂 Step 8: Cloning repository..."
APP_DIR="/home/$USER/telegram-wallet-bot"

if [ -d "$APP_DIR" ]; then
    echo "Directory exists, pulling latest changes..."
    cd $APP_DIR
    git pull
else
    echo "Cloning repository..."
    git clone https://github.com/Recoba86/Telegram-Group-Wallet.git $APP_DIR
    cd $APP_DIR
fi

echo -e "${GREEN}✓${NC} Repository ready at $APP_DIR"

# Create directories
echo ""
echo "📁 Step 9: Creating necessary directories..."
mkdir -p $APP_DIR/backups
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/postgres-data
chmod 755 $APP_DIR/backups
chmod 755 $APP_DIR/logs
chmod 755 $APP_DIR/postgres-data
echo -e "${GREEN}✓${NC} Directories created"

# Configuration
echo ""
echo "⚙️  Step 10: Configuration Setup"
echo "=============================================="
echo ""
echo -e "${YELLOW}Please provide the following information:${NC}"
echo ""

# Get configuration from user
read -p "🤖 Bot Token (from @BotFather): " BOT_TOKEN
read -p "👤 Your Telegram ID (Admin): " ADMIN_ID
read -p "💬 Admin Group Chat ID (e.g., -100123456789): " ADMIN_GROUP_ID
read -p "🔐 JWT Secret (press Enter for random): " JWT_SECRET

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    echo -e "${GREEN}✓${NC} Generated random JWT secret"
fi

# Ask for channel requirement
read -p "📢 Require users to join channel? (y/n): " REQUIRE_CHANNEL
if [ "$REQUIRE_CHANNEL" = "y" ]; then
    read -p "📢 Channel Username (@channel): " CHANNEL_USERNAME
    CHANNEL_USERNAME=${CHANNEL_USERNAME#@}  # Remove @ if provided
else
    CHANNEL_USERNAME=""
fi

# Create .env file
echo ""
echo "📝 Creating .env file..."
cat > $APP_DIR/.env << EOF
# Telegram Bot Configuration
BOT_TOKEN=$BOT_TOKEN
ADMIN_IDS=$ADMIN_ID
ADMIN_GROUP_ID=$ADMIN_GROUP_ID

# Database Configuration (PostgreSQL in Docker)
DATABASE_URL=postgresql://wallet_user:wallet_pass_$(openssl rand -hex 8)@db:5432/telegram_wallet
NODE_ENV=production

# Web Server Configuration
WEB_PORT=8080
WEB_JWT_SECRET=$JWT_SECRET
BASE_URL=https://1Win.304050.xyz

# Webhook Configuration (optional - using long polling by default)
# WEBHOOK_DOMAIN=1Win.304050.xyz

# Channel Membership (optional)
${CHANNEL_USERNAME:+REQUIRED_CHANNEL=$CHANNEL_USERNAME}

# Operational Settings (configurable from admin panel)
WITHDRAW_FEE_FIXED=0.10
WITHDRAW_FEE_PERCENT=2.5
DAILY_WITHDRAW_LIMIT=2
MIN_WITHDRAW_AMOUNT=0.10
REFERRAL_REWARD=0.25

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=20

# Backup Schedule (cron format)
BACKUP_SCHEDULE=0 2 * * *

# Logging
LOG_LEVEL=info
EOF

chmod 600 $APP_DIR/.env
echo -e "${GREEN}✓${NC} Configuration file created"

# Update docker-compose.yml for production
echo ""
echo "🐳 Step 11: Configuring Docker Compose..."
cat > $APP_DIR/docker-compose.yml << 'EOF'
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: telegram-wallet-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: telegram_wallet
      POSTGRES_USER: wallet_user
      POSTGRES_PASSWORD: ${DATABASE_URL##*:}
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wallet_user -d telegram_wallet"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - telegram-wallet

  bot:
    build: .
    container_name: telegram-wallet-bot
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    env_file:
      - .env
    volumes:
      - ./backups:/app/backups
      - ./logs:/app/logs
    ports:
      - "127.0.0.1:8080:8080"
    networks:
      - telegram-wallet
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

networks:
  telegram-wallet:
    driver: bridge
EOF

echo -e "${GREEN}✓${NC} Docker Compose configured"

# Configure Nginx
echo ""
echo "🌐 Step 12: Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/telegram-wallet > /dev/null << 'EOF'
server {
    listen 80;
    server_name 1Win.304050.xyz;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client body size limit
    client_max_body_size 10M;

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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8080/health;
        access_log off;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/telegram-wallet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
echo -e "${GREEN}✓${NC} Nginx configured"

# Setup SSL
echo ""
echo "🔒 Step 13: Setting up SSL certificate..."
read -p "Setup SSL certificate now? (y/n): " SETUP_SSL
if [ "$SETUP_SSL" = "y" ]; then
    read -p "Email for Let's Encrypt notifications: " SSL_EMAIL
    sudo certbot --nginx -d 1Win.304050.xyz --email $SSL_EMAIL --agree-tos --no-eff-email --redirect
    echo -e "${GREEN}✓${NC} SSL certificate installed"
else
    echo -e "${YELLOW}⚠${NC}  Skipping SSL setup. You can run this later:"
    echo "   sudo certbot --nginx -d 1Win.304050.xyz"
fi

# Build and start containers
echo ""
echo "🐳 Step 14: Building and starting Docker containers..."
cd $APP_DIR

# If docker group was just added, we need to use sudo for first run
if groups | grep -q docker; then
    docker-compose build --no-cache
    docker-compose up -d
else
    echo "Note: Using sudo for first Docker run (logout/login to use without sudo)"
    sudo docker-compose build --no-cache
    sudo docker-compose up -d
fi

echo -e "${GREEN}✓${NC} Containers started"

# Wait for database to be ready
echo ""
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations
echo ""
echo "🗄️  Step 15: Running database migrations..."
if groups | grep -q docker; then
    docker-compose exec -T bot npm run migrate
else
    sudo docker-compose exec -T bot npm run migrate
fi
echo -e "${GREEN}✓${NC} Database migrated"

# Run seeds
echo ""
echo "🌱 Seeding default settings..."
if groups | grep -q docker; then
    docker-compose exec -T bot npm run seed
else
    sudo docker-compose exec -T bot npm run seed
fi
echo -e "${GREEN}✓${NC} Database seeded"

# Setup auto-start on reboot
echo ""
echo "🔄 Step 16: Setting up auto-start on reboot..."
CRON_JOB="@reboot cd $APP_DIR && docker-compose up -d"
(crontab -l 2>/dev/null | grep -v "$APP_DIR"; echo "$CRON_JOB") | crontab -
echo -e "${GREEN}✓${NC} Auto-start configured"

# Setup automatic SSL renewal
echo ""
echo "🔒 Setting up automatic SSL renewal..."
(sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | sudo crontab -
echo -e "${GREEN}✓${NC} SSL auto-renewal configured"

# Display status
echo ""
echo "=============================================="
echo -e "${GREEN}✅ DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo "=============================================="
echo ""
echo "📊 Service Status:"
if groups | grep -q docker; then
    docker-compose ps
else
    sudo docker-compose ps
fi
echo ""
echo "🌐 Access Points:"
echo "   Admin Panel: https://1Win.304050.xyz"
echo "   API Docs: https://1Win.304050.xyz/api"
echo ""
echo "🔧 Management Commands:"
echo "   View logs:     cd $APP_DIR && docker-compose logs -f"
echo "   Restart:       cd $APP_DIR && docker-compose restart"
echo "   Stop:          cd $APP_DIR && docker-compose down"
echo "   Start:         cd $APP_DIR && docker-compose up -d"
echo "   Update code:   cd $APP_DIR && git pull && docker-compose up -d --build"
echo ""
echo "📱 Next Steps:"
echo "   1. Open Telegram and start chat with your bot"
echo "   2. Send /start to register as admin"
echo "   3. Access admin panel at https://1Win.304050.xyz"
echo "   4. Configure settings from admin panel"
echo ""
echo "📚 Documentation:"
echo "   README:        $APP_DIR/README.md"
echo "   Quick Guide:   $APP_DIR/QUICK_REFERENCE.md"
echo "   Architecture:  $APP_DIR/ARCHITECTURE.md"
echo ""
echo "⚠️  IMPORTANT:"
if ! groups | grep -q docker; then
    echo "   - Logout and login again to use docker without sudo"
fi
echo "   - Your .env file contains sensitive data"
echo "   - Backup located at: $APP_DIR/backups"
echo "   - Logs located at: $APP_DIR/logs"
echo ""
echo -e "${GREEN}🎉 Your Telegram Wallet Bot is now live!${NC}"
