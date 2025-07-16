/**
 * מגביל קצב בקשות למשתמש
 * מונע spam ושימוש יתר בבוט
 */
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // חלון זמן במילישניות (ברירת מחדל: דקה)
    this.maxRequests = options.maxRequests || 10; // מספר בקשות מקסימלי בחלון
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;
    
    // אחסון נתוני משתמשים
    this.users = new Map();
    
    // ניקוי אוטומטי של נתונים ישנים
    this.cleanupInterval = setInterval(() => {
      this._cleanup();
    }, this.windowMs);
  }

  /**
   * בדיקה אם משתמש יכול לבצע בקשה
   * @param {string} userId - מזהה המשתמש
   * @returns {Object} תוצאת הבדיקה
   */
  checkLimit(userId) {
    const now = Date.now();
    const userKey = `user_${userId}`;
    
    // קבלת נתוני המשתמש או יצירת חדשים
    let userData = this.users.get(userKey);
    if (!userData) {
      userData = {
        requests: [],
        firstRequest: now
      };
      this.users.set(userKey, userData);
    }
    
    // ניקוי בקשות ישנות מחוץ לחלון הזמן
    userData.requests = userData.requests.filter(
      requestTime => now - requestTime < this.windowMs
    );
    
    // בדיקה אם עבר את המגבלה
    if (userData.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...userData.requests);
      const resetTime = oldestRequest + this.windowMs;
      
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetTime: resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000)
      };
    }
    
    // הוספת הבקשה הנוכחית
    userData.requests.push(now);
    
    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - userData.requests.length,
      resetTime: userData.requests[0] + this.windowMs,
      retryAfter: 0
    };
  }

  /**
   * רישום בקשה (לאחר ביצוע מוצלח או כושל)
   * @param {string} userId - מזהה המשתמש
   * @param {boolean} success - האם הבקשה הצליחה
   */
  recordRequest(userId, success = true) {
    // אם מוגדר לדלג על בקשות מוצלחות/כושלות
    if ((success && this.skipSuccessfulRequests) || 
        (!success && this.skipFailedRequests)) {
      return;
    }
    
    // הבקשה כבר נרשמה ב-checkLimit
  }

  /**
   * איפוס מגבלות עבור משתמש
   * @param {string} userId - מזהה המשתמש
   */
  resetUser(userId) {
    const userKey = `user_${userId}`;
    this.users.delete(userKey);
  }

  /**
   * קבלת סטטיסטיקות המגביל
   * @returns {Object} סטטיסטיקות
   */
  getStats() {
    const now = Date.now();
    let totalActiveUsers = 0;
    let totalRequests = 0;
    
    for (const [userId, userData] of this.users.entries()) {
      // ספירת בקשות פעילות (בחלון הזמן הנוכחי)
      const activeRequests = userData.requests.filter(
        requestTime => now - requestTime < this.windowMs
      );
      
      if (activeRequests.length > 0) {
        totalActiveUsers++;
        totalRequests += activeRequests.length;
      }
    }
    
    return {
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
      totalUsers: this.users.size,
      activeUsers: totalActiveUsers,
      totalActiveRequests: totalRequests,
      averageRequestsPerUser: totalActiveUsers > 0 ? 
        Math.round(totalRequests / totalActiveUsers * 100) / 100 : 0
    };
  }

  /**
   * ניקוי נתונים ישנים
   * @private
   */
  _cleanup() {
    const now = Date.now();
    const usersToDelete = [];
    
    for (const [userKey, userData] of this.users.entries()) {
      // ניקוי בקשות ישנות
      userData.requests = userData.requests.filter(
        requestTime => now - requestTime < this.windowMs
      );
      
      // מחיקת משתמשים ללא בקשות פעילות
      if (userData.requests.length === 0 && 
          now - userData.firstRequest > this.windowMs * 2) {
        usersToDelete.push(userKey);
      }
    }
    
    // מחיקת משתמשים לא פעילים
    usersToDelete.forEach(userKey => {
      this.users.delete(userKey);
    });
    
    if (usersToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${usersToDelete.length} inactive users from rate limiter`);
    }
  }

  /**
   * עצירת המגביל וניקוי משאבים
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.users.clear();
  }

  /**
   * יצירת הודעת שגיאה למגבלת קצב
   * @param {Object} limitResult - תוצאת בדיקת המגבלה
   * @returns {string} הודעת שגיאה
   */
  static createLimitMessage(limitResult) {
    const minutes = Math.ceil(limitResult.retryAfter / 60);
    const seconds = limitResult.retryAfter % 60;
    
    let timeMessage;
    if (minutes > 0) {
      timeMessage = `${minutes} דקות`;
      if (seconds > 0) {
        timeMessage += ` ו-${seconds} שניות`;
      }
    } else {
      timeMessage = `${seconds} שניות`;
    }
    
    return `⏳ יותר מדי בקשות!\n\nאנא המתינו ${timeMessage} לפני הבקשה הבאה.\n\n💡 מגבלה: ${limitResult.limit} בקשות לדקה`;
  }
}

module.exports = RateLimiter;