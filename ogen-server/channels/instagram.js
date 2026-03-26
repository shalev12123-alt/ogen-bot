const axios  = require('axios');
const claude = require('../bot/claude');

// ─── קבלת הודעה מ-Instagram DM ───────────────────────
async function handleIncoming(body) {
  const entry = body.entry?.[0];
  const messaging = entry?.messaging;
  if (!messaging) return;

  for (const event of messaging) {
    if (!event.message || event.message.is_echo) continue;

    const senderId = event.sender.id;
    const text     = event.message.text;
    if (!text) continue;

    console.log(`📸 Instagram [${senderId}]: ${text.substring(0, 50)}`);

    try {
      const result = await claude.processMessage(senderId, text, 'instagram');
      await sendMessage(senderId, result.text);
    } catch (err) {
      console.error(`Instagram error for ${senderId}:`, err.message);
      await sendMessage(senderId, 'מצטער, נתקלתי בבעיה. נסה שוב 🙏');
    }
  }
}

async function sendMessage(recipientId, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text },
        messaging_type: 'RESPONSE'
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err) {
    console.error('Instagram send error:', err.response?.data || err.message);
  }
}

module.exports = { handleIncoming, sendMessage };
