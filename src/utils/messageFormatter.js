const UserSettings = require('../models/UserSettings');

/**
 * מעצב הודעות בעברית עם כפתורים אינטראקטיביים
 */
class MessageFormatter {
  constructor() {
    // תבניות הודעות בעברית
    this.templates = {
      welcome: '🚗 ברוכים הבאים לבוט חיפוש רכבים!\n\nשלחו מספר לוחית רישוי וקבלו את כל הפרטים על הרכב.',
      help: '📋 איך להשתמש בבוט:\n\n• שלחו מספר לוחית רישוי (7-8 ספרות)\n• השתמשו בכפתורים למעבר מהיר\n• עברו להגדרות כדי להתאים את התצוגה\n\n💡 דוגמה: 12345678',
      searching: '🔍 מחפש נתונים...',
      noResults: '❌ לא נמצאו נתונים עבור מספר לוחית רישוי זה',
      invalidLicense: '⚠️ מספר לוחית רישוי לא תקין\n\nאנא הכניסו מספר של 7-8 ספרות',
      error: '❌ אירעה שגיאה\n\nאנא נסו שוב מאוחר יותר',
      settingsSaved: '✅ ההגדרות נשמרו בהצלחה!',
      settingsReset: '🔄 ההגדרות אופסו לברירת המחדל'
    };

    // כפתורים בעברית
    this.buttons = {
      newSearch: '🔍 חיפוש חדש',
      settings: '⚙️ הגדרות',
      help: '❓ עזרה',
      back: '◀️ חזור',
      reset: '🔄 איפוס',
      save: '💾 שמור',
      cancel: '❌ ביטול',
      retry: '🔄 נסה שוב',
      mainMenu: '🏠 תפריט ראשי'
    };
  }

  /**
   * עיצוב הודעת ברוכים הבאים
   * @returns {Object} הודעה עם כפתורים
   */
  formatWelcomeMessage() {
    return {
      text: this.templates.welcome,
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.buttons.help, callback_data: 'help' },
            { text: this.buttons.settings, callback_data: 'settings' }
          ]
        ]
      }
    };
  }

  /**
   * עיצוב הודעת עזרה
   * @returns {Object} הודעה עם כפתורים
   */
  formatHelpMessage() {
    return {
      text: this.templates.help,
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.buttons.settings, callback_data: 'settings' },
            { text: this.buttons.mainMenu, callback_data: 'main_menu' }
          ]
        ]
      }
    };
  }

  /**
   * עיצוב הודעת חיפוש
   * @returns {Object} הודעת חיפוש
   */
  formatSearchingMessage() {
    return {
      text: this.templates.searching,
      reply_markup: {
        inline_keyboard: [
          [{ text: this.buttons.cancel, callback_data: 'cancel_search' }]
        ]
      }
    };
  }

  /**
   * עיצוב תוצאות חיפוש רכב
   * @param {VehicleData} vehicleData - נתוני הרכב
   * @param {UserSettings} userSettings - הגדרות המשתמש
   * @param {boolean} hasDisabilityPermit - האם יש תו נכה
   * @returns {Object} הודעה מעוצבת עם כפתורים
   */
  formatVehicleResults(vehicleData, userSettings, hasDisabilityPermit = false) {
    if (!vehicleData || !vehicleData.isValid()) {
      return this.formatNoResultsMessage();
    }

    // כותרת
    let text = `🚗 **${vehicleData.getTitle()}**\n`;
    text += `🔢 לוחית רישוי: **${vehicleData.licensePlate}**\n\n`;

    // נתוני הרכב
    const vehicleInfo = vehicleData.toHebrewDisplay(userSettings);
    if (vehicleInfo && vehicleInfo !== 'לא נמצאו נתונים') {
      text += vehicleInfo;
    }

    // תו נכה
    if (userSettings.displayFields.disabilityPermit) {
      text += '\n\n';
      if (hasDisabilityPermit) {
        text += '♿ **יש תו נכה תקף**';
      } else {
        text += '♿ אין תו נכה';
      }
    }

    // הוספת זמן חיפוש
    text += `\n\n🕐 ${new Date().toLocaleString('he-IL')}`;

    return {
      text: text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.buttons.newSearch, callback_data: 'new_search' },
            { text: this.buttons.settings, callback_data: 'settings' }
          ],
          [
            { text: this.buttons.help, callback_data: 'help' },
            { text: this.buttons.mainMenu, callback_data: 'main_menu' }
          ]
        ]
      }
    };
  }

  /**
   * עיצוב הודעת "לא נמצאו תוצאות"
   * @returns {Object} הודעה עם כפתורים
   */
  formatNoResultsMessage() {
    return {
      text: this.templates.noResults,
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.buttons.newSearch, callback_data: 'new_search' },
            { text: this.buttons.help, callback_data: 'help' }
          ]
        ]
      }
    };
  }

  /**
   * עיצוב הודעת שגיאה
   * @param {string} errorType - סוג השגיאה
   * @returns {Object} הודעת שגיאה עם כפתורים
   */
  formatErrorMessage(errorType = 'UNKNOWN_ERROR') {
    let text = this.templates.error;
    let showRetry = true;

    switch (errorType) {
      case 'INVALID_LICENSE_PLATE':
        text = this.templates.invalidLicense;
        showRetry = false;
        break;
      case 'NETWORK_TIMEOUT':
        text = '⏱️ החיפוש לוקח יותר זמן מהצפוי\n\nאנא נסו שוב';
        break;
      case 'NETWORK_ERROR':
        text = '🌐 בעיית חיבור לאינטרנט\n\nבדקו את החיבור ונסו שוב';
        break;
      case 'RATE_LIMIT_EXCEEDED':
        text = '⏳ יותר מדי בקשות\n\nאנא המתינו מעט ונסו שוב';
        break;
      case 'API_SERVER_ERROR':
        text = '🔧 השירות אינו זמין כרגע\n\nאנא נסו שוב מאוחר יותר';
        break;
    }

    const buttons = [];
    if (showRetry) {
      buttons.push([{ text: this.buttons.retry, callback_data: 'retry_search' }]);
    }
    buttons.push([
      { text: this.buttons.newSearch, callback_data: 'new_search' },
      { text: this.buttons.help, callback_data: 'help' }
    ]);

    return {
      text: text,
      reply_markup: {
        inline_keyboard: buttons
      }
    };
  }

  /**
   * עיצוב תפריט הגדרות ראשי
   * @param {UserSettings} userSettings - הגדרות המשתמש
   * @returns {Object} תפריט הגדרות
   */
  formatSettingsMenu(userSettings) {
    const summary = userSettings.getSummary();
    
    let text = '⚙️ **הגדרות הבוט**\n\n';
    text += `🌐 שפה: ${summary.language}\n`;
    text += `📊 שדות מופעלים: ${summary.enabledFields}/${summary.totalFields}\n`;
    text += `📱 מצב קומפקטי: ${summary.compactMode}\n`;
    text += `🔔 התראות: ${summary.notifications}`;

    return {
      text: text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📊 שדות תצוגה', callback_data: 'settings_fields' },
            { text: '🌐 שפה', callback_data: 'settings_language' }
          ],
          [
            { text: '📱 מצב קומפקטי', callback_data: 'settings_compact' },
            { text: '🔔 התראות', callback_data: 'settings_notifications' }
          ],
          [
            { text: this.buttons.reset, callback_data: 'settings_reset' },
            { text: this.buttons.back, callback_data: 'main_menu' }
          ]
        ]
      }
    };
  }

  /**
   * עיצוב תפריט בחירת שדות תצוגה
   * @param {UserSettings} userSettings - הגדרות המשתמש
   * @returns {Object} תפריט שדות
   */
  formatFieldsMenu(userSettings) {
    let text = '📊 **בחירת שדות תצוגה**\n\n';
    text += 'בחרו אילו פרטים להציג בתוצאות החיפוש:\n\n';

    const fieldDescriptions = UserSettings.getFieldDescriptions();
    const buttons = [];

    // יצירת כפתורים לכל שדה
    Object.entries(fieldDescriptions).forEach(([fieldName, description]) => {
      const isEnabled = userSettings.displayFields[fieldName];
      const status = isEnabled ? '✅' : '❌';
      const buttonText = `${status} ${description}`;
      
      buttons.push([{
        text: buttonText,
        callback_data: `toggle_field_${fieldName}`
      }]);
    });

    // כפתורי פעולה
    buttons.push([
      { text: this.buttons.save, callback_data: 'save_fields' },
      { text: this.buttons.back, callback_data: 'settings' }
    ]);

    return {
      text: text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons
      }
    };
  }

  /**
   * עיצוב הודעת אישור שמירה
   * @returns {Object} הודעת אישור
   */
  formatSaveConfirmation() {
    return {
      text: this.templates.settingsSaved,
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.buttons.settings, callback_data: 'settings' },
            { text: this.buttons.mainMenu, callback_data: 'main_menu' }
          ]
        ]
      }
    };
  }

  /**
   * עיצוב הודעת איפוס הגדרות
   * @returns {Object} הודעת איפוס
   */
  formatResetConfirmation() {
    return {
      text: this.templates.settingsReset,
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.buttons.settings, callback_data: 'settings' },
            { text: this.buttons.mainMenu, callback_data: 'main_menu' }
          ]
        ]
      }
    };
  }

  /**
   * עיצוב תפריט בחירת שפה
   * @param {UserSettings} userSettings - הגדרות המשתמש
   * @returns {Object} תפריט שפה
   */
  formatLanguageMenu(userSettings) {
    const currentLang = userSettings.language;
    
    let text = '🌐 **בחירת שפה**\n\n';
    text += 'בחרו את שפת הבוט:\n\n';

    return {
      text: text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { 
              text: currentLang === 'he' ? '✅ עברית' : 'עברית', 
              callback_data: 'set_language_he' 
            },
            { 
              text: currentLang === 'en' ? '✅ English' : 'English', 
              callback_data: 'set_language_en' 
            }
          ],
          [
            { text: this.buttons.back, callback_data: 'settings' }
          ]
        ]
      }
    };
  }

  /**
   * יצירת כפתור inline keyboard בודד
   * @param {string} text - טקסט הכפתור
   * @param {string} callbackData - נתוני callback
   * @returns {Object} כפתור inline
   */
  createInlineButton(text, callbackData) {
    return { text, callback_data: callbackData };
  }

  /**
   * יצירת שורת כפתורים
   * @param {Array} buttons - מערך כפתורים
   * @returns {Array} שורת כפתורים
   */
  createButtonRow(buttons) {
    return buttons;
  }

  /**
   * יצירת keyboard מלא
   * @param {Array} rows - מערך שורות כפתורים
   * @returns {Object} inline keyboard
   */
  createInlineKeyboard(rows) {
    return {
      inline_keyboard: rows
    };
  }

  /**
   * ניקוי טקסט לשליחה בטלגרם
   * @param {string} text - הטקסט לניקוי
   * @returns {string} טקסט נקי
   */
  sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // הסרת תווים מיוחדים שעלולים לגרום בעיות
    return text
      .replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&') // escape markdown characters
      .trim();
  }

  /**
   * קיצור טקסט ארוך
   * @param {string} text - הטקסט לקיצור
   * @param {number} maxLength - אורך מקסימלי
   * @returns {string} טקסט מקוצר
   */
  truncateText(text, maxLength = 4000) {
    if (!text || text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength - 3) + '...';
  }
}

module.exports = MessageFormatter;