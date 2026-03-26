require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const whatsapp  = require('./channels/whatsapp');
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

app.listen(PORT, () => {
  console.log(`🚀 עוגן-בוט פועל על פורט ${PORT}`);
  console.log(`📱 Webhook: https://YOUR_DOMAIN/webhook`);
  console.log(`🖥️  Dashboard: https://YOUR_DOMAIN/dashboard`);
});
