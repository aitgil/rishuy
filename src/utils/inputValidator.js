/**
 * מאמת ומנקה קלט משתמש
 * מונע התקפות injection ומבטיח קלט בטוח
 */
class InputValidator {
  constructor() {
    // רגקסים לולידציה
    this.patterns = {
      // מספר לוחית רישוי ישראלי
      licensePlate: /^[\d\s\-\.]{7,11}$/,
      
      // מזהה משתמש טלגרם (מספר חיובי)
      userId: /^\d+$/,
      
      // מזהה צ'אט טלגרם
      chatId: /^-?\d+$/,
      
      // callback data (אותיות, מספרים, קו תחתון, מקף)
      callbackData: /^[a-zA-Z0-9_\-]+$/,
      
      // שם שדה (אותיות אנגליות, קו תחתון)
      fieldName: /^[a-zA-Z_]+$/,
      
      // קוד שפה (2 אותיות)
      languageCode: /^[a-z]{2}$/
    };
    
    // תווים מסוכנים לניקוי
    this.dangerousChars = /[<>\"'&\x00-\x1f\x7f-\x9f]/g;
    
    // אורכים מקסימליים
    this.maxLengths = {
      text: 4000,
      callbackData: 64,
      fieldName: 50
    };
  }

  /**
   * ולידציה של מספר לוחית רישוי
   * @param {string} licensePlate - מספר לוחית רישוי
   * @returns {Object} תוצאת הולידציה
   */
  validateLicensePlate(licensePlate) {
    if (!licensePlate || typeof licensePlate !== 'string') {
      return {
        valid: false,
        error: 'MISSING_LICENSE_PLATE',
        message: 'מספר לוחית רישוי חסר'
      };
    }
    
    const cleaned = this.sanitizeText(licensePlate);
    
    if (!this.patterns.licensePlate.test(cleaned)) {
      return {
        valid: false,
        error: 'INVALID_LICENSE_PLATE_FORMAT',
        message: 'פורמט מספר לוחית רישוי לא תקין'
      };
    }
    
    // ניקוי והחזרת ספרות בלבד
    const digitsOnly = cleaned.replace(/\D/g, '');
    
    if (digitsOnly.length < 7 || digitsOnly.length > 8) {
      return {
        valid: false,
        error: 'INVALID_LICENSE_PLATE_LENGTH',
        message: 'מספר לוחית רישוי חייב להכיל 7-8 ספרות'
      };
    }
    
    return {
      valid: true,
      cleaned: digitsOnly,
      original: licensePlate
    };
  }

  /**
   * ולידציה של מזהה משתמש
   * @param {string|number} userId - מזהה המשתמש
   * @returns {Object} תוצאת הולידציה
   */
  validateUserId(userId) {
    const userIdStr = String(userId);
    
    if (!this.patterns.userId.test(userIdStr)) {
      return {
        valid: false,
        error: 'INVALID_USER_ID',
        message: 'מזהה משתמש לא תקין'
      };
    }
    
    const userIdNum = parseInt(userIdStr, 10);
    if (userIdNum <= 0 || userIdNum > Number.MAX_SAFE_INTEGER) {
      return {
        valid: false,
        error: 'USER_ID_OUT_OF_RANGE',
        message: 'מזהה משתמש מחוץ לטווח המותר'
      };
    }
    
    return {
      valid: true,
      cleaned: userIdStr,
      numeric: userIdNum
    };
  }

  /**
   * ולידציה של מזהה צ'אט
   * @param {string|number} chatId - מזהה הצ'אט
   * @returns {Object} תוצאת הולידציה
   */
  validateChatId(chatId) {
    const chatIdStr = String(chatId);
    
    if (!this.patterns.chatId.test(chatIdStr)) {
      return {
        valid: false,
        error: 'INVALID_CHAT_ID',
        message: 'מזהה צ\'אט לא תקין'
      };
    }
    
    return {
      valid: true,
      cleaned: chatIdStr,
      numeric: parseInt(chatIdStr, 10)
    };
  }

  /**
   * ולידציה של callback data
   * @param {string} callbackData - נתוני callback
   * @returns {Object} תוצאת הולידציה
   */
  validateCallbackData(callbackData) {
    if (!callbackData || typeof callbackData !== 'string') {
      return {
        valid: false,
        error: 'MISSING_CALLBACK_DATA',
        message: 'נתוני callback חסרים'
      };
    }
    
    if (callbackData.length > this.maxLengths.callbackData) {
      return {
        valid: false,
        error: 'CALLBACK_DATA_TOO_LONG',
        message: 'נתוני callback ארוכים מדי'
      };
    }
    
    if (!this.patterns.callbackData.test(callbackData)) {
      return {
        valid: false,
        error: 'INVALID_CALLBACK_DATA_FORMAT',
        message: 'פורמט נתוני callback לא תקין'
      };
    }
    
    return {
      valid: true,
      cleaned: callbackData
    };
  }

  /**
   * ולידציה של שם שדה
   * @param {string} fieldName - שם השדה
   * @returns {Object} תוצאת הולידציה
   */
  validateFieldName(fieldName) {
    if (!fieldName || typeof fieldName !== 'string') {
      return {
        valid: false,
        error: 'MISSING_FIELD_NAME',
        message: 'שם שדה חסר'
      };
    }
    
    if (fieldName.length > this.maxLengths.fieldName) {
      return {
        valid: false,
        error: 'FIELD_NAME_TOO_LONG',
        message: 'שם שדה ארוך מדי'
      };
    }
    
    if (!this.patterns.fieldName.test(fieldName)) {
      return {
        valid: false,
        error: 'INVALID_FIELD_NAME_FORMAT',
        message: 'פורמט שם שדה לא תקין'
      };
    }
    
    return {
      valid: true,
      cleaned: fieldName
    };
  }

  /**
   * ולידציה של קוד שפה
   * @param {string} languageCode - קוד השפה
   * @returns {Object} תוצאת הולידציה
   */
  validateLanguageCode(languageCode) {
    if (!languageCode || typeof languageCode !== 'string') {
      return {
        valid: false,
        error: 'MISSING_LANGUAGE_CODE',
        message: 'קוד שפה חסר'
      };
    }
    
    const cleaned = languageCode.toLowerCase();
    
    if (!this.patterns.languageCode.test(cleaned)) {
      return {
        valid: false,
        error: 'INVALID_LANGUAGE_CODE_FORMAT',
        message: 'פורמט קוד שפה לא תקין'
      };
    }
    
    // בדיקת שפות נתמכות
    const supportedLanguages = ['he', 'en'];
    if (!supportedLanguages.includes(cleaned)) {
      return {
        valid: false,
        error: 'UNSUPPORTED_LANGUAGE',
        message: 'שפה לא נתמכת'
      };
    }
    
    return {
      valid: true,
      cleaned: cleaned
    };
  }

  /**
   * ניקוי טקסט מתווים מסוכנים
   * @param {string} text - הטקסט לניקוי
   * @returns {string} טקסט נקי
   */
  sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    // הסרת תווים מסוכנים
    let cleaned = text.replace(this.dangerousChars, '');
    
    // קיצור אם ארוך מדי
    if (cleaned.length > this.maxLengths.text) {
      cleaned = cleaned.substring(0, this.maxLengths.text);
    }
    
    // ניקוי רווחים מיותרים
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * ולידציה כללית של אובייקט הודעה
   * @param {Object} message - אובייקט ההודעה
   * @returns {Object} תוצאת הולידציה
   */
  validateMessage(message) {
    if (!message || typeof message !== 'object') {
      return {
        valid: false,
        error: 'INVALID_MESSAGE_OBJECT',
        message: 'אובייקט הודעה לא תקין'
      };
    }
    
    // בדיקת שדות חובה
    if (!message.from || !message.from.id) {
      return {
        valid: false,
        error: 'MISSING_USER_INFO',
        message: 'מידע משתמש חסר'
      };
    }
    
    if (!message.chat || !message.chat.id) {
      return {
        valid: false,
        error: 'MISSING_CHAT_INFO',
        message: 'מידע צ\'אט חסר'
      };
    }
    
    // ולידציה של מזהים
    const userIdValidation = this.validateUserId(message.from.id);
    if (!userIdValidation.valid) {
      return userIdValidation;
    }
    
    const chatIdValidation = this.validateChatId(message.chat.id);
    if (!chatIdValidation.valid) {
      return chatIdValidation;
    }
    
    return {
      valid: true,
      userId: userIdValidation.cleaned,
      chatId: chatIdValidation.cleaned
    };
  }

  /**
   * ולידציה של callback query
   * @param {Object} callbackQuery - אובייקט callback query
   * @returns {Object} תוצאת הולידציה
   */
  validateCallbackQuery(callbackQuery) {
    if (!callbackQuery || typeof callbackQuery !== 'object') {
      return {
        valid: false,
        error: 'INVALID_CALLBACK_QUERY_OBJECT',
        message: 'אובייקט callback query לא תקין'
      };
    }
    
    // בדיקת שדות חובה
    if (!callbackQuery.from || !callbackQuery.from.id) {
      return {
        valid: false,
        error: 'MISSING_USER_INFO',
        message: 'מידע משתמש חסר'
      };
    }
    
    if (!callbackQuery.data) {
      return {
        valid: false,
        error: 'MISSING_CALLBACK_DATA',
        message: 'נתוני callback חסרים'
      };
    }
    
    // ולידציה של נתונים
    const userIdValidation = this.validateUserId(callbackQuery.from.id);
    if (!userIdValidation.valid) {
      return userIdValidation;
    }
    
    const callbackDataValidation = this.validateCallbackData(callbackQuery.data);
    if (!callbackDataValidation.valid) {
      return callbackDataValidation;
    }
    
    return {
      valid: true,
      userId: userIdValidation.cleaned,
      callbackData: callbackDataValidation.cleaned
    };
  }

  /**
   * קבלת סטטיסטיקות הולידציה
   * @returns {Object} סטטיסטיקות
   */
  getValidationStats() {
    return {
      patterns: Object.keys(this.patterns).length,
      maxLengths: { ...this.maxLengths },
      supportedLanguages: ['he', 'en']
    };
  }
}

module.exports = InputValidator;