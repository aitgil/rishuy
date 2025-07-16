/**
 * מערכת cache פשוטה לתוצאות חיפוש
 * מאחסנת תוצאות זמנית לשיפור ביצועים
 */
class SimpleCache {
  constructor(options = {}) {
    this.ttl = options.ttl || 300000; // זמן חיים ברירת מחדל: 5 דקות
    this.maxSize = options.maxSize || 1000; // מספר מקסימלי של רשומות
    this.cleanupInterval = options.cleanupInterval || 60000; // ניקוי כל דקה
    
    // אחסון הנתונים
    this.cache = new Map();
    
    // מעקב אחר זמני גישה (LRU)
    this.accessTimes = new Map();
    
    // ניקוי אוטומטי
    this.cleanupTimer = setInterval(() => {
      this._cleanup();
    }, this.cleanupInterval);
    
    // סטטיסטיקות
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0
    };
  }

  /**
   * שמירת ערך ב-cache
   * @param {string} key - המפתח
   * @param {*} value - הערך
   * @param {number} customTtl - זמן חיים מותאם (אופציונלי)
   */
  set(key, value, customTtl = null) {
    const now = Date.now();
    const ttl = customTtl || this.ttl;
    
    // בדיקה אם צריך לפנות מקום
    if (this.cache.size >= this.maxSize) {
      this._evictLRU();
    }
    
    // שמירת הערך עם metadata
    this.cache.set(key, {
      value: value,
      createdAt: now,
      expiresAt: now + ttl,
      accessCount: 0
    });
    
    this.accessTimes.set(key, now);
    this.stats.sets++;
  }

  /**
   * קבלת ערך מה-cache
   * @param {string} key - המפתח
   * @returns {*} הערך או null אם לא נמצא/פג תוקף
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    const now = Date.now();
    
    // בדיקת תוקף
    if (now > item.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // עדכון זמן גישה ומונה
    item.accessCount++;
    this.accessTimes.set(key, now);
    this.stats.hits++;
    
    return item.value;
  }

  /**
   * בדיקה אם מפתח קיים ותקף
   * @param {string} key - המפתח
   * @returns {boolean} האם קיים ותקף
   */
  has(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }
    
    // בדיקת תוקף
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * מחיקת ערך מה-cache
   * @param {string} key - המפתח
   * @returns {boolean} האם נמחק בהצלחה
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    this.accessTimes.delete(key);
    
    if (deleted) {
      this.stats.deletes++;
    }
    
    return deleted;
  }

  /**
   * ניקוי כל ה-cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.accessTimes.clear();
    this.stats.deletes += size;
  }

  /**
   * קבלת מידע על ערך ב-cache
   * @param {string} key - המפתח
   * @returns {Object|null} מידע על הערך
   */
  getInfo(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    const now = Date.now();
    
    return {
      key: key,
      createdAt: new Date(item.createdAt),
      expiresAt: new Date(item.expiresAt),
      ttl: item.expiresAt - now,
      accessCount: item.accessCount,
      lastAccess: new Date(this.accessTimes.get(key)),
      isExpired: now > item.expiresAt
    };
  }

  /**
   * קבלת כל המפתחות
   * @returns {Array} רשימת מפתחות
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * קבלת גודל ה-cache
   * @returns {number} מספר הרשומות
   */
  size() {
    return this.cache.size;
  }

  /**
   * קבלת סטטיסטיקות
   * @returns {Object} סטטיסטיקות
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? 
      Math.round((this.stats.hits / totalRequests) * 10000) / 100 : 0;
    
    return {
      ...this.stats,
      totalRequests,
      hitRate: `${hitRate}%`,
      currentSize: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      memoryUsage: this._estimateMemoryUsage()
    };
  }

  /**
   * איפוס סטטיסטיקות
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0
    };
  }

  /**
   * ניקוי רשומות שפג תוקפן
   * @private
   */
  _cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.delete(key);
    });
    
    if (keysToDelete.length > 0) {
      this.stats.cleanups++;
      console.log(`🧹 Cache cleanup: removed ${keysToDelete.length} expired items`);
    }
  }

  /**
   * פינוי רשומה הכי פחות בשימוש (LRU)
   * @private
   */
  _evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, time] of this.accessTimes.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      console.log(`🗑️ Cache evicted LRU item: ${oldestKey}`);
    }
  }

  /**
   * הערכת שימוש בזיכרון
   * @private
   */
  _estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, item] of this.cache.entries()) {
      // הערכה גסה של גודל המפתח והערך
      totalSize += key.length * 2; // Unicode characters
      totalSize += JSON.stringify(item.value).length * 2;
      totalSize += 100; // metadata overhead
    }
    
    // המרה לקילובייטים
    return Math.round(totalSize / 1024 * 100) / 100;
  }

  /**
   * עצירת ה-cache וניקוי משאבים
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.clear();
  }

  /**
   * יצירת מפתח cache לחיפוש רכב
   * @param {string} licensePlate - מספר לוחית רישוי
   * @returns {string} מפתח cache
   */
  static createVehicleKey(licensePlate) {
    return `vehicle:${licensePlate}`;
  }

  /**
   * יצירת מפתח cache לתו נכה
   * @param {string} licensePlate - מספר לוחית רישוי
   * @returns {string} מפתח cache
   */
  static createDisabilityKey(licensePlate) {
    return `disability:${licensePlate}`;
  }
}

module.exports = SimpleCache;