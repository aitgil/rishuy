/**
 * מודל הגדרות משתמש
 * מנהל את ההעדפות האישיות של כל משתמש
 */
class UserSettings {
  constructor(userId, settings = {}) {
    this.userId = userId;
    this.language = settings.language || 'he'; // עברית כברירת מחדל
    
    // הגדרות תצוגת שדות - ברירת מחדל הכל מופעל
    this.displayFields = {
      manufacturer: settings.displayFields?.manufacturer ?? true,
      model: settings.displayFields?.model ?? true,
      year: settings.displayFields?.year ?? true,
      color: settings.displayFields?.color ?? true,
      engineVolume: settings.displayFields?.engineVolume ?? true,
      fuelType: settings.displayFields?.fuelType ?? true,
      ownershipType: settings.displayFields?.ownershipType ?? true,
      testDate: settings.displayFields?.testDate ?? true,
      disabilityPermit: settings.displayFields?.disabilityPermit ?? true,
      vehicleType: settings.displayFields?.vehicleType ?? false,
      seats: settings.displayFields?.seats ?? false,
      weight: settings.displayFields?.weight ?? false,
      firstRegistration: settings.displayFields?.firstRegistration ?? false
    };

    // הגדרות נוספות
    this.notifications = settings.notifications ?? true;
    this.compactMode = settings.compactMode ?? false;
    this.createdAt = settings.createdAt || new Date();
    this.updatedAt = new Date();
  }

  /**
   * קבלת הגדרות ברירת מחדל
   */
  static getDefaultSettings() {
    return {
      language: 'he',
      displayFields: {
        manufacturer: true,
        model: true,
        year: true,
        color: true,
        engineVolume: true,
        fuelType: true,
        ownershipType: true,
        testDate: true,
        disabilityPermit: true,
        vehicleType: false,
        seats: false,
        weight: false,
        firstRegistration: false
      },
      notifications: true,
      compactMode: false
    };
  }

  /**
   * עדכון הגדרת שדה תצוגה
   */
  updateDisplayField(fieldName, enabled) {
    if (this.displayFields.hasOwnProperty(fieldName)) {
      this.displayFields[fieldName] = enabled;
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * החזרה להגדרות ברירת מחדל
   */
  resetToDefaults() {
    const defaults = UserSettings.getDefaultSettings();
    this.language = defaults.language;
    this.displayFields = { ...defaults.displayFields };
    this.notifications = defaults.notifications;
    this.compactMode = defaults.compactMode;
    this.updatedAt = new Date();
  }

  /**
   * קבלת רשימת השדות המופעלים
   */
  getEnabledFields() {
    return Object.keys(this.displayFields).filter(
      field => this.displayFields[field]
    );
  }

  /**
   * קבלת מספר השדות המופעלים
   */
  getEnabledFieldsCount() {
    return this.getEnabledFields().length;
  }

  /**
   * בדיקה אם שדה מופעל
   */
  isFieldEnabled(fieldName) {
    return this.displayFields[fieldName] === true;
  }

  /**
   * קבלת תיאור השדות בעברית
   */
  static getFieldDescriptions() {
    return {
      manufacturer: '🏭 יצרן',
      model: '🚗 דגם',
      year: '📅 שנת ייצור',
      color: '🎨 צבע',
      engineVolume: '⚙️ נפח מנוע',
      fuelType: '⛽ סוג דלק',
      ownershipType: '👤 סוג בעלות',
      testDate: '🔍 תוקף טסט',
      disabilityPermit: '♿ תו נכה',
      vehicleType: '🚙 סוג רכב',
      seats: '💺 מספר מושבים',
      weight: '⚖️ משקל',
      firstRegistration: '📋 רישום ראשון'
    };
  }

  /**
   * המרה לאובייקט JSON לשמירה
   */
  toJSON() {
    return {
      userId: this.userId,
      language: this.language,
      displayFields: { ...this.displayFields },
      notifications: this.notifications,
      compactMode: this.compactMode,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * יצירה מאובייקט JSON
   */
  static fromJSON(data) {
    return new UserSettings(data.userId, {
      language: data.language,
      displayFields: data.displayFields,
      notifications: data.notifications,
      compactMode: data.compactMode,
      createdAt: data.createdAt
    });
  }

  /**
   * קבלת סיכום הגדרות לתצוגה
   */
  getSummary() {
    const enabledCount = this.getEnabledFieldsCount();
    const totalFields = Object.keys(this.displayFields).length;
    
    return {
      language: this.language === 'he' ? 'עברית' : 'English',
      enabledFields: enabledCount,
      totalFields: totalFields,
      compactMode: this.compactMode ? 'מופעל' : 'כבוי',
      notifications: this.notifications ? 'מופעל' : 'כבוי'
    };
  }
}

module.exports = UserSettings;