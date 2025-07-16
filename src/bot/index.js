const TelegramBot = require('node-telegram-bot-api');
const MessageRouter = require('../utils/messageRouter');
const CommandHandler = require('../handlers/commandHandler');
const LicensePlateHandler = require('../handlers/licensePlateHandler');
const SettingsHandler = require('../handlers/settingsHandler');
const ErrorHandler = require('../utils/errorHandler');
const RateLimiter = require('../utils/rateLimiter');
const InputValidator = require('../utils/inputValidator');

/**
 * מנהל הבוט הראשי
 * מחבר את כל הרכיבים ומנהל את זרימת ההודעות
 */
class BotManager {
  constructor(token) {
    if (!token) {
      throw new Error('Bot token is required');
    }

    this.token = token;
    this.bot = null;
    this.isRunning = false;
    
    // רכיבי הבוט
    this.messageRouter = new MessageRouter();
    this.errorHandler = new ErrorHandler();
    this.rateLimiter = new RateLimiter({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10
    });
    this.inputValidator = new InputValidator();
    
    // מטפלי הודעות
    this.commandHandler = null;
    this.licensePlateHandler = null;
    this.settingsHandler = null;
    
    // סטטיסטיקות
    this.stats = {
      messagesProcessed: 0,
      errorsHandled: 0,
      startTime: null,
      lastActivity: null
    };
  }

  /**
   * התחלת הבוט
   */
  async start() {
    try {
      console.log('🚀 Starting Telegram Vehicle Bot...');
      
      // יצירת אובייקט הבוט
      this.bot = new TelegramBot(this.token, { 
        polling: {
          interval: 300,
          autoStart: false,
          params: {
            timeout: 10
          }
        }
      });

      // אתחול המטפלים
      this._initializeHandlers();
      
      // הגדרת event listeners
      this._setupEventListeners();
      
      // התחלת polling
      await this.bot.startPolling();
      
      this.isRunning = true;
      this.stats.startTime = new Date();
      
      console.log('✅ Bot started successfully!');
      console.log(`📊 Bot info: @${(await this.bot.getMe()).username}`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start bot:', error);
      await this.errorHandler.logError(error, { context: 'bot_startup' });
      throw error;
    }
  }

  /**
   * עצירת הבוט
   */
  async stop() {
    try {
      console.log('🛑 Stopping bot...');
      
      if (this.bot && this.isRunning) {
        await this.bot.stopPolling();
        this.isRunning = false;
        console.log('✅ Bot stopped successfully');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error stopping bot:', error);
      return false;
    }
  }

  /**
   * אתחול המטפלים
   * @private
   */
  _initializeHandlers() {
    this.commandHandler = new CommandHandler(this.bot);
    this.licensePlateHandler = new LicensePlateHandler(this.bot);
    this.settingsHandler = new SettingsHandler(this.bot);
    
    console.log('✅ Handlers initialized');
  }

  /**
   * הגדרת event listeners
   * @private
   */
  _setupEventListeners() {
    // טיפול בהודעות טקסט
    this.bot.on('message', async (msg) => {
      await this._handleMessage(msg);
    });

    // טיפול בקריאות callback
    this.bot.on('callback_query', async (callbackQuery) => {
      await this._handleCallbackQuery(callbackQuery);
    });

    // טיפול בשגיאות polling
    this.bot.on('polling_error', (error) => {
      console.error('Polling error:', error);
      this.errorHandler.logError(error, { context: 'polling' });
      this.stats.errorsHandled++;
    });

    // טיפול בשגיאות webhook
    this.bot.on('webhook_error', (error) => {
      console.error('Webhook error:', error);
      this.errorHandler.logError(error, { context: 'webhook' });
      this.stats.errorsHandled++;
    });

    console.log('✅ Event listeners set up');
  }

  /**
   * טיפול בהודעות
   * @private
   */
  async _handleMessage(msg) {
    try {
      this.stats.messagesProcessed++;
      this.stats.lastActivity = new Date();
      
      console.log(`📨 Message from ${msg.from.id}: ${msg.text || '[non-text]'}`);
      
      // ולידציה של ההודעה
      const validation = this.inputValidator.validateMessage(msg);
      if (!validation.valid) {
        console.warn(`Invalid message from ${msg.from?.id}: ${validation.message}`);
        return;
      }

      // בדיקת rate limiting
      const rateLimitCheck = this.rateLimiter.checkLimit(validation.userId);
      if (!rateLimitCheck.allowed) {
        const limitMessage = RateLimiter.createLimitMessage(rateLimitCheck);
        await this.bot.sendMessage(msg.chat.id, limitMessage);
        return;
      }
      
      // ניתוב ההודעה
      const routingResult = this.messageRouter.routeMessage(msg);
      
      if (!this.messageRouter.validateRoutingResult(routingResult)) {
        throw new Error('Invalid routing result');
      }
      
      // ביצוע הפעולה המתאימה
      await this._executeAction(routingResult);
      
    } catch (error) {
      console.error('Error handling message:', error);
      await this.errorHandler.handleError(error, this.bot, msg.chat.id);
      this.stats.errorsHandled++;
    }
  }

  /**
   * טיפול בקריאות callback
   * @private
   */
  async _handleCallbackQuery(callbackQuery) {
    try {
      this.stats.messagesProcessed++;
      this.stats.lastActivity = new Date();
      
      console.log(`🔘 Callback from ${callbackQuery.from.id}: ${callbackQuery.data}`);
      
      // ניתוב הקריאה
      const routingResult = this.messageRouter.routeMessage(callbackQuery);
      
      if (!this.messageRouter.validateRoutingResult(routingResult)) {
        throw new Error('Invalid callback routing result');
      }
      
      // ביצוע הפעולה המתאימה
      await this._executeAction(routingResult);
      
    } catch (error) {
      console.error('Error handling callback query:', error);
      await this.errorHandler.handleError(
        error, 
        this.bot, 
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id
      );
      this.stats.errorsHandled++;
    }
  }

  /**
   * ביצוע פעולה לפי תוצאת הניתוב
   * @private
   */
  async _executeAction(routingResult) {
    const { type, action, data } = routingResult;
    
    switch (action) {
      // פקודות בסיסיות
      case 'handleStartCommand':
        return await this.commandHandler.handleStartCommand(data.userId, data.chatId);
      
      case 'handleHelpCommand':
        return await this.commandHandler.handleHelpCommand(data.userId, data.chatId);
      
      case 'handleSettingsCommand':
        return await this.commandHandler.handleSettingsCommand(data.userId, data.chatId);
      
      // callback queries בסיסיים
      case 'handleHelpCallback':
        return await this.commandHandler.handleHelpCallback(
          data.userId, data.chatId, data.messageId, data.callbackQueryId
        );
      
      case 'handleSettingsCallback':
        return await this.commandHandler.handleSettingsCallback(
          data.userId, data.chatId, data.messageId, data.callbackQueryId
        );
      
      case 'handleNewSearchCallback':
        return await this.commandHandler.handleNewSearchCallback(
          data.userId, data.chatId, data.messageId, data.callbackQueryId
        );
      
      case 'handleMainMenuCallback':
        return await this.commandHandler.handleMainMenuCallback(
          data.userId, data.chatId, data.messageId, data.callbackQueryId
        );
      
      // חיפוש רכב
      case 'handleLicensePlateSearch':
        return await this.licensePlateHandler.handleLicensePlateSearch(
          data.licensePlate, data.userId, data.chatId, data.messageId
        );
      
      case 'handleInvalidLicensePlate':
        return await this.licensePlateHandler.handleInvalidLicensePlate(
          data.invalidInput, data.userId, data.chatId
        );
      
      case 'handleCancelSearchCallback':
        return await this.licensePlateHandler.handleCancelSearchCallback(
          data.userId, data.chatId, data.messageId, data.callbackQueryId
        );
      
      case 'handleRetrySearchCallback':
        return await this.licensePlateHandler.handleRetrySearchCallback(
          data.userId, data.chatId, data.messageId, data.callbackQueryId
        );
      
      // הגדרות
      case 'handleFieldsSettingsCallback':
        return await this.settingsHandler.handleFieldsSettingsCallback(
          data.userId, data.chatId, data.messageId, data.callbackQueryId
        );
      
      case 'handleLanguageSettingsCallback':
        return await this.settingsHandler.handleLanguageSettingsCallback(
          data.userId, data.chatId, data.messageId, data.callbackQueryId
        );
      
      case 'handleResetSettingsCallback':
        return await this.settingsHandler.handleResetSettingsCallback(
          data.userId, data.chatId, data.messageId, data.callbackQueryId
        );
      
      case 'handleToggleFieldCallback':
        return await this.settingsHandler.handleToggleFieldCallback(
          data.fieldName, data.userId, data.chatId, data.messageId, data.callbackQueryId
        );
      
      case 'handleSaveFieldsCallback':
        return await this.settingsHandler.handleSaveFieldsCallback(
          data.userId, data.chatId, data.messageId, data.callbackQueryId
        );
      
      case 'handleSetLanguageCallback':
        return await this.settingsHandler.handleSetLanguageCallback(
          data.language, data.userId, data.chatId, data.messageId, data.callbackQueryId
        );
      
      // הודעות לא מזוהות
      case 'handleUnrecognizedText':
        return await this.commandHandler.handleUnrecognizedText(
          data.text, data.userId, data.chatId
        );
      
      case 'sendUnsupportedMessage':
        return await this.commandHandler.handleUnsupportedMessage(
          data.messageType, data.userId, data.chatId
        );
      
      case 'handleUnrecognizedCallback':
        return await this.commandHandler.handleUnrecognizedCallback(
          data.callbackData, data.userId, data.chatId, data.messageId, data.callbackQueryId
        );
      
      // שגיאות ניתוב
      case 'handleRoutingError':
        console.error('Routing error:', data.error);
        const context = this.messageRouter.createErrorContext(data.originalMessage);
        await this.errorHandler.logError(data.error, context);
        return false;
      
      default:
        console.warn(`Unknown action: ${action}`);
        return false;
    }
  }

  /**
   * קבלת סטטיסטיקות הבוט
   */
  getStats() {
    const uptime = this.stats.startTime ? 
      Date.now() - this.stats.startTime.getTime() : 0;
    
    return {
      isRunning: this.isRunning,
      uptime: uptime,
      uptimeFormatted: this._formatUptime(uptime),
      messagesProcessed: this.stats.messagesProcessed,
      errorsHandled: this.stats.errorsHandled,
      lastActivity: this.stats.lastActivity,
      startTime: this.stats.startTime,
      handlers: {
        command: this.commandHandler?.getHandlerStats(),
        licensePlate: this.licensePlateHandler?.getSearchStats(),
        settings: this.settingsHandler?.getHandlerStats()
      },
      router: this.messageRouter?.getRoutingStats(),
      errors: this.errorHandler?.getErrorStats()
    };
  }

  /**
   * עיצוב זמן פעילות
   * @private
   */
  _formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * בדיקת בריאות הבוט
   */
  async healthCheck() {
    try {
      if (!this.isRunning || !this.bot) {
        return { healthy: false, reason: 'Bot not running' };
      }
      
      // בדיקת חיבור ל-Telegram
      const me = await this.bot.getMe();
      
      return {
        healthy: true,
        botInfo: {
          id: me.id,
          username: me.username,
          firstName: me.first_name
        },
        stats: this.getStats()
      };
    } catch (error) {
      return {
        healthy: false,
        reason: error.message,
        error: error
      };
    }
  }

  /**
   * איפוס סטטיסטיקות
   */
  resetStats() {
    this.stats.messagesProcessed = 0;
    this.stats.errorsHandled = 0;
    this.stats.lastActivity = null;
    
    if (this.errorHandler) {
      this.errorHandler.resetErrorStats();
    }
    
    console.log('📊 Stats reset');
  }
}

module.exports = BotManager;