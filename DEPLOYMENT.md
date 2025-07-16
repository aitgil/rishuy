# מדריך פריסה - בוט טלגרם לחיפוש רכבים

## דרישות מערכת

### חומרה מינימלית
- **RAM**: 512MB (מומלץ 1GB)
- **CPU**: 1 Core (מומלץ 2 Cores)
- **דיסק**: 2GB פנויים
- **רשת**: חיבור יציב לאינטרנט

### תוכנה נדרשת
- Docker 20.10+
- Docker Compose 2.0+
- Git (לשכפול הפרויקט)

## הכנה לפריסה

### 1. שכפול הפרויקט
```bash
git clone <repository-url>
cd telegram-vehicle-bot
```

### 2. יצירת בוט טלגרם
1. פתחו שיחה עם [@BotFather](https://t.me/botfather)
2. שלחו `/newbot`
3. בחרו שם לבוט
4. בחרו username לבוט (חייב להסתיים ב-bot)
5. שמרו את הטוקן שתקבלו

### 3. הגדרת משתני סביבה
```bash
cp .env.example .env
nano .env
```

ערכו את הקובץ עם הטוקן שלכם:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
NODE_ENV=production
LOG_LEVEL=info
```

## פריסה בסיסית (Polling)

### הפעלה מהירה
```bash
# הפעלת הבוט
./scripts/start.sh

# בדיקת סטטוס
./scripts/status.sh

# צפייה בלוגים
docker-compose logs -f telegram-vehicle-bot
```

### עצירה והפעלה מחדש
```bash
# עצירה
./scripts/stop.sh

# הפעלה מחדש
./scripts/restart.sh
```

## פריסה מתקדמת (Webhook)

### 1. הכנת SSL Certificate
```bash
# יצירת תיקיית SSL
mkdir ssl

# יצירת self-signed certificate (לפיתוח)
openssl req -newkey rsa:2048 -sha256 -nodes -keyout ssl/key.pem -x509 -days 365 -out ssl/cert.pem

# או העתקת certificate אמיתי
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem
```

### 2. הגדרת Webhook
```bash
# עדכון .env
echo "WEBHOOK_URL=https://your-domain.com/webhook" >> .env
echo "WEBHOOK_PORT=3000" >> .env

# הפעלה עם Nginx
docker-compose --profile webhook up -d
```

### 3. רישום Webhook בטלגרם
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-domain.com/webhook"}'
```

## מעקב ותחזוקה

### לוגים
```bash
# צפייה בלוגים בזמן אמת
docker-compose logs -f telegram-vehicle-bot

# לוגים של 100 השורות האחרונות
docker-compose logs --tail=100 telegram-vehicle-bot

# לוגים מהיום האחרון
docker-compose logs --since=24h telegram-vehicle-bot
```

### בדיקת בריאות
```bash
# בדיקה מהירה
./scripts/status.sh

# בדיקה מפורטת
docker-compose exec telegram-vehicle-bot node -e "
const BotManager = require('./src/bot');
const bot = new BotManager(process.env.TELEGRAM_BOT_TOKEN);
bot.healthCheck().then(console.log);
"
```

### גיבוי והחזרה
```bash
# גיבוי הגדרות משתמש (אם יש DB)
docker-compose exec telegram-vehicle-bot node -e "
const UserSettingsService = require('./src/services/userSettingsService');
const service = new UserSettingsService();
service.exportAllUsers().then(data => 
  require('fs').writeFileSync('/app/backup.json', JSON.stringify(data))
);
"

# העתקת הגיבוי
docker cp telegram-vehicle-bot:/app/backup.json ./backup-$(date +%Y%m%d).json
```

## אופטימיזציה לפרודקשן

### 1. הגבלת משאבים
עדכנו את `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

### 2. הגדרות אבטחה
```bash
# הגדרת firewall (Ubuntu/Debian)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# עדכון מערכת
sudo apt update && sudo apt upgrade -y
```

### 3. מעקב אוטומטי
הוספת cron job לבדיקה תקופתית:
```bash
# עריכת crontab
crontab -e

# הוספת בדיקה כל 5 דקות
*/5 * * * * cd /path/to/telegram-vehicle-bot && ./scripts/status.sh > /dev/null || ./scripts/restart.sh
```

## פתרון בעיות נפוצות

### הבוט לא מגיב
1. בדקו שהטוקן נכון
2. בדקו חיבור לאינטרנט
3. בדקו לוגים: `docker-compose logs telegram-vehicle-bot`

### שגיאות API
1. בדקו שה-API הישראלי זמין
2. בדקו הגדרות timeout
3. בדקו rate limiting

### בעיות זיכרון
1. הגדילו את הגבלת הזיכרון
2. בדקו memory leaks בלוגים
3. הפעילו מחדש: `./scripts/restart.sh`

### בעיות רשת
1. בדקו חיבור לטלגרם: `curl -I https://api.telegram.org`
2. בדקו DNS: `nslookup api.telegram.org`
3. בדקו firewall settings

## עדכון הבוט

### עדכון קוד
```bash
# עצירת הבוט
./scripts/stop.sh

# עדכון קוד
git pull origin main

# בנייה מחדש והפעלה
docker-compose build --no-cache
./scripts/start.sh
```

### עדכון dependencies
```bash
# עדכון package.json
npm update

# בנייה מחדש של Docker image
docker-compose build --no-cache telegram-vehicle-bot
```

## אבטחה

### הגנה בסיסית
- השתמשו בטוקן חזק ושמרו אותו בסוד
- הגדירו HTTPS לwebhook
- הגבילו גישה לשרת (firewall)
- עדכנו את המערכת באופן קבוע

### מעקב אחר פעילות חשודה
```bash
# בדיקת לוגי שגיאות
docker-compose logs telegram-vehicle-bot | grep ERROR

# בדיקת rate limiting
docker-compose logs telegram-vehicle-bot | grep "יותר מדי בקשות"
```

## תמיכה

אם נתקלתם בבעיות:
1. בדקו את הלוגים
2. בדקו את מדריך פתרון הבעיות
3. ודאו שכל הדרישות מתקיימות
4. פנו לתמיכה עם פרטי השגיאה