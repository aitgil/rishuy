const axios = require('axios');
const VehicleData = require('../models/VehicleData');
const SimpleCache = require('../utils/cache');
const InputValidator = require('../utils/inputValidator');

/**
 * שירות לחיפוש נתוני רכב מ-API הממשלתי
 */
class VehicleDataService {
  constructor() {
    this.baseUrl = 'https://data.gov.il/api/3/action/datastore_search';
    this.vehicleResourceId = '053cea08-09bc-40ec-8f7a-156f0677aff3'; // המשאב הנכון עם הנתונים המלאים
    this.disabilityResourceId = 'c8b9f9c8-4612-4068-934f-d4acd2e3c06e';
    
    // הגדרות timeout ו-retry
    this.timeout = parseInt(process.env.API_TIMEOUT) || 5000;
    this.maxRetries = parseInt(process.env.API_RETRY_ATTEMPTS) || 3;
    
    // יצירת axios instance עם הגדרות בסיסיות
    this.httpClient = axios.create({
      timeout: this.timeout,
      headers: {
        'User-Agent': 'TelegramVehicleBot/1.0',
        'Accept': 'application/json'
      }
    });

    // אתחול cache ו-validator
    this.cache = new SimpleCache({
      ttl: 300000, // 5 דקות
      maxSize: 500
    });
    this.validator = new InputValidator();
  }

  /**
   * חיפוש נתוני רכב לפי מספר לוחית רישוי
   * @param {string} licensePlate - מספר לוחית רישוי
   * @returns {Promise<VehicleData|null>} נתוני הרכב או null אם לא נמצא
   */
  async searchVehicle(licensePlate) {
    try {
      // ולידציה של מספר הרישוי
      const validation = this.validator.validateLicensePlate(licensePlate);
      if (!validation.valid) {
        const error = new Error(validation.message);
        error.type = validation.error;
        throw error;
      }

      const cleanLicensePlate = validation.cleaned;

      // בדיקה ב-cache קודם
      const cacheKey = SimpleCache.createVehicleKey(cleanLicensePlate);
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        console.log(`Cache hit for vehicle: ${cleanLicensePlate}`);
        return cachedResult;
      }

      // חיפוש ברכבים פרטיים ומסחריים
      const vehicleData = await this._searchInResource(
        this.vehicleResourceId,
        cleanLicensePlate
      );

      let result = null;
      if (vehicleData && vehicleData.length > 0) {
        result = new VehicleData(vehicleData[0]);
      }

      // שמירה ב-cache
      this.cache.set(cacheKey, result);
      console.log(`Cached vehicle result for: ${cleanLicensePlate}`);

      return result;
    } catch (error) {
      this._handleError(error, 'searchVehicle');
      throw error;
    }
  }

  /**
   * בדיקת תו נכה לרכב
   * @param {string} licensePlate - מספר לוחית רישוי
   * @returns {Promise<boolean>} האם יש תו נכה תקף
   */
  async checkDisabilityPermit(licensePlate) {
    try {
      // ולידציה של מספר הרישוי
      const validation = this.validator.validateLicensePlate(licensePlate);
      if (!validation.valid) {
        return false; // במקרה של מספר לא תקין, נחזיר false
      }

      const cleanLicensePlate = validation.cleaned;

      // בדיקה ב-cache קודם
      const cacheKey = SimpleCache.createDisabilityKey(cleanLicensePlate);
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult !== null) {
        console.log(`Cache hit for disability permit: ${cleanLicensePlate}`);
        return cachedResult;
      }
      
      const permitData = await this._searchInResource(
        this.disabilityResourceId,
        cleanLicensePlate
      );

      const hasPermit = permitData && permitData.length > 0;

      // שמירה ב-cache
      this.cache.set(cacheKey, hasPermit);
      console.log(`Cached disability permit result for: ${cleanLicensePlate}`);

      return hasPermit;
    } catch (error) {
      this._handleError(error, 'checkDisabilityPermit');
      // במקרה של שגיאה בבדיקת תו נכה, נחזיר false במקום לזרוק שגיאה
      return false;
    }
  }

  /**
   * חיפוש כללי במשאב נתונים
   * @param {string} resourceId - מזהה המשאב
   * @param {string} licensePlate - מספר לוחית רישוי
   * @returns {Promise<Array>} תוצאות החיפוש
   */
  async _searchInResource(resourceId, licensePlate) {
    const params = {
      resource_id: resourceId,
      limit: 10,
      q: licensePlate
    };

    const response = await this._makeApiRequest(params);
    return response.data.result.records;
  }

  /**
   * ביצוע בקשה ל-API עם retry logic
   * @param {Object} params - פרמטרים לבקשה
   * @param {number} attempt - מספר הניסיון הנוכחי
   * @returns {Promise<Object>} תגובת ה-API
   */
  async _makeApiRequest(params, attempt = 1) {
    try {
      const response = await this.httpClient.get(this.baseUrl, { params });
      
      // בדיקת תקינות התגובה
      if (!response.data || !response.data.success) {
        throw new Error('API_INVALID_RESPONSE');
      }

      return response;
    } catch (error) {
      // אם זה לא הניסיון האחרון, ננסה שוב
      if (attempt < this.maxRetries && this._isRetryableError(error)) {
        console.warn(`API request failed, retrying (${attempt}/${this.maxRetries})...`);
        await this._delay(1000 * attempt); // המתנה הולכת וגדלה
        return this._makeApiRequest(params, attempt + 1);
      }

      // אם הגענו לכאן, זה הניסיון האחרון או שגיאה לא ניתנת לחזרה
      this._classifyError(error);
      throw error;
    }
  }

  /**
   * ניקוי מספר לוחית רישוי
   * @param {string} licensePlate - מספר לוחית רישוי גולמי
   * @returns {string} מספר לוחית רישוי נקי
   */
  _cleanLicensePlate(licensePlate) {
    if (!licensePlate || typeof licensePlate !== 'string') {
      return '';
    }

    // הסרת רווחים, מקפים ותווים מיוחדים
    return licensePlate
      .replace(/[\s\-\.]/g, '')
      .replace(/[^\d]/g, '') // השארת ספרות בלבד
      .trim();
  }

  /**
   * בדיקת תקינות מספר לוחית רישוי ישראלי
   * @param {string} licensePlate - מספר לוחית רישוי
   * @returns {boolean} האם המספר תקין
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
   * בדיקה אם השגיאה ניתנת לחזרה
   * @param {Error} error - השגיאה
   * @returns {boolean} האם ניתן לנסות שוב
   */
  _isRetryableError(error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return true; // timeout
    }
    
    if (error.response) {
      const status = error.response.status;
      // שגיאות שרת זמניות
      return status >= 500 || status === 429; // 5xx או rate limit
    }

    return false;
  }

  /**
   * סיווג השגיאה לסוג מובן
   * @param {Error} error - השגיאה המקורית
   */
  _classifyError(error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      error.type = 'NETWORK_TIMEOUT';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      error.type = 'NETWORK_ERROR';
    } else if (error.response) {
      const status = error.response.status;
      if (status === 429) {
        error.type = 'RATE_LIMIT_EXCEEDED';
      } else if (status >= 500) {
        error.type = 'API_SERVER_ERROR';
      } else if (status === 404) {
        error.type = 'API_NOT_FOUND';
      } else {
        error.type = 'API_ERROR';
      }
    } else {
      error.type = 'UNKNOWN_ERROR';
    }
  }

  /**
   * טיפול בשגיאות עם לוגים
   * @param {Error} error - השגיאה
   * @param {string} method - שם המתודה שבה אירעה השגיאה
   */
  _handleError(error, method) {
    const errorInfo = {
      method,
      type: error.type || 'UNKNOWN',
      message: error.message,
      timestamp: new Date().toISOString()
    };

    if (process.env.NODE_ENV !== 'test') {
      console.error('VehicleDataService Error:', errorInfo);
    }
  }

  /**
   * המתנה (עבור retry logic)
   * @param {number} ms - מילישניות להמתנה
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * קבלת סטטיסטיקות השירות (לצורכי מעקב)
   */
  getStats() {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      vehicleResourceId: this.vehicleResourceId,
      disabilityResourceId: this.disabilityResourceId
    };
  }
}

module.exports = VehicleDataService;