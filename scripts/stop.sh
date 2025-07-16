#!/bin/bash

# סקריפט עצירה לבוט טלגרם
set -e

echo "🛑 Stopping Telegram Vehicle Bot..."

# בדיקה אם Docker Compose זמין
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    exit 1
fi

# בדיקה אם הבוט רץ
if ! docker-compose ps | grep -q "telegram-vehicle-bot"; then
    echo "⚠️  Bot is not running."
    exit 0
fi

# עצירת השירותים
echo "⏹️  Stopping bot services..."
docker-compose down

echo "✅ Bot stopped successfully!"

# אופציה לניקוי volumes
read -p "🗑️  Do you want to clean up volumes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Cleaning up volumes..."
    docker-compose down -v
    echo "✅ Volumes cleaned!"
fi

# הצגת סטטוס
echo ""
echo "📊 Current status:"
docker-compose ps