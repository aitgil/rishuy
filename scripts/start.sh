#!/bin/bash

# סקריפט הפעלה לבוט טלגרם
set -e

echo "🚀 Starting Telegram Vehicle Bot..."

# בדיקת משתני סביבה נדרשים
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ Error: TELEGRAM_BOT_TOKEN environment variable is required"
    echo "Please set your bot token:"
    echo "export TELEGRAM_BOT_TOKEN=your_bot_token_here"
    exit 1
fi

# יצירת תיקיית לוגים אם לא קיימת
mkdir -p logs

# בדיקת Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# בדיקת קובץ .env
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "📝 Please edit .env file with your bot token and settings"
        echo "Then run this script again."
        exit 1
    fi
fi

# טעינת משתני סביבה
if [ -f .env ]; then
    echo "📋 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# בדיקה אם הבוט כבר רץ
if docker-compose ps | grep -q "telegram-vehicle-bot.*Up"; then
    echo "⚠️  Bot is already running. Use './scripts/restart.sh' to restart or './scripts/stop.sh' to stop."
    exit 1
fi

# בניית ההדמיה
echo "🔨 Building Docker image..."
docker-compose build

# הפעלת הבוט
echo "▶️  Starting bot services..."
docker-compose up -d

# המתנה לאתחול
echo "⏳ Waiting for bot to initialize..."
sleep 5

# בדיקת סטטוס
if docker-compose ps | grep -q "telegram-vehicle-bot.*Up"; then
    echo "✅ Bot started successfully!"
    echo ""
    echo "📊 Status:"
    docker-compose ps
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs:    docker-compose logs -f telegram-vehicle-bot"
    echo "  Stop bot:     ./scripts/stop.sh"
    echo "  Restart bot:  ./scripts/restart.sh"
    echo "  Bot status:   ./scripts/status.sh"
else
    echo "❌ Failed to start bot. Check logs:"
    docker-compose logs telegram-vehicle-bot
    exit 1
fi