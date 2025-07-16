const UserSettings = require('../models/UserSettings');

/**
 * שירות לניהול הגדרות משתמש
 * מנהל שמירה, טעינה ועדכון של הגדרות משתמש
 */
class UserSettingsService {
  constructor() {
    // אחסון זמני בזיכרון - בפרויקט אמיתי זה יהיה מסד נתונים
    this.storage = new Map();
    this.defaultSettings = UserSettings.getDefaultSettings();
  }

  /**
   * קבלת הגדרות משתמש
   * @param {string} userId - מזהה המשתמש
   * @returns {Promise<UserSettings>} הגדרות המשתמש
   */
  async getUserSettings(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // בדיקה אם יש הגדרות שמורות
      if (this.storage.has(userId)) {
        const savedData = this.storage.get(userId);
        return UserSettings.fromJSON(savedData);
      }

      // יצירת הגדרות ברירת מחדל למשתמש חדש
      const newSettings = new UserSettings(userId);
      await this.saveUserSettings(newSettings);
      
      return newSettings;
    } catch (error) {
      console.error('Error getting user settings:', error);
      // במקרה של שגיאה, נחזיר הגדרות ברירת מחדל
      return new UserSettings(userId);
    }
  }

  /**
   * שמירת הגדרות משתמש
   * @param {UserSettings} userSettings - הגדרות המשתמש לשמירה
   * @returns {Promise<boolean>} האם השמירה הצליחה
   */
  async saveUserSettings(userSettings) {
    try {
      if (!userSettings || !userSettings.userId) {
        throw new Error('Invalid user settings');
      }

      // עדכון timestamp
      userSettings.updatedAt = new Date();
      
      // שמירה באחסון
      this.storage.set(userSettings.userId, userSettings.toJSON());
      
      return true;
    } catch (error) {
      console.error('Error saving user settings:', error);
      return false;
    }
  }

  /**
   * עדכון הגדרת שדה תצוגה ספציפי
   * @param {string} userId - מזהה המשתמש
   * @param {string} fieldName - שם השדה
   * @param {boolean} enabled - האם השדה מופעל
   * @returns {Promise<boolean>} האם העדכון הצליח
   */
  async updateDisplayField(userId, fieldName, enabled) {
    try {
      const settings = await this.getUserSettings(userId);
      const success = settings.updateDisplayField(fieldName, enabled);
      
      if (success) {
        await this.saveUserSettings(settings);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating display field:', error);
      return false;
    }
  }

  /**
   * עדכון מספר שדות תצוגה בבת אחת
   * @param {string} userId - מזהה המשתמש
   * @param {Object} fieldsUpdate - אובייקט עם שדות לעדכון
   * @returns {Promise<boolean>} האם העדכון הצליח
   */
  async updateMultipleDisplayFields(userId, fieldsUpdate) {
    try {
      const settings = await this.getUserSettings(userId);
      let hasChanges = false;

      // עדכון כל השדות
      for (const [fieldName, enabled] of Object.entries(fieldsUpdate)) {
        if (settings.updateDisplayField(fieldName, enabled)) {
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await this.saveUserSettings(settings);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error updating multiple display fields:', error);
      return false;
    }
  }

  /**
   * החזרת משתמש להגדרות ברירת מחדל
   * @param {string} userId - מזהה המשתמש
   * @returns {Promise<boolean>} האם האיפוס הצליח
   */
  async resetUserToDefaults(userId) {
    try {
      const settings = await this.getUserSettings(userId);
      settings.resetToDefaults();
      await this.saveUserSettings(settings);
      
      return true;
    } catch (error) {
      console.error('Error resetting user to defaults:', error);
      return false;
    }
  }

  /**
   * עדכון שפת המשתמש
   * @param {string} userId - מזהה המשתמש
   * @param {string} language - קוד השפה (he/en)
   * @returns {Promise<boolean>} האם העדכון הצליח
   */
  async updateUserLanguage(userId, language) {
    try {
      if (!['he', 'en'].includes(language)) {
        throw new Error('Invalid language code');
      }

      const settings = await this.getUserSettings(userId);
      settings.language = language;
      settings.updatedAt = new Date();
      
      await this.saveUserSettings(settings);
      return true;
    } catch (error) {
      console.error('Error updating user language:', error);
      return false;
    }
  }

  /**
   * עדכון מצב קומפקטי
   * @param {string} userId - מזהה המשתמש
   * @param {boolean} compactMode - האם להפעיל מצב קומפקטי
   * @returns {Promise<boolean>} האם העדכון הצליח
   */
  async updateCompactMode(userId, compactMode) {
    try {
      const settings = await this.getUserSettings(userId);
      settings.compactMode = compactMode;
      settings.updatedAt = new Date();
      
      await this.saveUserSettings(settings);
      return true;
    } catch (error) {
      console.error('Error updating compact mode:', error);
      return false;
    }
  }

  /**
   * מחיקת הגדרות משתמש
   * @param {string} userId - מזהה המשתמש
   * @returns {Promise<boolean>} האם המחיקה הצליחה
   */
  async deleteUserSettings(userId) {
    try {
      if (this.storage.has(userId)) {
        this.storage.delete(userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting user settings:', error);
      return false;
    }
  }

  /**
   * קבלת רשימת כל המשתמשים (לצורכי ניהול)
   * @returns {Promise<Array>} רשימת מזהי משתמשים
   */
  async getAllUserIds() {
    try {
      return Array.from(this.storage.keys());
    } catch (error) {
      console.error('Error getting all user IDs:', error);
      return [];
    }
  }

  /**
   * קבלת סטטיסטיקות השירות
   * @returns {Promise<Object>} סטטיסטיקות
   */
  async getServiceStats() {
    try {
      const totalUsers = this.storage.size;
      const userIds = Array.from(this.storage.keys());
      
      // חישוב סטטיסטיקות על השדות הפופולריים
      const fieldStats = {};
      const fieldDescriptions = UserSettings.getFieldDescriptions();
      
      // אתחול מונים
      Object.keys(fieldDescriptions).forEach(field => {
        fieldStats[field] = { enabled: 0, disabled: 0 };
      });

      // ספירת השימוש בכל שדה
      for (const userId of userIds) {
        const userData = this.storage.get(userId);
        if (userData && userData.displayFields) {
          Object.entries(userData.displayFields).forEach(([field, enabled]) => {
            if (fieldStats[field]) {
              if (enabled) {
                fieldStats[field].enabled++;
              } else {
                fieldStats[field].disabled++;
              }
            }
          });
        }
      }

      return {
        totalUsers,
        fieldStats,
        storageSize: this.storage.size
      };
    } catch (error) {
      console.error('Error getting service stats:', error);
      return {
        totalUsers: 0,
        fieldStats: {},
        storageSize: 0
      };
    }
  }

  /**
   * ייצוא הגדרות משתמש (לגיבוי)
   * @param {string} userId - מזהה המשתמש
   * @returns {Promise<Object|null>} נתוני ההגדרות או null
   */
  async exportUserSettings(userId) {
    try {
      if (this.storage.has(userId)) {
        return this.storage.get(userId);
      }
      return null;
    } catch (error) {
      console.error('Error exporting user settings:', error);
      return null;
    }
  }

  /**
   * ייבוא הגדרות משתמש (משחזור מגיבוי)
   * @param {string} userId - מזהה המשתמש
   * @param {Object} settingsData - נתוני ההגדרות
   * @returns {Promise<boolean>} האם הייבוא הצליח
   */
  async importUserSettings(userId, settingsData) {
    try {
      // ולידציה בסיסית של הנתונים
      if (!settingsData || !settingsData.userId || settingsData.userId !== userId) {
        throw new Error('Invalid settings data');
      }

      // יצירת אובייקט UserSettings מהנתונים
      const settings = UserSettings.fromJSON(settingsData);
      
      // שמירה
      await this.saveUserSettings(settings);
      return true;
    } catch (error) {
      console.error('Error importing user settings:', error);
      return false;
    }
  }

  /**
   * ניקוי אחסון (מחיקת הגדרות ישנות)
   * @param {number} daysOld - מספר ימים לשמירה
   * @returns {Promise<number>} מספר ההגדרות שנמחקו
   */
  async cleanupOldSettings(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      let deletedCount = 0;
      const userIds = Array.from(this.storage.keys());
      
      for (const userId of userIds) {
        const userData = this.storage.get(userId);
        if (userData && userData.updatedAt) {
          const updatedAt = new Date(userData.updatedAt);
          if (updatedAt < cutoffDate) {
            this.storage.delete(userId);
            deletedCount++;
          }
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old settings:', error);
      return 0;
    }
  }
}

module.exports = UserSettingsService;