# ⚓ בוט גיוס עוגן תעסוקתי — מדריך הקמה

## מה הבוט עושה?
- מקבל מועמדים בוואטסאפ ומדבר איתם כמו סוכן גיוס אמיתי
- שואל שאלות סינון חכמות (תחום, אזור, ניסיון, זמינות)
- מתאים משרות מהרשימה שלך
- שולח לך התראה אישית כשמועמד מתאים

---

## שלב 1 — קבל מפתח API חינמי של Claude

1. לך ל: https://console.anthropic.com
2. הירשם (חינמי)
3. לחץ על "API Keys" → "Create Key"
4. שמור את המפתח (מתחיל ב-`sk-ant-...`)

---

## שלב 2 — העלה לGitHub

1. צור חשבון GitHub (חינמי): https://github.com
2. צור repository חדש בשם `ogen-bot`
3. העלה את כל הקבצים

או בטרמינל:
```bash
cd whatsapp-bot
git init
git add .
git commit -m "ogen bot"
git remote add origin https://github.com/YOUR_USERNAME/ogen-bot.git
git push -u origin main
```

---

## שלב 3 — פרוס ב-Render (חינמי)

1. לך ל: https://render.com ← הירשם עם GitHub
2. לחץ **"New +"** → **"Web Service"**
3. בחר את ה-repository שלך
4. מלא:
   - **Name:** ogen-bot
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
5. לחץ **"Advanced"** → **"Add Environment Variable"**:
   - `ANTHROPIC_API_KEY` = המפתח שקיבלת בשלב 1
   - `RECRUITER_NUMBER` = המספר שלך (דוגמה: `972557249157`)
6. לחץ **"Create Web Service"**

---

## שלב 4 — חבר את הוואטסאפ

1. אחרי שה-deploy הסתיים, פתח את ה-URL של השרת
2. תראה QR code על המסך
3. פתח **וואטסאפ בטלפון** → **מכשירים מקושרים** → **קשר מכשיר**
4. סרוק את ה-QR
5. ✅ הבוט פעיל!

---

## עדכון משרות

ערוך את הקובץ `jobs.js` — הוסף/הסר משרות מהמערך `JOBS`.

---

## מה לצפות

- כל מועמד שישלח הודעה → יקבל מענה אוטומטי אנושי
- כשמועמד ישאיר פרטים → תקבל התראה בוואטסאפ
- הבוט עובד 24/7 בענן

---

## שאלות? 
WhatsApp: 055-724-9157
