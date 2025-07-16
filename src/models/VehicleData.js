/**
 * מודל נתוני רכב
 * מייצג את המידע שמתקבל מ-API הממשלתי
 */
class VehicleData {
  constructor(data = {}) {
    // שדות בסיסיים של הרכב (מתאים לשמות השדות האמיתיים מה-API)
    this.licensePlate = data.mispar_rechev || '';
    this.manufacturer = data.tozeret_nm || '';
    this.model = data.kinuy_mishari || '';
    this.year = data.shnat_yitzur || '';
    this.color = data.tzeva_rechev || '';
    this.engineVolume = data.degem_manoa || '';
    this.fuelType = data.sug_delek_nm || '';
    this.ownershipType = data.baalut || '';
    this.testDate = data.tokef_dt || '';
    this.lastInspection = data.mivchan_acharon_dt || '';
    this.vehicleType = data.sug_degem || '';
    this.modelCode = data.degem_nm || '';
    this.chassisNumber = data.misgeret || '';
    this.frontTires = data.zmig_kidmi || '';
    this.rearTires = data.zmig_ahori || '';
    this.registrationDate = data.moed_aliya_lakvish || '';
    
    // מידע נוסף
    this.rawData = data;
  }

  /**
   * המרת הנתונים לתצוגה בעברית
   * @param {UserSettings} userSettings - הגדרות המשתמש
   * @returns {string} טקסט מעוצב בעברית
   */
  toHebrewDisplay(userSettings) {
    const fields = [];
    
    if (userSettings.displayFields.manufacturer && this.manufacturer) {
      fields.push(`🏭 יצרן: ${this.manufacturer}`);
    }
    
    if (userSettings.displayFields.model && this.model) {
      fields.push(`🚗 דגם: ${this.model}`);
    }
    
    if (userSettings.displayFields.year && this.year) {
      fields.push(`📅 שנת ייצור: ${this.year}`);
    }
    
    if (userSettings.displayFields.color && this.color) {
      fields.push(`🎨 צבע: ${this._translateColor(this.color)}`);
    }
    
    if (userSettings.displayFields.engineVolume && this.engineVolume) {
      fields.push(`⚙️ נפח מנוע: ${this.engineVolume} סמ"ק`);
    }
    
    if (userSettings.displayFields.fuelType && this.fuelType) {
      fields.push(`⛽ סוג דלק: ${this._translateFuelType(this.fuelType)}`);
    }
    
    if (userSettings.displayFields.ownershipType && this.ownershipType) {
      fields.push(`👤 סוג בעלות: ${this._translateOwnershipType(this.ownershipType)}`);
    }
    
    if (userSettings.displayFields.testDate && this.testDate) {
      fields.push(`🔍 תוקף טסט: ${this._formatDate(this.testDate)}`);
    }

    return fields.length > 0 ? fields.join('\n') : 'לא נמצאו נתונים';
  }

  /**
   * תרגום צבע לעברית
   */
  _translateColor(color) {
    const colorMap = {
      'לבן': 'לבן',
      'שחור': 'שחור',
      'כסף': 'כסף',
      'אפור': 'אפור',
      'כחול': 'כחול',
      'אדום': 'אדום',
      'ירוק': 'ירוק',
      'צהוב': 'צהוב',
      'חום': 'חום',
      'WHITE': 'לבן',
      'BLACK': 'שחור',
      'SILVER': 'כסף',
      'GRAY': 'אפור',
      'BLUE': 'כחול',
      'RED': 'אדום',
      'GREEN': 'ירוק',
      'YELLOW': 'צהוב',
      'BROWN': 'חום'
    };
    return colorMap[color] || color;
  }

  /**
   * תרגום סוג דלק לעברית
   */
  _translateFuelType(fuelType) {
    const fuelMap = {
      'בנזין': 'בנזין',
      'דיזל': 'דיזל',
      'חשמלי': 'חשמלי',
      'היברידי': 'היברידי',
      'גז': 'גז',
      'GASOLINE': 'בנזין',
      'DIESEL': 'דיזל',
      'ELECTRIC': 'חשמלי',
      'HYBRID': 'היברידי',
      'GAS': 'גז'
    };
    return fuelMap[fuelType] || fuelType;
  }

  /**
   * תרגום סוג בעלות לעברית
   */
  _translateOwnershipType(ownershipType) {
    const ownershipMap = {
      'פרטי': 'פרטי',
      'מסחרי': 'מסחרי',
      'ציבורי': 'ציבורי',
      'PRIVATE': 'פרטי',
      'COMMERCIAL': 'מסחרי',
      'PUBLIC': 'ציבורי'
    };
    return ownershipMap[ownershipType] || ownershipType;
  }

  /**
   * עיצוב תאריך
   */
  _formatDate(dateStr) {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('he-IL');
    } catch (error) {
      return dateStr;
    }
  }

  /**
   * בדיקה אם יש נתונים תקינים
   */
  isValid() {
    return this.licensePlate && (this.manufacturer || this.model);
  }

  /**
   * קבלת כותרת קצרה לתצוגה
   */
  getTitle() {
    const parts = [];
    if (this.manufacturer) parts.push(this.manufacturer);
    if (this.model) parts.push(this.model);
    if (this.year) parts.push(this.year);
    
    return parts.length > 0 ? parts.join(' ') : `רכב ${this.licensePlate}`;
  }
}

module.exports = VehicleData;