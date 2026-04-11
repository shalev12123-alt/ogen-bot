require("dotenv").config();
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const twilio = require("twilio");
const axios = require("axios");
const path = require('path');
const { createClient } = require
const {
  searchJobs,
  formatJobsForPrompt,
  getCategorySummary,
  extractPreferences,
  JOBS,
} = require("./jobs_data");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Clients ───────────────────────────────────────────────────────
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ── Conversation Store ────────────────────────────────────────────
const conversations = {};
const candidateContext = {}; // שמירת העדפות מועמד לאורך השיחה
const MAX_HISTORY = 30;

// ══════════════════════════════════════════════════════════════════
//  AIRTABLE — שמירת מועמדים ומשרות חדשות
// ══════════════════════════════════════════════════════════════════
const AIRTABLE_HEADERS = {
  Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
  "Content-Type": "application/json",
};

async function saveCandidate(data) {
  if (!process.env.AIRTABLE_API_KEY) return;
  try {
    await axios.post(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/מועמדים`,
      { fields: data },
      { headers: AIRTABLE_HEADERS }
    );
    console.log("[Airtable] מועמד נשמר:", data["שם"] || data["מזהה משתמש"]);
  } catch (err) {
    console.error("[Airtable saveCandidate Error]", err.message);
  }
}

async function saveJob(data) {
  if (!process.env.AIRTABLE_API_KEY) return;
  try {
    await axios.post(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/משרות`,
      {
        fields: {
          תפקיד: data.תפקיד || "",
          חברה: data.חברה || "",
          מיקום: data.מיקום || "",
          שכר: data.שכר || "",
          דרישות: data.דרישות || "",
          סטטוס: "פתוח",
        },
      },
      { headers: AIRTABLE_HEADERS }
    );
    console.log("[Airtable] משרה חדשה נשמרה:", data.תפקיד);
  } catch (err) {
    console.error("[Airtable saveJob Error]", err.message);
  }
}

// ══════════════════════════════════════════════════════════════════
//  WHATSAPP ALERT לשלו
// ══════════════════════════════════════════════════════════════════
async function alertShalev(type, summary) {
  const emoji = type === "candidate" ? "🙋" : "🏢";
  const label = type === "candidate" ? "מועמד חדש מתאים" : "משרה חדשה התקבלה";
  try {
    await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${process.env.SHALEV_PHONE}`,
      body: `${emoji} *${label} – עוגן תעסוקתי*\n\n${summary}\n\n_נשמר ב-Airtable, ממתין לטיפולך_`,
    });
  } catch (err) {
    console.error("[Alert Error]", err.message);
  }
}

// ══════════════════════════════════════════════════════════════════
//  SYSTEM PROMPT — עם משרות דינמיות
// ══════════════════════════════════════════════════════════════════
function buildSystemPrompt(matchingJobs, context) {
  const { topTypes, topLocs, total } = getCategorySummary();

  const jobsSection =
    matchingJobs.length > 0
      ? `## משרות מתאימות למועמד:\n${formatJobsForPrompt(matchingJobs)}`
      : `## טרם זוהו העדפות — שאל את המועמד מה הוא מחפש`;

  return `אתה מיכאל – סוכן השמה בכיר של עוגן תעסוקתי, עם 15 שנות ניסיון בגיוס והשמת עובדים.

## אופי ודרך דיבור:
- דבר בגוף ראשון רבים: "ברוכים הבאים", "נשמח לסייע", "נחזור אליכם"
- אנושי, חם ומקצועי – לא רובוטי
- אל תאמר שאתה בוט או AI – אתה מיכאל, סוכן השמה
- שאל שאלה אחת בכל פעם בלבד
- אם המועמד שואל על משרה שלא ברשימה — אמור שתבדוק ויחזרו אליו

## מאגר משרות:
יש לנו כרגע ${total} משרות פתוחות!
תחומים: ${topTypes}
אזורים: ${topLocs}

${jobsSection}

## חשוב — הצגת משרות:
- כשמציג משרה, כלול: כותרת, מיקום, שכר, שעות, דרישות
- הצג עד 3 משרות בכל הודעה
- אם יש יותר — אמור "יש לנו עוד X משרות דומות, רוצה לשמוע?"
- אם אין התאמה — הצע תחומים קרובים

## זרימת שיחה – מועמד:
1. ברכה חמה + שאל: מועמד או מעסיק?
2. שם מלא
3. תחום ותפקיד מבוקש
4. שנות ניסיון
5. מיקום מועדף
6. ציפיות שכר
7. זמינות להתחיל
8. הצג משרות מתאימות מהרשימה
9. אמור שנציג יחזור תוך 24 שעות
10. בסוף כתוב בדיוק:
##CANDIDATE_SUMMARY##
שם: [שם]
תפקיד מבוקש: [תפקיד]
ניסיון: [שנים]
מיקום: [מיקום]
שכר מצופה: [שכר]
זמינות: [זמינות]
פלטפורמה: [פלטפורמה]
התאמה למשרה: [שם משרה או "אין התאמה"]

## זרימת שיחה – מעסיק:
1. ברכה חמה
2. שם + שם חברה
3. שם התפקיד לאיוש
4. דרישות חובה
5. מיקום + היקף משרה
6. טווח שכר מוצע
7. מועד כניסה רצוי
8. אמור שנחזור עם מועמדים תוך 48 שעות
9. בסוף כתוב בדיוק:
##JOB_SUMMARY##
תפקיד: [תפקיד]
חברה: [חברה]
מיקום: [מיקום]
שכר: [שכר]
דרישות: [דרישות]
כניסה: [מועד]

## חוקים:
- עברית בלבד
- שאלה אחת בכל פעם
- אל תמציא מידע או משרות שלא ברשימה`;
}

// ══════════════════════════════════════════════════════════════════
//  CORE – עיבוד הודעה עם חיפוש חכם
// ══════════════════════════════════════════════════════════════════
async function processMessage(platform, userId, userMessage) {
  const key = `${platform}:${userId}`;
  if (!conversations[key]) conversations[key] = [];
  if (!candidateContext[key]) candidateContext[key] = { type: null, location: null };

  conversations[key].push({ role: "user", content: userMessage });
  if (conversations[key].length > MAX_HISTORY) {
    conversations[key] = conversations[key].slice(-MAX_HISTORY);
  }

  // ── חיפוש משרות על בסיס כל ההודעות ───────────────────────
  const allText = conversations[key]
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  const prefs = extractPreferences(allText);
  // עדכן העדפות מצטברות
  if (prefs.type) candidateContext[key].type = prefs.type;
  if (prefs.location) candidateContext[key].location = prefs.location;

  const ctx = candidateContext[key];
  let matchingJobs = [];
  if (ctx.type || ctx.location) {
    matchingJobs = searchJobs({
      type: ctx.type,
      location: ctx.location,
      limit: 8,
    });
    console.log(
      `🔍 [${key}] חיפוש: type=${ctx.type}, location=${ctx.location} → ${matchingJobs.length} תוצאות`
    );
  }

  const systemPrompt = buildSystemPrompt(matchingJobs, ctx);

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversations[key],
  });

  let reply = response.content[0].text;
  conversations[key].push({ role: "assistant", content: reply });

  // ── מועמד סיים שיחה ───────────────────────────────────────
  if (reply.includes("##CANDIDATE_SUMMARY##")) {
    const raw = reply.split("##CANDIDATE_SUMMARY##")[1]?.trim() || "";
    await saveCandidate({
      פלטפורמה: platform,
      "מזהה משתמש": userId,
      סיכום: raw,
      תאריך: new Date().toISOString().split("T")[0],
      סטטוס: "ממתין לטיפול",
    });
    await alertShalev("candidate", raw);
    return reply.split("##CANDIDATE_SUMMARY##")[0].trim();
  }

  // ── מעסיק סיים שיחה ──────────────────────────────────────
  if (reply.includes("##JOB_SUMMARY##")) {
    const raw = reply.split("##JOB_SUMMARY##")[1]?.trim() || "";
    const parse = (label) => {
      const match = raw.match(new RegExp(`${label}:\\s*(.+)`));
      return match ? match[1].trim() : "";
    };
    const jobData = {
      תפקיד: parse("תפקיד"),
      חברה: parse("חברה"),
      מיקום: parse("מיקום"),
      שכר: parse("שכר"),
      דרישות: parse("דרישות"),
    };
    await saveJob(jobData);
    await alertShalev("job", `✅ משרה חדשה!\n\n${raw}`);
    return reply.split("##JOB_SUMMARY##")[0].trim();
  }

  return reply;
}

// ══════════════════════════════════════════════════════════════════
//  WHATSAPP (Twilio)
// ══════════════════════════════════════════════════════════════════
app.post("/webhook/whatsapp", async (req, res) => {
  const { MessagingResponse } = twilio.twiml;
  const twiml = new MessagingResponse();
  const userMessage = (req.body.Body || "").trim();
  const from = req.body.From;
  try {
    const reply = await processMessage("whatsapp", from, userMessage);
    twiml.message(reply);
  } catch (err) {
    console.error("[WhatsApp Error]", err.message);
    twiml.message("מצטערים, נתקלנו בתקלה. אנא נסו שוב בעוד רגע 🙏");
  }
  res.type("text/xml");
  res.send(twiml.toString());
});

// ══════════════════════════════════════════════════════════════════
//  TELEGRAM
// ══════════════════════════════════════════════════════════════════
app.post("/webhook/telegram", async (req, res) => {
  res.sendStatus(200);
  const message = req.body.message;
  if (!message?.text) return;
  const chatId = message.chat.id;
  try {
    const reply = await processMessage("telegram", String(chatId), message.text);
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      { chat_id: chatId, text: reply.substring(0, 4096) }
    );
  } catch (err) {
    console.error("[Telegram Error]", err.message);
  }
});

// ══════════════════════════════════════════════════════════════════
//  META (Facebook + Instagram)
// ══════════════════════════════════════════════════════════════════
app.get("/webhook/meta", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === process.env.META_VERIFY_TOKEN
  ) {
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook/meta", async (req, res) => {
  res.sendStatus(200);
  const body = req.body;
  if (body.object !== "page" && body.object !== "instagram") return;
  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message?.text) continue;
      const platform =
        body.object === "instagram" ? "instagram" : "facebook";
      try {
        const reply = await processMessage(
          platform,
          event.sender.id,
          event.message.text
        );
        await axios.post(
          "https://graph.facebook.com/v19.0/me/messages",
          { recipient: { id: event.sender.id }, message: { text: reply } },
          { params: { access_token: process.env.META_PAGE_ACCESS_TOKEN } }
        );
      } catch (err) {
        console.error(`[${platform} Error]`, err.message);
      }
    }
  }
});

// ══════════════════════════════════════════════════════════════════
//  WEB CHAT API — לממשק צ'אט באתר
// ══════════════════════════════════════════════════════════════════
app.post("/api/chat", async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) {
    return res.status(400).json({ error: "userId and message required" });
  }
  try {
    const reply = await processMessage("web", userId, message);
    res.json({ reply });
  } catch (err) {
    console.error("[Web Chat Error]", err.message);
    res.status(500).json({ error: "שגיאה בעיבוד ההודעה" });
  }
});

// ══════════════════════════════════════════════════════════════════
//  API — חיפוש משרות (לשימוש חיצוני)
// ══════════════════════════════════════════════════════════════════
app.get("/api/jobs", (req, res) => {
  const { type, location, keyword, limit } = req.query;
  const results = searchJobs({
    type,
    location,
    keyword,
    limit: parseInt(limit) || 10,
  });
  res.json({ count: results.length, jobs: results });
});

app.get("/api/jobs/stats", (req, res) => {
  const summary = getCategorySummary();
  res.json(summary);
});

// ══════════════════════════════════════════════════════════════════
//  HEALTH CHECK
// ══════════════════════════════════════════════════════════════════
app.get("/", (req, res) => {
  res.json({
    status: "✅ מיכאל v3 פעיל",
    jobs: JOBS.length,
    platforms: ["WhatsApp", "Telegram", "Facebook", "Instagram", "Web"],
    activeConversations: Object.keys(conversations).length,
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", bot: "עוגן-בוט", jobs: JOBS.length });
});

// ══════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
app.use('/api', require('./routes/api'));
app.listen(PORT, () =>
  console.log(`🚀 מיכאל v3 פעיל – ${JOBS.length} משרות – פורט ${PORT}`)
);
