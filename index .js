// ═══════════════════════════════════════════════════════════
//  עוגן תעסוקתי — בוט גיוס חכם
//  גרסה: 2.0 | powered by Claude AI
// ═══════════════════════════════════════════════════════════

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Anthropic = require('@anthropic-ai/sdk');
const express = require('express');
const QRCode = require('qrcode');
const { JOBS } = require('./jobs');

// ── הגדרות ────────────────────────────────────────────────
const RECRUITER_NUMBER = process.env.RECRUITER_NUMBER || '972557249157'; // מספר המגייס לקבלת התראות
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PORT = process.env.PORT || 3000;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ── שמירת שיחות פעילות ────────────────────────────────────
const conversations = new Map(); // chatId -> { history, stage, candidateData }
let currentQR = null;
let isReady = false;

// ── System Prompt לבוט ────────────────────────────────────
const SYSTEM_PROMPT = `אתה מיכאל, סוכן גיוס מקצועי ואנושי של חברת "עוגן תעסוקתי" — חברת השמה ישראלית מובילה עם 11 שנות ניסיון.

אישיות ודרך תקשורת:
- דבר בעברית פשוטה, חמה ואנושית — כמו בן אדם אמיתי, לא כמו רובוט
- היה ישיר, ידידותי ומקצועי בו זמנית
- השתמש לפעמים באמוג'י (לא יותר מ-2 בהודעה) לתחושה חמה
- אל תשאל יותר משאלה אחת בכל פעם
- הודעות קצרות וברורות — מקסימום 3-4 שורות
- כשמתאימה משרה — היה מלהיב אותה, תאר יתרונות
- אל תדבר כמו תפריט של מחשב — דבר כמו אדם

מידע על עוגן תעסוקתי:
- שירות חינמי לחלוטין למועמדים
- 11 שנות ניסיון בגיוס
- פעילים בכל הארץ
- התחלה מיידית ברוב המשרות
- ממוצע שיבוץ: 3-7 ימים

תהליך הסינון שלך:
1. קבל בברכה ושאל שם
2. שאל באיזה תחום/עבודה מחפש
3. שאל איזה אזור מתאים
4. שאל על ניסיון/רישיונות רלוונטיים
5. שאל על זמינות (מתי יכול להתחיל)
6. התאם משרות מהרשימה וספר עליהן בהתלהבות
7. קבל פרטים: שם מלא + מספר טלפון לאישור
8. סיים בחמימות

כשמועמד מתאים:
- שלח פרטי משרה בסגנון: "מצאתי לך משרה מעולה! 🎯"
- ציין שכר, מיקום ותנאים עיקריים
- שאל אם רוצה שנקדם את הקו"ח

כללים חשובים:
- אף פעם אל תמציא משרות שלא קיימות ברשימה
- אם אין משרה מתאימה — אמור בכנות ובחן אפשרות להתעדכן
- אם מישהו כועס או לא רלוונטי — נהג בסבלנות ומקצועיות
- לאחר קבלת פרטים מלאים — ציין שתועבר לצוות שלנו לתיאום ראיון

רשימת המשרות הזמינות (השתמש בהן בלבד):
${JSON.stringify(JOBS.map(j => ({
  id: j.id,
  title: j.title,
  location: j.location,
  area: j.area,
  type: j.type,
  salary: j.salary,
  requirements: j.requirements,
  hours: j.hours,
  description: j.description,
  urgent: j.urgent
})), null, 2)}`;

// ── פונקציה לשליחת הודעה לClaude ─────────────────────────
async function getChatResponse(chatId, userMessage) {
  if (!conversations.has(chatId)) {
    conversations.set(chatId, {
      history: [],
      stage: 'greeting',
      candidateData: {},
      startTime: new Date()
    });
  }

  const conv = conversations.get(chatId);
  conv.history.push({ role: 'user', content: userMessage });

  // שמירת היסטוריה מוגבלת (30 הודעות אחרונות)
  if (conv.history.length > 30) {
    conv.history = conv.history.slice(-30);
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: conv.history
    });

    const assistantMessage = response.content[0].text;
    conv.history.push({ role: 'assistant', content: assistantMessage });

    // בדיקה אם יש מועמד מוכן לדיווח
    await checkAndNotifyRecruiter(chatId, userMessage, assistantMessage, conv);

    return assistantMessage;
  } catch (error) {
    console.error('Claude API error:', error);
    return 'מצטער, אני נתקל בבעיה טכנית רגעית. אנא נסה שוב בעוד רגע 🙏';
  }
}

// ── דיווח למגייס כשמועמד מתאים ───────────────────────────
async function checkAndNotifyRecruiter(chatId, userMessage, botResponse, conv) {
  const lowerMsg = userMessage.toLowerCase() + ' ' + botResponse.toLowerCase();
  
  // בדיקה אם יש שם + טלפון בשיחה
  const hasPhone = /05\d[-\s]?\d{7}|05\d{8}/.test(userMessage);
  const hasName = userMessage.length > 2 && conv.history.length > 4;
  
  if (hasPhone && hasName && !conv.notified) {
    conv.notified = true;
    
    // איסוף מידע מהשיחה
    const summary = conv.history
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' | ')
      .slice(0, 500);

    const notifyMsg = `🔔 *מועמד/ת חדש/ה מהבוט!*\n\n` +
      `📱 מספר: ${chatId.replace('@c.us', '')}\n` +
      `🕐 זמן: ${new Date().toLocaleString('he-IL')}\n\n` +
      `📝 *סיכום השיחה:*\n${summary}\n\n` +
      `✅ הבוט זיהה מועמד/ת מתאים/ה — ממתין/ה לתיאום ראיון`;

    try {
      await client.sendMessage(`${RECRUITER_NUMBER}@c.us`, notifyMsg);
    } catch (e) {
      console.error('Failed to notify recruiter:', e);
    }
  }
}

// ── אתחול WhatsApp Client ──────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './wa-session' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-extensions',
    ],
  }
});

// ── אירועי WhatsApp ────────────────────────────────────────
client.on('qr', async (qr) => {
  console.log('\n📱 סרוק את קוד ה-QR:');
  qrcode.generate(qr, { small: true });
  currentQR = await QRCode.toDataURL(qr);
  console.log('\nאו פתח: http://localhost:' + PORT + '/qr\n');
});

client.on('ready', () => {
  isReady = true;
  currentQR = null;
  console.log('✅ הבוט מחובר ופעיל!');
  console.log('📱 מספר:', client.info.wid.user);
});

client.on('disconnected', (reason) => {
  isReady = false;
  console.log('❌ הבוט התנתק:', reason);
});

client.on('auth_failure', (msg) => {
  console.error('❌ שגיאת אימות:', msg);
});

// ── מענה להודעות ──────────────────────────────────────────
client.on('message', async (msg) => {
  // דילוג על הודעות מקבוצות, סטטוסים, ומספר המגייס
  if (msg.isGroupMsg) return;
  if (msg.from === 'status@broadcast') return;
  if (msg.from === `${RECRUITER_NUMBER}@c.us`) return;
  if (msg.type !== 'chat') return; // רק הודעות טקסט

  const chatId = msg.from;
  const text = msg.body.trim();

  if (!text) return;

  console.log(`📩 [${new Date().toLocaleTimeString()}] ${chatId}: ${text.slice(0, 50)}`);

  try {
    // הצגת "מקליד..."
    const chat = await msg.getChat();
    await chat.sendStateTyping();

    // עיכוב אנושי (1-3 שניות)
    const delay = 1000 + Math.random() * 2000;
    await new Promise(r => setTimeout(r, delay));

    const response = await getChatResponse(chatId, text);
    await msg.reply(response);

    console.log(`📤 [${chatId.slice(0, 15)}]: ${response.slice(0, 60)}...`);
  } catch (error) {
    console.error('Error handling message:', error);
    await msg.reply('מצטער, אני נתקל בבעיה טכנית. נסה שוב בעוד רגע 🙏');
  }
});

// ── שרת Express (לבדיקת חיים ו-QR) ───────────────────────
const app = express();

app.get('/', (req, res) => {
  res.send(`
    <html dir="rtl">
    <head><meta charset="utf-8"><title>עוגן בוט</title>
    <style>body{font-family:Arial;text-align:center;padding:40px;background:#f0f2f5}
    .status{padding:20px;border-radius:10px;margin:20px auto;max-width:500px;font-size:18px}
    .green{background:#d4edda;color:#155724} .yellow{background:#fff3cd;color:#856404}
    img{max-width:300px;margin:20px auto;display:block}
    </style></head>
    <body>
    <h1>⚓ עוגן תעסוקתי — בוט גיוס</h1>
    ${isReady
      ? '<div class="status green">✅ הבוט מחובר ופעיל!</div>'
      : currentQR
        ? `<div class="status yellow">📱 סרוק QR להתחברות</div><img src="${currentQR}" />`
        : '<div class="status yellow">⏳ מתחיל...</div>'
    }
    <p>שיחות פעילות: ${conversations.size}</p>
    </body></html>
  `);
});

app.get('/qr', (req, res) => {
  if (isReady) return res.send('✅ כבר מחובר!');
  if (!currentQR) return res.send('⏳ ממתין לQR...');
  res.send(`<img src="${currentQR}" style="max-width:300px">`);
});

app.get('/health', (req, res) => {
  res.json({ status: isReady ? 'ready' : 'waiting', conversations: conversations.size });
});

app.get('/stats', (req, res) => {
  const stats = {
    status: isReady ? 'פעיל' : 'לא מחובר',
    activeConversations: conversations.size,
    totalJobs: JOBS.length,
    uptime: process.uptime()
  };
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`🌐 שרת פעיל: http://localhost:${PORT}`);
});

// ── הפעלה ─────────────────────────────────────────────────
console.log('🚀 מפעיל בוט עוגן תעסוקתי...');
client.initialize();

// ניקוי שיחות ישנות (מעל 24 שעות)
setInterval(() => {
  const now = new Date();
  for (const [chatId, conv] of conversations.entries()) {
    if (now - conv.startTime > 24 * 60 * 60 * 1000) {
      conversations.delete(chatId);
    }
  }
}, 60 * 60 * 1000); // כל שעה
