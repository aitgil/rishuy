const MessageFormatter = require('./messageFormatter');

/**
 * מטפל שגיאות מרכזי לבוט
 * מנהל את כל השגיאות ומחזיר הודעות מתאימות בעברית
 */
class ErrorHandler {
  constructor() {
    this.messageFormatter = new MessageFormatter();
    
    // מפת סוגי שגיאות לטיפול מתאים
    this.errorTypes = {
      // שגיאות רשת
      NETWORK_TIMEOUT: {
        isRetryable: true,
        severity: 'warning',
        userMessage: 'network_timeout'
      },
      NETWORK_ERROR: {
        isRetryable: true,
        severity: 'error',
        userMessage: 'network_error'
      },
      
      // שגיאות API
      API_SERVER_ERROR: {
        isRetryable: true,
        severity: 'error',
        userMessage: 'api_server_error'
      },
      API_NOT_FOUND: {
        isRetryable: false,
        severity: 'info',
        userMessage: 'no_results'
      },
      RATE_LIMIT_EXCEEDED: {
        isRetryable: true,
        severity: 'warning',
        userMessage: 'rate_limit'
      },
      API_INVALID_RESPONSE: {
        isRetryable: true,
        severity: 'error',
        userMessage: 'api_error'
      },
      
      // שגיאות קלט משתמש
      INVALID_LICENSE_PLATE: {
        isRetryable: false,
        severity: 'info',
        userMessage: 'invalid_license'
      },
      EMPTY_INPUT: {
        isRetryable: false,
        severity: 'info',
        userMessage: 'empty_input'
      },
      
      // שגיאות מערכת
      UNKNOWN_ERROR: {
        isRetryable: false,
        severity: 'error',
        userMessage: 'unknown_error'
      },
      INTERNAL_ERROR: {
        isRetryable: false,
        severity: 'critical',
        userMessage: 'internal_error'
      }
    };

    // מונה שגיאות לסטטיסטיקות
    this.errorStats = new Map();
  }

  /**
   * טיפול בשגיאה עם שליחת הודעה למשתמש
   * @param {Error} error - השגיאה
   * @param {Object} bot - אובייקט הבוט
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה לעדכון (אופציונלי)
   * @param {Object} context - הקשר נוסף (אופציונלי)
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleError(error, bot, chatId, messageId = null, context = {}) {
    try {
      // רישום השגיאה
      this._logError(error, context);
      
      // עדכון סטטיסטיקות
      this._updateErrorStats(error);
      
      // קבלת מידע על השגיאה
      const errorInfo = this._getErrorInfo(error);
      
      // יצירת הודעה למשתמש
      const userMessage = this._createUserMessage(error, errorInfo);
      
      // שליחה או עדכון הודעה
      if (messageId) {
        await this._editMessage(bot, chatId, messageId, userMessage);
      } else {
        await this._sendMessage(bot, chatId, userMessage);
      }
      
      return true;
    } catch (handlingError) {
      // אם הטיפול בשגיאה נכשל, נרשום את זה ונשלח הודעה בסיסית
      console.error('Error handling failed:', handlingError);
      await this._sendFallbackMessage(bot, chatId);
      return false;
    }
  }

  /**
   * טיפול בשגיאה ללא שליחת הודעה (לוגים בלבד)
   * @param {Error} error - השגיאה
   * @param {Object} context - הקשר נוסף
   */
  logError(error, context = {}) {
    this._logError(error, context);
    this._updateErrorStats(error);
  }

  /**
   * בדיקה אם שגיאה ניתנת לחזרה
   * @param {Error} error - השגיאה
   * @returns {boolean} האם ניתן לנסות שוב
   */
  isRetryableError(error) {
    const errorType = error.type || 'UNKNOWN_ERROR';
    const errorInfo = this.errorTypes[errorType];
    return errorInfo ? errorInfo.isRetryable : false;
  }

  /**
   * קבלת הודעת שגיאה למשתמש
   * @param {Error} error - השגיאה
   * @returns {Object} הודעה מעוצבת
   */
  getUserErrorMessage(error) {
    const errorInfo = this._getErrorInfo(error);
    return this._createUserMessage(error, errorInfo);
  }

  /**
   * יצירת הודעת שגיאה כללית
   * @param {string} message - הודעה מותאמת
   * @param {boolean} showRetry - האם להציג כפתור "נסה שוב"
   * @returns {Object} הודעה מעוצבת
   */
  createCustomErrorMessage(message, showRetry = false) {
    const buttons = [];
    
    if (showRetry) {
      buttons.push([
        this.messageFormatter.createInlineButton('🔄 נסה שוב', 'retry_action')
      ]);
    }
    
    buttons.push([
      this.messageFormatter.createInlineButton('🔍 חיפוש חדש', 'new_search'),
      this.messageFormatter.createInlineButton('❓ עזרה', 'help')
    ]);

    return {
      text: `❌ ${message}`,
      reply_markup: this.messageFormatter.createInlineKeyboard(buttons)
    };
  }

  /**
   * קבלת סטטיסטיקות שגיאות
   * @returns {Object} סטטיסטיקות
   */
  getErrorStats() {
    const stats = {};
    
    for (const [errorType, count] of this.errorStats.entries()) {
      stats[errorType] = {
        count,
        severity: this.errorTypes[errorType]?.severity || 'unknown',
        isRetryable: this.errorTypes[errorType]?.isRetryable || false
      };
    }
    
    return {
      totalErrors: Array.from(this.errorStats.values()).reduce((sum, count) => sum + count, 0),
      errorTypes: stats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * איפוס סטטיסטיקות שגיאות
   */
  resetErrorStats() {
    this.errorStats.clear();
  }

  /**
   * רישום שגיאה בלוגים
   * @private
   */
  _logError(error, context = {}) {
    const errorInfo = {
      type: error.type || 'UNKNOWN_ERROR',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    };

    // רישום לפי רמת חומרה
    const severity = this.errorTypes[errorInfo.type]?.severity || 'error';
    
    switch (severity) {
      case 'critical':
        console.error('CRITICAL ERROR:', errorInfo);
        break;
      case 'error':
        console.error('ERROR:', errorInfo);
        break;
      case 'warning':
        console.warn('WARNING:', errorInfo);
        break;
      case 'info':
        if (process.env.NODE_ENV !== 'production') {
          console.info('INFO:', errorInfo);
        }
        break;
      default:
        console.log('LOG:', errorInfo);
    }
  }

  /**
   * עדכון סטטיסטיקות שגיאות
   * @private
   */
  _updateErrorStats(error) {
    const errorType = error.type || 'UNKNOWN_ERROR';
    const currentCount = this.errorStats.get(errorType) || 0;
    this.errorStats.set(errorType, currentCount + 1);
  }

  /**
   * קבלת מידע על השגיאה
   * @private
   */
  _getErrorInfo(error) {
    const errorType = error.type || 'UNKNOWN_ERROR';
    return this.errorTypes[errorType] || this.errorTypes.UNKNOWN_ERROR;
  }

  /**
   * יצירת הודעה למשתמש
   * @private
   */
  _createUserMessage(error, errorInfo) {
    const errorType = error.type || 'UNKNOWN_ERROR';
    
    // מיפוי סוגי שגיאות להודעות
    const messageMap = {
      'network_timeout': 'NETWORK_TIMEOUT',
      'network_error': 'NETWORK_ERROR',
      'api_server_error': 'API_SERVER_ERROR',
      'rate_limit': 'RATE_LIMIT_EXCEEDED',
      'invalid_license': 'INVALID_LICENSE_PLATE',
      'no_results': 'NO_RESULTS',
      'api_error': 'API_ERROR'
    };

    const messageType = messageMap[errorInfo.userMessage] || 'UNKNOWN_ERROR';
    return this.messageFormatter.formatErrorMessage(messageType);
  }

  /**
   * שליחת הודעה חדשה
   * @private
   */
  async _sendMessage(bot, chatId, message) {
    try {
      await bot.sendMessage(chatId, message.text, {
        reply_markup: message.reply_markup,
        parse_mode: message.parse_mode
      });
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
      throw sendError;
    }
  }

  /**
   * עדכון הודעה קיימת
   * @private
   */
  async _editMessage(bot, chatId, messageId, message) {
    try {
      await bot.editMessageText(message.text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: message.reply_markup,
        parse_mode: message.parse_mode
      });
    } catch (editError) {
      // אם העדכון נכשל, ננסה לשלוח הודעה חדשה
      console.warn('Failed to edit message, sending new one:', editError);
      await this._sendMessage(bot, chatId, message);
    }
  }

  /**
   * שליחת הודעת חירום בסיסית
   * @private
   */
  async _sendFallbackMessage(bot, chatId) {
    try {
      await bot.sendMessage(chatId, '❌ אירעה שגיאה לא צפויה. אנא נסו שוב מאוחר יותר.');
    } catch (fallbackError) {
      console.error('Even fallback message failed:', fallbackError);
    }
  }

  /**
   * יצירת שגיאה מותאמת
   * @param {string} type - סוג השגיאה
   * @param {string} message - הודעת השגיאה
   * @param {Object} additionalData - נתונים נוספים
   * @returns {Error} שגיאה מותאמת
   */
  static createError(type, message, additionalData = {}) {
    const error = new Error(message);
    error.type = type;
    Object.assign(error, additionalData);
    return error;
  }

  /**
   * עטיפת פונקציה עם טיפול בשגיאות
   * @param {Function} fn - הפונקציה לעטיפה
   * @param {Object} errorContext - הקשר לשגיאות
   * @returns {Function} פונקציה עטופה
   */
  static wrapWithErrorHandling(fn, errorContext = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        // הוספת הקשר לשגיאה
        error.context = { ...error.context, ...errorContext };
        throw error;
      }
    };
  }
}

module.exports = ErrorHandler;