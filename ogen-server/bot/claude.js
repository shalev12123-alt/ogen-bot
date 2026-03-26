const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db/supabase');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── בניית system prompt דינמי עם משרות עדכניות ──────
async function buildSystemPrompt() {
  const jobs = await db.getActiveJobs();
  const jobsList = jobs.length
    ? jobs.map(j =>
        `• ${j.title} | ${j.location}${j.salary_min ? ' | ₪' + j.salary_min.toLocaleString() + (j.salary_max ? '–₪' + j.salary_max.toLocaleString() : '+') : ''}${j.requirements ? ' | ' + j.requirements.substring(0, 60) : ''}`
      ).join('\n')
    : 'אין משרות פעילות כרגע — ספר למועמד שיש הרבה משרות ותבקש פרטים.';

  return `אתה "${process.env.BOT_NAME || 'עוגן-בוט'}" — הסוכן הדיגיטלי של עוגן תעסוקתי (ogenemployment.co.il).
אתה מגלם סוכן גיוס מקצועי: חם, ענייני, ומכוון לתוצאה. תמיד כתוב עברית בלבד.

## משרות פתוחות כרגע:
${jobsList}

## זרימת שיחה — מועמד:
1. ברך בחמימות, שאל מה מביא אותו
2. אסוף שלב אחר שלב: שם מלא, תפקיד מבוקש, שנות ניסיון, ציפיות שכר, מיקום, זמינות
3. הצע 1–3 משרות מהרשימה שמתאימות
4. בקש קישור לקורות חיים (LinkedIn / Google Drive / PDF)
5. סכם ואמר שסוכן יחזור תוך 24 שעות

## זרימת שיחה — לקוח מגייס (חברה):
אסוף: שם חברה, תפקיד, מיקום, שכר משוער, שם איש קשר + טלפון/מייל
← הפעל HANDOFF מיידי

## כללי HANDOFF — כתוב [HANDOFF] כשמופעל:
- מועמד עם ציון התאמה ${process.env.HANDOFF_SCORE || 8}+/10 למשרה ספציפית
- לקוח מגייס פנה
- מועמד מבקש לדבר עם אדם
- שאלה מחוץ לתחום

## עדכון נתונים — הוסף בסוף כל הודעה (לא גלוי):
[DATA]{"name":"...","role":"...","exp":"...","salary":"...","location":"...","availability":"...","score":N,"cv":"...","type":"candidate"}[/DATA]
(type יכול להיות "candidate" או "client")

## חוקים:
- לא מבטיח קבלה לעבודה
- לא מנהל משא ומתן על שכר
- לא מגלה שמות לקוחות
- לא יותר מ-3 שאלות בהודעה אחת

חתימה: "עוגן תעסוקתי | ${process.env.AGENT_EMAIL || 'jobs@ogenemployment.co.il'}"`;
}

// ─── פונקציה מרכזית — עיבוד הודעה ──────────────────
async function processMessage(phone, userText, platform = 'whatsapp') {
  // שליפה / יצירת מועמד
  const candidate = await db.getOrCreateCandidate(phone, platform);
  const candidateId = candidate.id;

  // שמירת הודעת משתמש
  await db.saveMessage(candidateId, 'user', userText);

  // שליפת היסטוריה
  const history = await db.getHistory(candidateId, 18);

  // בניית prompt
  const systemPrompt = await buildSystemPrompt();

  // קריאה ל-Claude
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: history
  });

  const rawText = response.content[0]?.text || 'מצטער, נתקלתי בשגיאה. נסה שוב.';

  // חילוץ DATA
  const dataMatch = rawText.match(/\[DATA\](.*?)\[\/DATA\]/s);
  let extractedData = null;
  if (dataMatch) {
    try {
      extractedData = JSON.parse(dataMatch[1]);
    } catch (e) {}
  }

  // בדיקת HANDOFF
  const isHandoff = rawText.includes('[HANDOFF]');

  // ניקוי טקסט תצוגה
  const cleanText = rawText
    .replace(/\[DATA\].*?\[\/DATA\]/s, '')
    .replace('[HANDOFF]', '')
    .trim();

  // שמירת תגובת הבוט
  await db.saveMessage(candidateId, 'assistant', rawText);

  // עדכון נתוני מועמד
  if (extractedData) {
    const updates = {};
    if (extractedData.name)         updates.name         = extractedData.name;
    if (extractedData.role)         updates.role_sought  = extractedData.role;
    if (extractedData.exp)          updates.experience   = extractedData.exp;
    if (extractedData.salary)       updates.salary_exp   = extractedData.salary;
    if (extractedData.location)     updates.location     = extractedData.location;
    if (extractedData.availability) updates.availability = extractedData.availability;
    if (extractedData.cv)           updates.cv_url       = extractedData.cv;
    if (extractedData.score)        updates.score        = extractedData.score;
    if (Object.keys(updates).length) {
      await db.updateCandidate(phone, updates);
    }

    // לקוח מגייס → שמור כ-lead
    if (extractedData.type === 'client') {
      await db.createLead({
        company_name: extractedData.company || extractedData.name,
        contact_name: extractedData.name,
        phone,
        role_needed: extractedData.role,
        platform,
        status: 'new'
      });
    }
  }

  // HANDOFF → עדכן סטטוס + שלח התראה לסוכן
  if (isHandoff) {
    await db.updateCandidate(phone, { status: 'screening' });
    await notifyAgent(candidate, extractedData, cleanText);
  }

  return { text: cleanText, handoff: isHandoff };
}

// ─── התראה לסוכן ─────────────────────────────────────
async function notifyAgent(candidate, data, lastMsg) {
  const agentPhone = process.env.AGENT_PHONE;
  if (!agentPhone) return;

  const name     = data?.name     || candidate.name     || 'לא ידוע';
  const role     = data?.role     || candidate.role_sought || '—';
  const salary   = data?.salary   || candidate.salary_exp  || '—';
  const location = data?.location || candidate.location     || '—';
  const score    = data?.score    || candidate.score        || '—';
  const cv       = data?.cv       || candidate.cv_url       || 'לא נשלח';

  const msg =
    `🔔 *HANDOFF — מועמד חדש מהבוט*\n` +
    `━━━━━━━━━━━━━━━\n` +
    `👤 שם: ${name}\n` +
    `📱 טלפון: ${candidate.phone}\n` +
    `🎯 תפקיד: ${role}\n` +
    `⭐ ציון: ${score}/10\n` +
    `💰 ציפיות: ${salary}\n` +
    `📍 מיקום: ${location}\n` +
    `📎 CV: ${cv}\n` +
    `━━━━━━━━━━━━━━━\n` +
    `💬 הודעה אחרונה:\n${lastMsg.substring(0, 150)}\n\n` +
    `_עוגן תעסוקתי | Bot System_`;

  // שליחה ב-WhatsApp לסוכן
  try {
    const axios = require('axios');
    await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: agentPhone,
        type: 'text',
        text: { body: msg }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`✅ Handoff notification sent to agent`);
  } catch (err) {
    console.error('Failed to notify agent:', err.message);
  }
}

module.exports = { processMessage, buildSystemPrompt };
