# בוט טלגרם לחיפוש רכבים ישראליים
FROM node:18-alpine

# הגדרת metadata
LABEL maintainer="Telegram Vehicle Bot"
LABEL description="Israeli Vehicle Search Telegram Bot"
LABEL version="1.0.0"

# יצירת משתמש לא-root לאבטחה
RUN addgroup -g 1001 -S botuser && \
    adduser -S botuser -u 1001 -G botuser

# הגדרת תיקיית עבודה
WORKDIR /app

# העתקת קבצי package לפני שאר הקוד (לאופטימיזציה של Docker layers)
COPY package*.json ./

# התקנת dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# העתקת קוד האפליקציה
COPY --chown=botuser:botuser . .

# הסרת קבצים לא נחוצים
RUN rm -rf tests/ \
    .git/ \
    .gitignore \
    README.md \
    jest.config.js \
    .eslintrc.js \
    .prettierrc

# מעבר למשתמש לא-root
USER botuser

# חשיפת פורט (אם נדרש webhook)
EXPOSE 3000

# הגדרת משתני סביבה ברירת מחדל
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV API_TIMEOUT=5000
ENV API_RETRY_ATTEMPTS=3
ENV RATE_LIMIT_WINDOW_MS=60000
ENV RATE_LIMIT_MAX_REQUESTS=10

# בדיקת בריאות
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('./src/bot').healthCheck().then(h => process.exit(h.healthy ? 0 : 1))" || exit 1

# הפעלת האפליקציה
CMD ["npm", "start"]