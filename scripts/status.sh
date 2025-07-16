#!/bin/bash

# סקריפט בדיקת סטטוס לבוט טלגרם
set -e

echo "📊 Telegram Vehicle Bot Status"
echo "================================"

# בדיקה אם Docker Compose זמין
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    exit 1
fi

# סטטוס כללי
echo ""
echo "🐳 Docker Services:"
docker-compose ps

# בדיקת בריאות הבוט
echo ""
echo "🏥 Health Check:"
if docker-compose ps | grep -q "telegram-vehicle-bot.*Up"; then
    # הרצת health check
    if docker-compose exec -T telegram-vehicle-bot node -e "
        const BotManager = require('./src/bot');
        const bot = new BotManager(process.env.TELEGRAM_BOT_TOKEN);
        bot.healthCheck().then(health => {
            console.log('Health Status:', health.healthy ? '✅ Healthy' : '❌ Unhealthy');
            if (health.botInfo) {
                console.log('Bot Username:', health.botInfo.username);
                console.log('Bot ID:', health.botInfo.id);
            }
            if (health.stats) {
                console.log('Messages Processed:', health.stats.messagesProcessed);
                console.log('Errors Handled:', health.stats.errorsHandled);
                console.log('Uptime:', health.stats.uptimeFormatted);
            }
            process.exit(health.healthy ? 0 : 1);
        }).catch(err => {
            console.log('Health Check Failed:', err.message);
            process.exit(1);
        });
    " 2>/dev/null; then
        echo "✅ Bot is healthy and responsive"
    else
        echo "❌ Bot health check failed"
    fi
else
    echo "❌ Bot is not running"
fi

# לוגים אחרונים
echo ""
echo "📋 Recent Logs (last 10 lines):"
echo "--------------------------------"
if docker-compose ps | grep -q "telegram-vehicle-bot.*Up"; then
    docker-compose logs --tail=10 telegram-vehicle-bot
else
    echo "No logs available - bot is not running"
fi

# שימוש במשאבים
echo ""
echo "💾 Resource Usage:"
echo "-------------------"
if docker-compose ps | grep -q "telegram-vehicle-bot.*Up"; then
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" $(docker-compose ps -q)
else
    echo "No resource usage available - bot is not running"
fi

echo ""
echo "🔧 Useful Commands:"
echo "-------------------"
echo "  View live logs:   docker-compose logs -f telegram-vehicle-bot"
echo "  Restart bot:      ./scripts/restart.sh"
echo "  Stop bot:         ./scripts/stop.sh"
echo "  Start bot:        ./scripts/start.sh"