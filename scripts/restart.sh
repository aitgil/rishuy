#!/bin/bash

# סקריפט הפעלה מחדש לבוט טלגרם
set -e

echo "🔄 Restarting Telegram Vehicle Bot..."

# עצירת הבוט
echo "⏹️  Stopping current instance..."
./scripts/stop.sh

# המתנה קצרה
sleep 2

# הפעלה מחדש
echo "▶️  Starting bot again..."
./scripts/start.sh

echo "✅ Bot restarted successfully!"