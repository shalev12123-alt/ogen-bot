const axios  = require('axios');
const claude = require('../bot/claude');

const WA_API = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
const HEADERS = () => ({
  Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
  'Content-Type': 'application/json'
});

// ─── קבלת הודעה נכנסת מ-WhatsApp ────────────────────
async function handleIncoming(body) {
  const entry   = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value   = changes?.value;
  const messages = value?.messages;

  if (!messages || !messages.length) return;

  for (const msg of messages) {
    if (msg.type !== 'text') {
      // תגובה להודעה שאינה טקסט
      await sendMessage(msg.from, 'שלום! כרגע אני מטפל רק בהודעות טקסט 😊\nכתוב לי מה אתה מחפש ואשמח לעזור!');
      continue;
    }

    const phone   = msg.from;
    const userText = msg.text.body;

    console.log(`📱 WhatsApp [${phone}]: ${userText.substring(0, 50)}`);

    // Mark as read
    await markRead(msg.id).catch(() => {});

    // עיבוד + תגובה
    try {
      const result = await claude.processMessage(phone, userText, 'whatsapp');
      await sendMessage(phone, result.text);
    } catch (err) {
      console.error(`Error processing WA message from ${phone}:`, err.message);
      await sendMessage(phone, 'מצטער, נתקלתי בבעיה טכנית. נסה שוב בעוד רגע 🙏');
    }
  }
}

// ─── שליחת הודעה ─────────────────────────────────────
async function sendMessage(to, text) {
  try {
    await axios.post(WA_API, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text, preview_url: false }
    }, { headers: HEADERS() });
  } catch (err) {
    console.error(`Failed to send WA to ${to}:`, err.response?.data || err.message);
  }
}

// ─── Mark as read ─────────────────────────────────────
async function markRead(messageId) {
  await axios.post(WA_API.replace('/messages', '/messages'), {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId
  }, { headers: HEADERS() });
}

module.exports = { handleIncoming, sendMessage };
