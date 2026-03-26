require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const whatsapp  = require('./channels/whatsapp');
const telegram = require('./channels/telegram');
const instagram = require('./channels/instagram');
const apiRoutes = require('./routes/api');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── WhatsApp webhook ─────────────────────────────────
// GET  — אימות Meta
app.get('/webhook', (req, res) => {
  const mode  = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// POST — הודעות נכנסות
app.post('/telegram', telegram.handleIncoming);
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // תמיד עונים מהר ל-Meta
  try {
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      await whatsapp.handleIncoming(body);
    } else if (body.object === 'instagram') {
      await instagram.handleIncoming(body);
    }
  } catch (err) {
    console.error('Webhook error:', err.message);
  }
});

// ─── API לדשבורד ─────────────────────────────────────
app.use('/api', apiRoutes);

// ─── דשבורד ניהול (SPA) ──────────────────────────────
app.get('/dashboard*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ─── Health check ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', bot: process.env.BOT_NAME, time: new Date().toISOString() });
});

const axios = require('axios');
let jobPublishIndex = 0;

setInterval(async () => {
  try {
    const token = process.env.TELEGRAM_TOKEN;
    const channel = '@ogenemploymenta';
    const db = require('./db/supabase');
    const jobs = await db.getActiveJobs();
    if (!jobs.length) return;
    
    const batch = [];
    for (let i = 0; i < 5; i++) {
      batch.push(jobs[jobPublishIndex % jobs.length]);
      jobPublishIndex++;
    }
    
    for (const j of batch) {
      const sal = j.salary_min ? '\n💰 ' + Number(j.salary_min).toLocaleString() + ' ש"ח' : '';
      const reqs = j.requirements ? '\n✅ ' + j.requirements.substring(0, 80) : '';
      const text = '🔥 ' + j.title + '\n📍 ' + (j.location || 'לא צוין') + sal + reqs + '\n\nעוגן תעסוקתי | ogenemployment.co.il';
      await axios.post('https://api.telegram.org/bot' + token + '/sendMessage', {
        chat_id: channel,
        text: text,
        reply_markup: { inline_keyboard: [[{ text: 'שלח קו"ח', url: 'https://t.me/ogenemployment_bot' }]] }
      });
      await new Promise(r => setTimeout(r, 10000));
    }
    console.log('פורסמו 5 משרות לערוץ');
  } catch(e) {
    console.error('Auto publish error:', e.message);
  }
}, 60 * 60 * 1000);
app.listen(PORT, () => {
  console.log(`🚀 עוגן-בוט פועל על פורט ${PORT}`);
  console.log(`📱 Webhook: https://YOUR_DOMAIN/webhook`);
  console.log(`🖥️  Dashboard: https://YOUR_DOMAIN/dashboard`);
}); if (process.env.TELEGRAM_TOKEN) {
  telegram.setWebhook('https://ogen-whatsapp-bot-production.up.railway.app');
}
