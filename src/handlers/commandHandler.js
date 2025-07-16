const MessageFormatter = require('../utils/messageFormatter');
const UserSettingsService = require('../services/userSettingsService');
const ErrorHandler = require('../utils/errorHandler');

/**
 * מטפל פקודות בסיסיות של הבוט
 * מנהל את פקודות /start, /help והתפריט הראשי
 */
class CommandHandler {
  constructor(bot) {
    this.bot = bot;
    this.messageFormatter = new MessageFormatter();
    this.userSettingsService = new UserSettingsService();
    this.errorHandler = new ErrorHandler();
  }

  /**
   * טיפול בפקודת /start
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleStartCommand(userId, chatId) {
    try {
      // יצירת או קבלת הגדרות משתמש
      await this.userSettingsService.getUserSettings(userId);
      
      // שליחת הודעת ברוכים הבאים
      const welcomeMessage = this.messageFormatter.formatWelcomeMessage();
      
      await this.bot.sendMessage(chatId, welcomeMessage.text, {
        reply_markup: welcomeMessage.reply_markup,
        parse_mode: welcomeMessage.parse_mode
      });
      
      return true;
    } catch (error) {
      console.error('Error handling start command:', error);
      await this.errorHandler.handleError(error, this.bot, chatId);
      return false;
    }
  }

  /**
   * טיפול בפקודת /help
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleHelpCommand(userId, chatId) {
    try {
      const helpMessage = this.messageFormatter.formatHelpMessage();
      
      await this.bot.sendMessage(chatId, helpMessage.text, {
        reply_markup: helpMessage.reply_markup,
        parse_mode: helpMessage.parse_mode
      });
      
      return true;
    } catch (error) {
      console.error('Error handling help command:', error);
      await this.errorHandler.handleError(error, this.bot, chatId);
      return false;
    }
  }

  /**
   * טיפול בפקודת /settings
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleSettingsCommand(userId, chatId) {
    try {
      const userSettings = await this.userSettingsService.getUserSettings(userId);
      const settingsMessage = this.messageFormatter.formatSettingsMenu(userSettings);
      
      await this.bot.sendMessage(chatId, settingsMessage.text, {
        reply_markup: settingsMessage.reply_markup,
        parse_mode: settingsMessage.parse_mode
      });
      
      return true;
    } catch (error) {
      console.error('Error handling settings command:', error);
      await this.errorHandler.handleError(error, this.bot, chatId);
      return false;
    }
  }

  /**
   * טיפול בקריאת callback של עזרה
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleHelpCallback(userId, chatId, messageId, callbackQueryId) {
    try {
      // אישור קבלת ה-callback
      await this.bot.answerCallbackQuery(callbackQueryId);
      
      // עדכון ההודעה עם תוכן העזרה
      const helpMessage = this.messageFormatter.formatHelpMessage();
      
      await this.bot.editMessageText(helpMessage.text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: helpMessage.reply_markup,
        parse_mode: helpMessage.parse_mode
      });
      
      return true;
    } catch (error) {
      console.error('Error handling help callback:', error);
      await this.errorHandler.handleError(error, this.bot, chatId, messageId);
      return false;
    }
  }

  /**
   * טיפול בקריאת callback של הגדרות
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleSettingsCallback(userId, chatId, messageId, callbackQueryId) {
    try {
      await this.bot.answerCallbackQuery(callbackQueryId);
      
      const userSettings = await this.userSettingsService.getUserSettings(userId);
      const settingsMessage = this.messageFormatter.formatSettingsMenu(userSettings);
      
      await this.bot.editMessageText(settingsMessage.text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: settingsMessage.reply_markup,
        parse_mode: settingsMessage.parse_mode
      });
      
      return true;
    } catch (error) {
      console.error('Error handling settings callback:', error);
      await this.errorHandler.handleError(error, this.bot, chatId, messageId);
      return false;
    }
  }

  /**
   * טיפול בקריאת callback של חיפוש חדש
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleNewSearchCallback(userId, chatId, messageId, callbackQueryId) {
    try {
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: 'שלחו מספר לוחית רישוי לחיפוש',
        show_alert: false
      });
      
      // עדכון ההודעה להודעת הנחיה לחיפוש חדש
      const instructionMessage = {
        text: '🔍 **חיפוש חדש**\n\nשלחו מספר לוחית רישוי (7-8 ספרות) לחיפוש:\n\n💡 דוגמה: 12345678',
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '❓ עזרה', callback_data: 'help' },
              { text: '⚙️ הגדרות', callback_data: 'settings' }
            ],
            [
              { text: '🏠 תפריט ראשי', callback_data: 'main_menu' }
            ]
          ]
        }
      };
      
      await this.bot.editMessageText(instructionMessage.text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: instructionMessage.reply_markup,
        parse_mode: instructionMessage.parse_mode
      });
      
      return true;
    } catch (error) {
      console.error('Error handling new search callback:', error);
      await this.errorHandler.handleError(error, this.bot, chatId, messageId);
      return false;
    }
  }

  /**
   * טיפול בקריאת callback של תפריט ראשי
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleMainMenuCallback(userId, chatId, messageId, callbackQueryId) {
    try {
      await this.bot.answerCallbackQuery(callbackQueryId);
      
      // חזרה להודעת ברוכים הבאים
      const welcomeMessage = this.messageFormatter.formatWelcomeMessage();
      
      await this.bot.editMessageText(welcomeMessage.text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: welcomeMessage.reply_markup,
        parse_mode: welcomeMessage.parse_mode
      });
      
      return true;
    } catch (error) {
      console.error('Error handling main menu callback:', error);
      await this.errorHandler.handleError(error, this.bot, chatId, messageId);
      return false;
    }
  }

  /**
   * טיפול בטקסט לא מזוהה
   * @param {string} text - הטקסט שנשלח
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleUnrecognizedText(text, userId, chatId) {
    try {
      const message = {
        text: '❓ לא הבנתי את ההודעה\n\nאנא שלחו:\n• מספר לוחית רישוי (7-8 ספרות)\n• או השתמשו בכפתורים למטה',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '❓ עזרה', callback_data: 'help' },
              { text: '⚙️ הגדרות', callback_data: 'settings' }
            ],
            [
              { text: '🏠 תפריט ראשי', callback_data: 'main_menu' }
            ]
          ]
        }
      };
      
      await this.bot.sendMessage(chatId, message.text, {
        reply_markup: message.reply_markup
      });
      
      return true;
    } catch (error) {
      console.error('Error handling unrecognized text:', error);
      await this.errorHandler.handleError(error, this.bot, chatId);
      return false;
    }
  }

  /**
   * טיפול בהודעה לא נתמכת (תמונה, קובץ וכו')
   * @param {string} messageType - סוג ההודעה
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleUnsupportedMessage(messageType, userId, chatId) {
    try {
      const message = {
        text: '📎 סוג הודעה לא נתמך\n\nהבוט תומך רק בהודעות טקסט.\nאנא שלחו מספר לוחית רישוי או השתמשו בכפתורים.',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '❓ עזרה', callback_data: 'help' },
              { text: '🔍 חיפוש חדש', callback_data: 'new_search' }
            ]
          ]
        }
      };
      
      await this.bot.sendMessage(chatId, message.text, {
        reply_markup: message.reply_markup
      });
      
      return true;
    } catch (error) {
      console.error('Error handling unsupported message:', error);
      await this.errorHandler.handleError(error, this.bot, chatId);
      return false;
    }
  }

  /**
   * טיפול בקריאת callback לא מזוהה
   * @param {string} callbackData - נתוני ה-callback
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleUnrecognizedCallback(callbackData, userId, chatId, messageId, callbackQueryId) {
    try {
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: 'פעולה לא מזוהה',
        show_alert: true
      });
      
      // לא נעדכן את ההודעה, רק נודיע למשתמש
      return true;
    } catch (error) {
      console.error('Error handling unrecognized callback:', error);
      await this.errorHandler.handleError(error, this.bot, chatId, messageId);
      return false;
    }
  }

  /**
   * קבלת סטטיסטיקות המטפל
   * @returns {Object} סטטיסטיקות
   */
  getHandlerStats() {
    return {
      supportedCommands: ['/start', '/help', '/settings'],
      supportedCallbacks: [
        'help', 'settings', 'new_search', 'main_menu'
      ],
      handlerType: 'CommandHandler'
    };
  }

  /**
   * בדיקת תקינות הגדרות הבוט
   * @returns {boolean} האם ההגדרות תקינות
   */
  validateBotConfiguration() {
    return !!(this.bot && 
             this.messageFormatter && 
             this.userSettingsService && 
             this.errorHandler);
  }
}

module.exports = CommandHandler;