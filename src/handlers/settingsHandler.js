const UserSettingsService = require('../services/userSettingsService');
const MessageFormatter = require('../utils/messageFormatter');
const ErrorHandler = require('../utils/errorHandler');
const UserSettings = require('../models/UserSettings');

/**
 * מטפל הגדרות הבוט
 * מנהל את כל פעולות ההגדרות - שדות תצוגה, שפה, איפוס וכו'
 */
class SettingsHandler {
  constructor(bot) {
    this.bot = bot;
    this.userSettingsService = new UserSettingsService();
    this.messageFormatter = new MessageFormatter();
    this.errorHandler = new ErrorHandler();
  }

  /**
   * טיפול בקריאת callback של הגדרות שדות תצוגה
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleFieldsSettingsCallback(userId, chatId, messageId, callbackQueryId) {
    try {
      await this.bot.answerCallbackQuery(callbackQueryId);
      
      const userSettings = await this.userSettingsService.getUserSettings(userId);
      const fieldsMessage = this.messageFormatter.formatFieldsMenu(userSettings);
      
      await this.bot.editMessageText(fieldsMessage.text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: fieldsMessage.reply_markup,
        parse_mode: fieldsMessage.parse_mode
      });
      
      return true;
    } catch (error) {
      console.error('Error handling fields settings callback:', error);
      await this.errorHandler.handleError(error, this.bot, chatId, messageId);
      return false;
    }
  }

  /**
   * טיפול בקריאת callback של הגדרות שפה
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleLanguageSettingsCallback(userId, chatId, messageId, callbackQueryId) {
    try {
      await this.bot.answerCallbackQuery(callbackQueryId);
      
      const userSettings = await this.userSettingsService.getUserSettings(userId);
      const languageMessage = this.messageFormatter.formatLanguageMenu(userSettings);
      
      await this.bot.editMessageText(languageMessage.text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: languageMessage.reply_markup,
        parse_mode: languageMessage.parse_mode
      });
      
      return true;
    } catch (error) {
      console.error('Error handling language settings callback:', error);
      await this.errorHandler.handleError(error, this.bot, chatId, messageId);
      return false;
    }
  }

  /**
   * טיפול בקריאת callback של איפוס הגדרות
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleResetSettingsCallback(userId, chatId, messageId, callbackQueryId) {
    try {
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: 'מאפס הגדרות...',
        show_alert: false
      });
      
      // איפוס ההגדרות
      const success = await this.userSettingsService.resetUserToDefaults(userId);
      
      if (success) {
        const resetMessage = this.messageFormatter.formatResetConfirmation();
        
        await this.bot.editMessageText(resetMessage.text, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: resetMessage.reply_markup
        });
      } else {
        throw new Error('Failed to reset user settings');
      }
      
      return true;
    } catch (error) {
      console.error('Error handling reset settings callback:', error);
      await this.errorHandler.handleError(error, this.bot, chatId, messageId);
      return false;
    }
  }

  /**
   * טיפול בקריאת callback של החלפת שדה תצוגה
   * @param {string} fieldName - שם השדה
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleToggleFieldCallback(fieldName, userId, chatId, messageId, callbackQueryId) {
    try {
      const userSettings = await this.userSettingsService.getUserSettings(userId);
      const currentValue = userSettings.displayFields[fieldName];
      
      if (currentValue === undefined) {
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: 'שדה לא מזוהה',
          show_alert: true
        });
        return false;
      }
      
      // החלפת הערך
      const newValue = !currentValue;
      const success = await this.userSettingsService.updateDisplayField(userId, fieldName, newValue);
      
      if (success) {
        // אישור קבלת ה-callback עם הודעה על השינוי
        const fieldDescriptions = UserSettings.getFieldDescriptions();
        const fieldDescription = fieldDescriptions[fieldName] || fieldName;
        const statusText = newValue ? 'הופעל' : 'בוטל';
        
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: `${fieldDescription} ${statusText}`,
          show_alert: false
        });
        
        // עדכון התפריט
        const updatedSettings = await this.userSettingsService.getUserSettings(userId);
        const fieldsMessage = this.messageFormatter.formatFieldsMenu(updatedSettings);
        
        await this.bot.editMessageText(fieldsMessage.text, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: fieldsMessage.reply_markup,
          parse_mode: fieldsMessage.parse_mode
        });
      } else {
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: 'שגיאה בעדכון השדה',
          show_alert: true
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error handling toggle field callback:', error);
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: 'אירעה שגיאה',
        show_alert: true
      });
      return false;
    }
  }

  /**
   * טיפול בקריאת callback של שמירת שדות
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleSaveFieldsCallback(userId, chatId, messageId, callbackQueryId) {
    try {
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: 'ההגדרות נשמרו!',
        show_alert: false
      });
      
      const saveMessage = this.messageFormatter.formatSaveConfirmation();
      
      await this.bot.editMessageText(saveMessage.text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: saveMessage.reply_markup
      });
      
      return true;
    } catch (error) {
      console.error('Error handling save fields callback:', error);
      await this.errorHandler.handleError(error, this.bot, chatId, messageId);
      return false;
    }
  }

  /**
   * טיפול בקריאת callback של הגדרת שפה
   * @param {string} language - קוד השפה
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleSetLanguageCallback(language, userId, chatId, messageId, callbackQueryId) {
    try {
      const success = await this.userSettingsService.updateUserLanguage(userId, language);
      
      if (success) {
        const languageName = language === 'he' ? 'עברית' : 'English';
        
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: `שפה שונתה ל${languageName}`,
          show_alert: false
        });
        
        // עדכון התפריט עם השפה החדשה
        const updatedSettings = await this.userSettingsService.getUserSettings(userId);
        const languageMessage = this.messageFormatter.formatLanguageMenu(updatedSettings);
        
        await this.bot.editMessageText(languageMessage.text, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: languageMessage.reply_markup,
          parse_mode: languageMessage.parse_mode
        });
      } else {
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: 'שגיאה בעדכון השפה',
          show_alert: true
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error handling set language callback:', error);
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: 'אירעה שגיאה',
        show_alert: true
      });
      return false;
    }
  }

  /**
   * טיפול בקריאת callback של הגדרות מצב קומפקטי
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleCompactModeCallback(userId, chatId, messageId, callbackQueryId) {
    try {
      const userSettings = await this.userSettingsService.getUserSettings(userId);
      const newCompactMode = !userSettings.compactMode;
      
      const success = await this.userSettingsService.updateCompactMode(userId, newCompactMode);
      
      if (success) {
        const statusText = newCompactMode ? 'הופעל' : 'בוטל';
        
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: `מצב קומפקטי ${statusText}`,
          show_alert: false
        });
        
        // חזרה לתפריט הגדרות ראשי
        const updatedSettings = await this.userSettingsService.getUserSettings(userId);
        const settingsMessage = this.messageFormatter.formatSettingsMenu(updatedSettings);
        
        await this.bot.editMessageText(settingsMessage.text, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: settingsMessage.reply_markup,
          parse_mode: settingsMessage.parse_mode
        });
      } else {
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: 'שגיאה בעדכון המצב',
          show_alert: true
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error handling compact mode callback:', error);
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: 'אירעה שגיאה',
        show_alert: true
      });
      return false;
    }
  }

  /**
   * טיפול בקריאת callback של הגדרות התראות
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleNotificationsCallback(userId, chatId, messageId, callbackQueryId) {
    try {
      const userSettings = await this.userSettingsService.getUserSettings(userId);
      const newNotifications = !userSettings.notifications;
      
      // עדכון הגדרת ההתראות
      userSettings.notifications = newNotifications;
      const success = await this.userSettingsService.saveUserSettings(userSettings);
      
      if (success) {
        const statusText = newNotifications ? 'הופעלו' : 'בוטלו';
        
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: `התראות ${statusText}`,
          show_alert: false
        });
        
        // חזרה לתפריט הגדרות ראשי
        const updatedSettings = await this.userSettingsService.getUserSettings(userId);
        const settingsMessage = this.messageFormatter.formatSettingsMenu(updatedSettings);
        
        await this.bot.editMessageText(settingsMessage.text, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: settingsMessage.reply_markup,
          parse_mode: settingsMessage.parse_mode
        });
      } else {
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: 'שגיאה בעדכון ההתראות',
          show_alert: true
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error handling notifications callback:', error);
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: 'אירעה שגיאה',
        show_alert: true
      });
      return false;
    }
  }

  /**
   * קבלת סטטיסטיקות המטפל
   * @returns {Object} סטטיסטיקות
   */
  getHandlerStats() {
    return {
      handlerType: 'SettingsHandler',
      supportedCallbacks: [
        'settings_fields',
        'settings_language', 
        'settings_compact',
        'settings_notifications',
        'settings_reset',
        'toggle_field_*',
        'save_fields',
        'set_language_*'
      ],
      availableFields: Object.keys(UserSettings.getFieldDescriptions()).length
    };
  }

  /**
   * בדיקת תקינות הגדרות המטפל
   * @returns {boolean} האם ההגדרות תקינות
   */
  validateHandlerConfiguration() {
    return !!(this.bot && 
             this.userSettingsService && 
             this.messageFormatter && 
             this.errorHandler);
  }

  /**
   * קבלת רשימת שדות זמינים
   * @returns {Object} רשימת שדות עם תיאורים
   */
  getAvailableFields() {
    return UserSettings.getFieldDescriptions();
  }

  /**
   * בדיקה אם שדה קיים
   * @param {string} fieldName - שם השדה
   * @returns {boolean} האם השדה קיים
   */
  isValidField(fieldName) {
    const availableFields = this.getAvailableFields();
    return availableFields.hasOwnProperty(fieldName);
  }
}

module.exports = SettingsHandler;