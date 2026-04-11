const axios = require('axios');
const claude = require('../bot/claude');

const BASE = () => `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

// קבוצות לפי ערים
const CITY_GROUPS = {
    'ירושלים':       process.env.TG_JERUSALEM   || '',
    'תל אביב':       process.env.TG_TELAVIV     || '',
    'פתח תקווה':     process.env.TG_PETAHTIKVA  || '',
    'ראשון לציון':   process.env.TG_RISHON       || '',
    'נתניה':         process.env.TG_NETANYA      || '',
};
const MAIN_CHANNEL = process.env.TG_MAIN_CHANNEL || '';

async function setWebhook(url) {
    try {
          await axios.post(`${BASE()}/setWebhook`, { url: `${url}/telegram` });
          console.log('✅ Telegram webhook set');
    } catch (e) {
          console.error('❌ Telegram webhook error:', e.message);
    }
}

async function handleIncoming(req, res) {
    res.sendStatus(200);
    const msg = req.body && req.body.message;
    if (!msg || !msg.text) return;
    const chatId = String(msg.chat.id);
    const text   = msg.text;
    try {
          const result = await claude.processMessage(chatId, text, 'telegram');
          await sendMessage(chatId, result.text);
    } catch (e) {
          console.error('[Telegram handleIncoming Error]', e.message);
          await sendMessage(chatId, 'מצטער, נתקלתי בבעיה. נסה שוב 🙏');
    }
}

// שליחת הודעה — parse_mode אופציונלי, לא מעבירים string ריק
async function sendMessage(chatId, text, parseMode) {
    if (!chatId || !text) return;
    const payload = { chat_id: chatId, text: text.substring(0, 4096) };
    if (parseMode) payload.parse_mode = parseMode;
    try {
          await axios.post(`${BASE()}/sendMessage`, payload);
    } catch (e) {
          // אם HTML נכשל — ננסה שוב כטקסט פשוט
      if (parseMode && e.response && e.response.data && e.response.data.error_code === 400) {
              console.warn('[Telegram] parse_mode נכשל, מנסה plain text');
              await axios.post(`${BASE()}/sendMessage`, { chat_id: chatId, text: text.replace(/<[^>]*>/g, '').substring(0, 4096) });
      } else {
              console.error('[Telegram sendMessage Error]', e.message);
      }
    }
}

// פרסום משרה לערוץ / קבוצה — עם HTML formatting
function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function publishJob(job, targetChatId) {
    if (!targetChatId || !job || !job.title) return;
    const emoji = job.emoji || '💼';
    const chips = Array.isArray(job.chips) && job.chips.length
      ? '✅ ' + job.chips.filter(Boolean).slice(0, 3).join(' | ')
          : '';
    const lines = [
          `<b>${emoji} ${escapeHtml(job.title)}</b>`,
          `📍 ${escapeHtml(job.location || 'ישראל')}`,
          job.salary ? `💰 ${escapeHtml(job.salary)}` : '',
          chips,
          '',
          '📩 לפרטים: @ogenemployment_bot',
          '🌐 ogenemployment.co.il',
        ].filter(l => l !== undefined && l !== '');
    await sendMessage(targetChatId, lines.join('\n'), 'HTML');
}

// פרסום אוטומטי לכל הערוצים
async function publishJobToAllChannels(jobs) {
    for (const job of jobs) {
          if (!job || !job.title) continue;
          if (MAIN_CHANNEL) await publishJob(job, MAIN_CHANNEL);
          const loc = job.location || '';
          for (const [city, groupId] of Object.entries(CITY_GROUPS)) {
                  if (groupId && loc.includes(city)) {
                            await publishJob(job, groupId);
                            break;
                  }
          }
          await new Promise(r => setTimeout(r, 500));
    }
}

module.exports = { handleIncoming, setWebhook, sendMessage, publishJob, publishJobToAllChannels };
