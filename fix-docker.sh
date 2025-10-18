#!/bin/bash

#############################################
# Quick Fix for Docker Compose Issue
#############################################

echo "🔧 Fixing docker-compose.yml..."

cd ~/telegram-wallet-bot

# Generate a secure database password
DB_PASS=$(openssl rand -base64 16 | tr -d '=+/' | cut -c1-20)

# Update .env file with DB_PASSWORD
if ! grep -q "DB_PASSWORD" .env; then
    echo "" >> .env
    echo "# Database Password" >> .env
    echo "DB_PASSWORD=$DB_PASS" >> .env
    echo "✅ Added DB_PASSWORD to .env"
fi

# Extract existing values from .env
BOT_TOKEN=$(grep "^BOT_TOKEN=" .env | cut -d'=' -f2)
ADMIN_IDS=$(grep "^ADMIN_IDS=" .env | cut -d'=' -f2)
ADMIN_GROUP_ID=$(grep "^ADMIN_GROUP_ID=" .env | cut -d'=' -f2)
JWT_SECRET=$(grep "^WEB_JWT_SECRET=" .env | cut -d'=' -f2)
BASE_URL=$(grep "^BASE_URL=" .env | cut -d'=' -f2)
DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2)

# Update DATABASE_URL in .env
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://wallet_user:${DB_PASSWORD}@db:5432/telegram_wallet|" .env

# Create corrected docker-compose.yml
cat > docker-compose.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: telegram-wallet-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: telegram_wallet
      POSTGRES_USER: wallet_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
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
COMPOSE_EOF

echo "✅ docker-compose.yml fixed"

# Stop existing containers if running
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Remove old containers
docker container prune -f

# Build and start
echo "🚀 Building and starting containers..."
docker-compose up -d --build

echo ""
echo "⏳ Waiting for database to be ready..."
sleep 15

# Run migrations
echo "🗄️ Running migrations..."
docker-compose exec -T bot npm run migrate

# Run seeds
echo "🌱 Running seeds..."
docker-compose exec -T bot npm run seed

echo ""
echo "✅ All fixed! Checking status..."
docker-compose ps

echo ""
echo "📊 View logs with: docker-compose logs -f"
