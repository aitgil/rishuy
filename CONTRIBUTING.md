# Contributing to Telegram Vehicle Bot

תודה על העניין שלכם לתרום לפרויקט! אנו מברכים על כל תרומה, בין אם זה תיקון באג, תכונה חדשה, או שיפור בתיעוד.

## 🚀 איך להתחיל

### הכנת סביבת הפיתוח

1. **Fork** את הפרויקט
2. **Clone** את ה-fork שלכם:
   ```bash
   git clone https://github.com/YOUR_USERNAME/telegram-vehicle-bot.git
   cd telegram-vehicle-bot
   ```

3. **התקנת תלויות**:
   ```bash
   npm install
   ```

4. **הגדרת משתני סביבה**:
   ```bash
   cp .env.example .env
   # ערכו את .env עם הטוקן שלכם לבדיקות
   ```

5. **הרצת הבדיקות**:
   ```bash
   npm test
   ```

## 📋 סוגי תרומות

### 🐛 דיווח על באגים
- השתמשו ב-Issue template
- כללו צעדים לשחזור הבעיה
- הוסיפו screenshots אם רלוונטי
- ציינו את גרסת Node.js ומערכת ההפעלה

### ✨ הצעת תכונות חדשות
- פתחו Issue עם תיאור מפורט
- הסבירו למה התכונה חשובה
- הציעו דרכי מימוש אפשריות

### 🔧 תיקון באגים
- צרו branch חדש: `git checkout -b fix/bug-description`
- כתבו בדיקה שמוכיחה את הבאג
- תקנו את הבאג
- וודאו שכל הבדיקות עוברות

### 🎯 הוספת תכונות
- צרו branch חדש: `git checkout -b feature/feature-name`
- כתבו בדיקות לתכונה החדשה
- מימשו את התכונה
- עדכנו תיעוד רלוונטי

## 🎨 קווים מנחים לקוד

### JavaScript Style Guide
- השתמשו ב-ESLint config הקיים
- עקבו אחר Prettier formatting
- השתמשו ב-camelCase למשתנים ופונקציות
- השתמשו ב-PascalCase לקלאסים

### מבנה קוד
```javascript
// טוב ✅
class VehicleDataService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async searchByLicensePlate(plateNumber) {
    // Implementation
  }
}

// לא טוב ❌
function search_vehicle(plate_num) {
  // Implementation
}
```

### הערות בקוד
- כתבו הערות בעברית לחלקי הקוד הספציפיים לישראל
- השתמשו באנגלית להערות טכניות כלליות
- הוסיפו JSDoc לפונקציות ציבוריות

```javascript
/**
 * חיפוש נתוני רכב לפי מספר לוחית רישוי
 * @param {string} plateNumber - מספר לוחית רישוי (7-8 ספרות)
 * @returns {Promise<VehicleData>} נתוני הרכב
 */
async searchByLicensePlate(plateNumber) {
  // ולידציה של מספר הלוחית
  if (!this._isValidPlateNumber(plateNumber)) {
    throw new Error('מספר לוחית רישוי לא תקין');
  }
  // ...
}
```

## 🧪 בדיקות

### כתיבת בדיקות
- כל תכונה חדשה חייבת לכלול בדיקות
- כתבו בדיקות unit, integration ו-e2e לפי הצורך
- השתמשו בשמות תיאוריים לבדיקות

```javascript
describe('VehicleDataService', () => {
  describe('searchByLicensePlate', () => {
    it('should return vehicle data for valid plate number', async () => {
      // Test implementation
    });

    it('should throw error for invalid plate number', async () => {
      // Test implementation
    });
  });
});
```

### הרצת בדיקות
```bash
# כל הבדיקות
npm test

# בדיקות עם coverage
npm run test:coverage

# בדיקות במצב watch
npm run test:watch

# בדיקת lint
npm run lint

# תיקון אוטומטי של lint
npm run lint:fix
```

## 📝 Commit Messages

השתמשו בפורמט הבא:
```
type(scope): description

[optional body]

[optional footer]
```

### סוגי commits:
- `feat`: תכונה חדשה
- `fix`: תיקון באג
- `docs`: שינויים בתיעוד
- `style`: שינויים בעיצוב קוד (לא משפיעים על הפונקציונליות)
- `refactor`: שינוי קוד שלא מוסיף תכונה או מתקן באג
- `test`: הוספת בדיקות
- `chore`: שינויים בכלי build או תלויות

### דוגמאות:
```bash
feat(handlers): add license plate validation
fix(api): handle timeout errors gracefully
docs(readme): update installation instructions
test(services): add unit tests for vehicle service
```

## 🔄 תהליך Pull Request

1. **וודאו שהקוד עובר את כל הבדיקות**:
   ```bash
   npm test
   npm run lint
   ```

2. **עדכנו תיעוד רלוונטי**

3. **צרו Pull Request עם**:
   - כותרת תיאורית
   - תיאור מפורט של השינויים
   - קישור ל-Issue רלוונטי (אם קיים)
   - צילומי מסך (אם רלוונטי)

4. **המתינו לסקירה**:
   - אנו נסקור את ה-PR בהקדם
   - ייתכן שנבקש שינויים
   - לאחר אישור, נמזג את הקוד

## 🏷️ Issue Labels

- `bug` - באג שצריך תיקון
- `enhancement` - תכונה חדשה או שיפור
- `documentation` - שיפורים בתיעוד
- `good first issue` - מתאים למתחילים
- `help wanted` - זקוקים לעזרה
- `priority: high` - עדיפות גבוהה
- `priority: low` - עדיפות נמוכה

## 🤝 קוד התנהגות

### התחייבויות שלנו
- ליצור סביבה פתוחה ומזמינה
- לכבד דעות ונקודות מבט שונות
- לקבל ביקורת בונה בחיוב
- להתמקד במה שטוב לקהילה

### התנהגות מקובלת
- שימוש בשפה מכבדת ומקצועית
- כיבוד דעות שונות
- מתן וקבלת ביקורת בונה
- התמקדות במה שטוב לפרויקט

### התנהגות לא מקובלת
- שפה פוגענית או מטרידה
- התקפות אישיות
- הטרדה פומבית או פרטית
- פרסום מידע פרטי של אחרים

## 📞 יצירת קשר

- פתחו Issue עבור שאלות טכניות
- השתמשו ב-Discussions עבור שאלות כלליות
- צרו קשר ישיר עבור בעיות רגישות

## 🙏 תודות

תודה לכל התורמים לפרויקט! כל תרומה, קטנה כגדולה, עוזרת לשפר את הבוט עבור הקהילה הישראלית.

---

**זכרו: אין שאלות טיפשיות, רק הזדמנויות ללמוד! 🚀**