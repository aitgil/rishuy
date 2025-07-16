const ErrorHandler = require('./errorHandler');

/**
 * מנתב הודעות - מזהה סוג הודעה ומנתב לטיפול המתאים
 */
class MessageRouter {
  constructor() {
    this.errorHandler = new ErrorHandler();
    
    // רגקסים לזיהוי סוגי הודעות
    this.patterns = {
      // מספר לוחית רישוי ישראלי (7-8 ספרות עם או בלי מקפים/רווחים)
      licensePlate: /^[\d\s\-\.]{7,11}$/,
      
      // פקודות בוט
      startCommand: /^\/start$/,
      helpCommand: /^\/help$/,
      settingsCommand: /^\/settings$/,
      
      // callback data patterns
      callbackData: {
        help: /^help$/,
        settings: /^settings$/,
        newSearch: /^new_search$/,
        mainMenu: /^main_menu$/,
        cancelSearch: /^cancel_search$/,
        retrySearch: /^retry_search$/,
        
        // הגדרות
        settingsFields: /^settings_fields$/,
        settingsLanguage: /^settings_language$/,
        settingsCompact: /^settings_compact$/,
        settingsNotifications: /^settings_notifications$/,
        settingsReset: /^settings_reset$/,
        
        // שדות תצוגה
        toggleField: /^toggle_field_(.+)$/,
        saveFields: /^save_fields$/,
        
        // שפה
        setLanguage: /^set_language_(.+)$/
      }
    };
  }

  /**
   * ניתוב הודעה לטיפול המתאים
   * @param {Object} message - הודעת טלגרם
   * @returns {Object} מידע על סוג ההודעה והפעולה הנדרשת
   */
  routeMessage(message) {
    try {
      // בדיקה אם זו הודעת טקסט
      if (message.text) {
        return this._routeTextMessage(message);
      }
      
      // בדיקה אם זו callback query
      if (message.data) {
        return this._routeCallbackQuery(message);
      }
      
      // סוג הודעה לא נתמך
      return {
        type: 'UNSUPPORTED',
        action: 'sendUnsupportedMessage',
        data: { messageType: typeof message }
      };
      
    } catch (error) {
      console.error('Error routing message:', error);
      return {
        type: 'ERROR',
        action: 'handleRoutingError',
        data: { error, originalMessage: message }
      };
    }
  }

  /**
   * ניתוב הודעת טקסט
   * @private
   */
  _routeTextMessage(message) {
    const text = message.text.trim();
    
    // פקודות בוט
    if (this.patterns.startCommand.test(text)) {
      return {
        type: 'COMMAND',
        action: 'handleStartCommand',
        data: { userId: message.from.id, chatId: message.chat.id }
      };
    }
    
    if (this.patterns.helpCommand.test(text)) {
      return {
        type: 'COMMAND',
        action: 'handleHelpCommand',
        data: { userId: message.from.id, chatId: message.chat.id }
      };
    }
    
    if (this.patterns.settingsCommand.test(text)) {
      return {
        type: 'COMMAND',
        action: 'handleSettingsCommand',
        data: { userId: message.from.id, chatId: message.chat.id }
      };
    }
    
    // בדיקת מספר לוחית רישוי
    if (this.patterns.licensePlate.test(text)) {
      const cleanedPlate = this._cleanLicensePlate(text);
      
      if (this._isValidLicensePlate(cleanedPlate)) {
        return {
          type: 'LICENSE_PLATE_SEARCH',
          action: 'handleLicensePlateSearch',
          data: {
            licensePlate: cleanedPlate,
            originalText: text,
            userId: message.from.id,
            chatId: message.chat.id,
            messageId: message.message_id
          }
        };
      } else {
        return {
          type: 'INVALID_LICENSE_PLATE',
          action: 'handleInvalidLicensePlate',
          data: {
            invalidInput: text,
            userId: message.from.id,
            chatId: message.chat.id
          }
        };
      }
    }
    
    // טקסט לא מזוהה
    return {
      type: 'UNRECOGNIZED_TEXT',
      action: 'handleUnrecognizedText',
      data: {
        text: text,
        userId: message.from.id,
        chatId: message.chat.id
      }
    };
  }

  /**
   * ניתוב callback query
   * @private
   */
  _routeCallbackQuery(callbackQuery) {
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    
    // פקודות בסיסיות
    if (this.patterns.callbackData.help.test(data)) {
      return {
        type: 'CALLBACK',
        action: 'handleHelpCallback',
        data: { userId, chatId, messageId, callbackQueryId: callbackQuery.id }
      };
    }
    
    if (this.patterns.callbackData.settings.test(data)) {
      return {
        type: 'CALLBACK',
        action: 'handleSettingsCallback',
        data: { userId, chatId, messageId, callbackQueryId: callbackQuery.id }
      };
    }
    
    if (this.patterns.callbackData.newSearch.test(data)) {
      return {
        type: 'CALLBACK',
        action: 'handleNewSearchCallback',
        data: { userId, chatId, messageId, callbackQueryId: callbackQuery.id }
      };
    }
    
    if (this.patterns.callbackData.mainMenu.test(data)) {
      return {
        type: 'CALLBACK',
        action: 'handleMainMenuCallback',
        data: { userId, chatId, messageId, callbackQueryId: callbackQuery.id }
      };
    }
    
    if (this.patterns.callbackData.cancelSearch.test(data)) {
      return {
        type: 'CALLBACK',
        action: 'handleCancelSearchCallback',
        data: { userId, chatId, messageId, callbackQueryId: callbackQuery.id }
      };
    }
    
    if (this.patterns.callbackData.retrySearch.test(data)) {
      return {
        type: 'CALLBACK',
        action: 'handleRetrySearchCallback',
        data: { userId, chatId, messageId, callbackQueryId: callbackQuery.id }
      };
    }
    
    // הגדרות
    if (this.patterns.callbackData.settingsFields.test(data)) {
      return {
        type: 'SETTINGS',
        action: 'handleFieldsSettingsCallback',
        data: { userId, chatId, messageId, callbackQueryId: callbackQuery.id }
      };
    }
    
    if (this.patterns.callbackData.settingsLanguage.test(data)) {
      return {
        type: 'SETTINGS',
        action: 'handleLanguageSettingsCallback',
        data: { userId, chatId, messageId, callbackQueryId: callbackQuery.id }
      };
    }
    
    if (this.patterns.callbackData.settingsReset.test(data)) {
      return {
        type: 'SETTINGS',
        action: 'handleResetSettingsCallback',
        data: { userId, chatId, messageId, callbackQueryId: callbackQuery.id }
      };
    }
    
    // שדות תצוגה
    const toggleFieldMatch = data.match(this.patterns.callbackData.toggleField);
    if (toggleFieldMatch) {
      return {
        type: 'FIELD_TOGGLE',
        action: 'handleToggleFieldCallback',
        data: {
          fieldName: toggleFieldMatch[1],
          userId,
          chatId,
          messageId,
          callbackQueryId: callbackQuery.id
        }
      };
    }
    
    if (this.patterns.callbackData.saveFields.test(data)) {
      return {
        type: 'FIELD_SAVE',
        action: 'handleSaveFieldsCallback',
        data: { userId, chatId, messageId, callbackQueryId: callbackQuery.id }
      };
    }
    
    // שפה
    const setLanguageMatch = data.match(this.patterns.callbackData.setLanguage);
    if (setLanguageMatch) {
      return {
        type: 'LANGUAGE_SET',
        action: 'handleSetLanguageCallback',
        data: {
          language: setLanguageMatch[1],
          userId,
          chatId,
          messageId,
          callbackQueryId: callbackQuery.id
        }
      };
    }
    
    // callback לא מזוהה
    return {
      type: 'UNRECOGNIZED_CALLBACK',
      action: 'handleUnrecognizedCallback',
      data: {
        callbackData: data,
        userId,
        chatId,
        messageId,
        callbackQueryId: callbackQuery.id
      }
    };
  }

  /**
   * ניקוי מספר לוחית רישוי
   * @private
   */
  _cleanLicensePlate(licensePlate) {
    if (!licensePlate || typeof licensePlate !== 'string') {
      return '';
    }

    // הסרת רווחים, מקפים ונקודות
    return licensePlate
      .replace(/[\s\-\.]/g, '')
      .replace(/[^\d]/g, '') // השארת ספרות בלבד
      .trim();
  }

  /**
   * בדיקת תקינות מספר לוחית רישוי ישראלי
   * @private
   */
  _isValidLicensePlate(licensePlate) {
    if (!licensePlate || typeof licensePlate !== 'string') {
      return false;
    }

    // מספר לוחית רישוי ישראלי: 7-8 ספרות
    const cleanPlate = licensePlate.replace(/\D/g, '');
    return cleanPlate.length >= 7 && cleanPlate.length <= 8;
  }

  /**
   * בדיקה אם הודעה היא פקודת בוט
   * @param {string} text - טקסט ההודעה
   * @returns {boolean} האם זו פקודת בוט
   */
  isCommand(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }
    
    return text.startsWith('/');
  }

  /**
   * בדיקה אם טקסט הוא מספר לוחית רישוי פוטנציאלי
   * @param {string} text - הטקסט לבדיקה
   * @returns {boolean} האם זה מספר רישוי פוטנציאלי
   */
  isPotentialLicensePlate(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }
    
    return this.patterns.licensePlate.test(text.trim());
  }

  /**
   * קבלת רשימת פקודות נתמכות
   * @returns {Array} רשימת פקודות
   */
  getSupportedCommands() {
    return [
      { command: '/start', description: 'התחלת השימוש בבוט' },
      { command: '/help', description: 'הצגת עזרה והוראות שימוש' },
      { command: '/settings', description: 'הגדרות הבוט' }
    ];
  }

  /**
   * קבלת סטטיסטיקות ניתוב
   * @returns {Object} סטטיסטיקות
   */
  getRoutingStats() {
    // בפרויקט אמיתי זה יהיה מונה שנשמר
    return {
      supportedMessageTypes: [
        'COMMAND',
        'LICENSE_PLATE_SEARCH',
        'CALLBACK',
        'SETTINGS',
        'FIELD_TOGGLE',
        'FIELD_SAVE',
        'LANGUAGE_SET'
      ],
      supportedCommands: this.getSupportedCommands().length,
      callbackPatterns: Object.keys(this.patterns.callbackData).length
    };
  }

  /**
   * בדיקת תקינות נתוני ניתוב
   * @param {Object} routingResult - תוצאת הניתוב
   * @returns {boolean} האם התוצאה תקינה
   */
  validateRoutingResult(routingResult) {
    if (!routingResult || typeof routingResult !== 'object') {
      return false;
    }
    
    const requiredFields = ['type', 'action', 'data'];
    return requiredFields.every(field => routingResult.hasOwnProperty(field));
  }

  /**
   * יצירת הקשר לשגיאות ניתוב
   * @param {Object} message - ההודעה המקורית
   * @returns {Object} הקשר לשגיאה
   */
  createErrorContext(message) {
    return {
      messageType: message.text ? 'text' : (message.data ? 'callback' : 'unknown'),
      userId: message.from?.id,
      chatId: message.chat?.id || message.message?.chat?.id,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = MessageRouter;