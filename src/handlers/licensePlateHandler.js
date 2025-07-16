const VehicleDataService = require('../services/vehicleDataService');
const UserSettingsService = require('../services/userSettingsService');
const MessageFormatter = require('../utils/messageFormatter');
const ErrorHandler = require('../utils/errorHandler');

/**
 * מטפל חיפוש רכב לפי מספר לוחית רישוי
 * מנהל את כל תהליך החיפוש מהתחלה ועד הצגת התוצאות
 */
class LicensePlateHandler {
  constructor(bot) {
    this.bot = bot;
    this.vehicleDataService = new VehicleDataService();
    this.userSettingsService = new UserSettingsService();
    this.messageFormatter = new MessageFormatter();
    this.errorHandler = new ErrorHandler();
    
    // מעקב אחר חיפושים פעילים (למניעת חיפושים כפולים)
    this.activeSearches = new Set();
  }

  /**
   * טיפול בחיפוש רכב לפי מספר לוחית רישוי
   * @param {string} licensePlate - מספר לוחית רישוי
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} originalMessageId - מזהה ההודעה המקורית (אופציונלי)
   * @returns {Promise<boolean>} האם החיפוש הצליח
   */
  async handleLicensePlateSearch(licensePlate, userId, chatId, originalMessageId = null) {
    const searchKey = `${userId}_${licensePlate}`;
    
    try {
      // בדיקה אם יש חיפוש פעיל עבור אותו משתמש ומספר רישוי
      if (this.activeSearches.has(searchKey)) {
        await this.bot.sendMessage(chatId, '⏳ חיפוש כבר מתבצע עבור מספר רישוי זה...');
        return false;
      }

      // סימון החיפוש כפעיל
      this.activeSearches.add(searchKey);

      // שליחת הודעת "מחפש..."
      const searchingMessage = this.messageFormatter.formatSearchingMessage();
      const sentMessage = await this.bot.sendMessage(chatId, searchingMessage.text, {
        reply_markup: searchingMessage.reply_markup
      });

      // קבלת הגדרות המשתמש
      const userSettings = await this.userSettingsService.getUserSettings(userId);

      // ביצוע החיפוש
      const searchResults = await this._performSearch(licensePlate);

      // עדכון ההודעה עם התוצאות
      await this._updateMessageWithResults(
        chatId,
        sentMessage.message_id,
        searchResults,
        userSettings,
        licensePlate
      );

      return true;

    } catch (error) {
      console.error('Error in license plate search:', error);
      
      // טיפול בשגיאה עם הודעה למשתמש
      await this.errorHandler.handleError(error, this.bot, chatId);
      return false;

    } finally {
      // הסרת החיפוש מהרשימה הפעילה
      this.activeSearches.delete(searchKey);
    }
  }

  /**
   * טיפול במספר לוחית רישוי לא תקין
   * @param {string} invalidInput - הקלט הלא תקין
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleInvalidLicensePlate(invalidInput, userId, chatId) {
    try {
      const error = ErrorHandler.createError(
        'INVALID_LICENSE_PLATE',
        `Invalid license plate: ${invalidInput}`
      );

      await this.errorHandler.handleError(error, this.bot, chatId);
      return true;

    } catch (error) {
      console.error('Error handling invalid license plate:', error);
      await this.errorHandler.handleError(error, this.bot, chatId);
      return false;
    }
  }

  /**
   * טיפול בקריאת callback של ביטול חיפוש
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleCancelSearchCallback(userId, chatId, messageId, callbackQueryId) {
    try {
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: 'החיפוש בוטל',
        show_alert: false
      });

      // עדכון ההודעה להודעת ביטול
      const cancelMessage = {
        text: '❌ **החיפוש בוטל**\n\nשלחו מספר לוחית רישוי חדש לחיפוש',
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔍 חיפוש חדש', callback_data: 'new_search' },
              { text: '❓ עזרה', callback_data: 'help' }
            ]
          ]
        }
      };

      await this.bot.editMessageText(cancelMessage.text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: cancelMessage.reply_markup,
        parse_mode: cancelMessage.parse_mode
      });

      return true;

    } catch (error) {
      console.error('Error handling cancel search callback:', error);
      await this.errorHandler.handleError(error, this.bot, chatId, messageId);
      return false;
    }
  }

  /**
   * טיפול בקריאת callback של חזרה על חיפוש
   * @param {string} userId - מזהה המשתמש
   * @param {string} chatId - מזהה הצ'אט
   * @param {number} messageId - מזהה ההודעה
   * @param {string} callbackQueryId - מזהה ה-callback query
   * @returns {Promise<boolean>} האם הטיפול הצליח
   */
  async handleRetrySearchCallback(userId, chatId, messageId, callbackQueryId) {
    try {
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: 'מנסה שוב...',
        show_alert: false
      });

      // הנחיה למשתמש לשלוח מספר רישוי שוב
      const retryMessage = {
        text: '🔄 **נסה שוב**\n\nשלחו מספר לוחית רישוי לחיפוש חוזר',
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '❓ עזרה', callback_data: 'help' },
              { text: '🏠 תפריט ראשי', callback_data: 'main_menu' }
            ]
          ]
        }
      };

      await this.bot.editMessageText(retryMessage.text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: retryMessage.reply_markup,
        parse_mode: retryMessage.parse_mode
      });

      return true;

    } catch (error) {
      console.error('Error handling retry search callback:', error);
      await this.errorHandler.handleError(error, this.bot, chatId, messageId);
      return false;
    }
  }

  /**
   * ביצוע החיפוש בפועל
   * @private
   */
  async _performSearch(licensePlate) {
    const results = {
      vehicleData: null,
      hasDisabilityPermit: false,
      searchTime: Date.now()
    };

    try {
      // חיפוש נתוני רכב
      console.log(`Searching for vehicle: ${licensePlate}`);
      results.vehicleData = await this.vehicleDataService.searchVehicle(licensePlate);

      // אם נמצא רכב, בדיקת תו נכה
      if (results.vehicleData) {
        console.log(`Vehicle found, checking disability permit for: ${licensePlate}`);
        results.hasDisabilityPermit = await this.vehicleDataService.checkDisabilityPermit(licensePlate);
      }

      results.searchTime = Date.now() - results.searchTime;
      console.log(`Search completed in ${results.searchTime}ms`);

      return results;

    } catch (error) {
      console.error('Error during search:', error);
      throw error;
    }
  }

  /**
   * עדכון ההודעה עם תוצאות החיפוש
   * @private
   */
  async _updateMessageWithResults(chatId, messageId, searchResults, userSettings, licensePlate) {
    try {
      let resultMessage;

      if (searchResults.vehicleData) {
        // נמצאו נתונים - הצגת התוצאות
        resultMessage = this.messageFormatter.formatVehicleResults(
          searchResults.vehicleData,
          userSettings,
          searchResults.hasDisabilityPermit
        );
      } else {
        // לא נמצאו נתונים
        resultMessage = this.messageFormatter.formatNoResultsMessage();
      }

      await this.bot.editMessageText(resultMessage.text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: resultMessage.reply_markup,
        parse_mode: resultMessage.parse_mode
      });

    } catch (error) {
      console.error('Error updating message with results:', error);
      
      // אם העדכון נכשל, ננסה לשלוח הודעה חדשה
      try {
        let resultMessage;
        if (searchResults.vehicleData) {
          resultMessage = this.messageFormatter.formatVehicleResults(
            searchResults.vehicleData,
            userSettings,
            searchResults.hasDisabilityPermit
          );
        } else {
          resultMessage = this.messageFormatter.formatNoResultsMessage();
        }

        await this.bot.sendMessage(chatId, resultMessage.text, {
          reply_markup: resultMessage.reply_markup,
          parse_mode: resultMessage.parse_mode
        });
      } catch (fallbackError) {
        console.error('Fallback message also failed:', fallbackError);
        throw error; // זרוק את השגיאה המקורית
      }
    }
  }

  /**
   * קבלת סטטיסטיקות החיפושים
   * @returns {Object} סטטיסטיקות
   */
  getSearchStats() {
    return {
      activeSearches: this.activeSearches.size,
      handlerType: 'LicensePlateHandler',
      serviceStats: this.vehicleDataService.getStats()
    };
  }

  /**
   * ניקוי חיפושים פעילים (לצורכי תחזוקה)
   */
  clearActiveSearches() {
    this.activeSearches.clear();
  }

  /**
   * בדיקה אם חיפוש פעיל עבור משתמש ומספר רישוי
   * @param {string} userId - מזהה המשתמש
   * @param {string} licensePlate - מספר לוחית רישוי
   * @returns {boolean} האם יש חיפוש פעיל
   */
  isSearchActive(userId, licensePlate) {
    const searchKey = `${userId}_${licensePlate}`;
    return this.activeSearches.has(searchKey);
  }

  /**
   * בדיקת תקינות הגדרות המטפל
   * @returns {boolean} האם ההגדרות תקינות
   */
  validateHandlerConfiguration() {
    return !!(this.bot && 
             this.vehicleDataService && 
             this.userSettingsService && 
             this.messageFormatter && 
             this.errorHandler);
  }
}

module.exports = LicensePlateHandler;