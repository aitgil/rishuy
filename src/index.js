// נקודת כניסה ראשית לבוט הטלגרם
require('dotenv').config();

const BotManager = require('./bot');

/**
 * פונקציה ראשית להפעלת הבוט
 */
async function main() {
  try {
    // בדיקת משתני סביבה
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error('❌ TELEGRAM_BOT_TOKEN is required in environment variables');
      process.exit(1);
    }

    // יצירת מנהל הבוט
    const botManager = new BotManager(token);

    // הגדרת טיפול בסיגנלי מערכת
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await botManager.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await botManager.stop();
      process.exit(0);
    });

    // טיפול בשגיאות לא מטופלות
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // התחלת הבוט
    await botManager.start();

    // הדפסת סטטיסטיקות כל דקה (במצב פיתוח)
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const stats = botManager.getStats();
        console.log(`📊 Stats: ${stats.messagesProcessed} messages, ${stats.errorsHandled} errors, uptime: ${stats.uptimeFormatted}`);
      }, 60000);
    }

  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// הפעלת הפונקציה הראשית
if (require.main === module) {
  main();
}

module.exports = { main };