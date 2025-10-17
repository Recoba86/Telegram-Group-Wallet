#!/bin/bash

# Setup script for Telegram Wallet Bot

echo "🚀 Setting up Telegram Wallet Bot..."

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing!"
    echo ""
    echo "Required settings:"
    echo "  - BOT_TOKEN: Get from @BotFather"
    echo "  - ADMIN_IDS: Your Telegram user ID"
    echo "  - ADMIN_GROUP_ID: Your admin group ID"
    echo "  - WEB_JWT_SECRET: Random secret key"
    echo ""
    read -p "Press Enter after editing .env file..."
fi

# Source .env
export $(cat .env | grep -v '^#' | xargs)

# Create logs directory
mkdir -p logs

# Check if using SQLite or PostgreSQL
if [ -z "$DATABASE_URL" ]; then
    echo "📁 Using SQLite for development"
else
    echo "🐘 Using PostgreSQL"
    echo "⚠️  Make sure PostgreSQL is running and accessible"
fi

# Run migrations
echo "🗄 Running database migrations..."
npm run migrate

# Run seeds
echo "🌱 Seeding database..."
npm run seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 You can now start the bot:"
echo "   npm run dev    (development mode)"
echo "   npm start      (production mode)"
echo ""
echo "🌐 Admin panel will be available at: http://localhost:${WEB_PORT:-8080}"
echo ""
echo "📱 Don't forget to:"
echo "   1. Set your bot's menu button to the admin URL using @BotFather"
echo "   2. Give your bot admin rights in your admin group"
echo ""
