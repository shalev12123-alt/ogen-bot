const express = require('express');
const router  = express.Router();
const db      = require('../db/supabase');
const axios   = require('axios');

router.get('/candidates', async (req, res) => {
  try {
    const candidates = await db.getAllCandidates();
    res.json({ ok: true, data: candidates });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.patch('/candidates/:id/status', async (req, res) => {
  try {
    await db.updateCandidateStatus(req.params.id, req.body.status);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const jobs = await db.getActiveJobs();
    res.json({ ok: true, data: jobs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/jobs', async (req, res) => {
  try {
    const job = await db.createJob(req.body);
    res.json({ ok: true, data: job });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.patch('/jobs/:id', async (req, res) => {
  try {
    const job = await db.updateJob(req.params.id, req.body);
    res.json({ ok: true, data: job });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete('/jobs/:id', async (req, res) => {
  try {
    await db.deleteJob(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/leads', async (req, res) => {
  try {
    const leads = await db.getAllLeads();
    res.json({ ok: true, data: leads });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const candidates = await db.getAllCandidates();
    const jobs = await db.getActiveJobs();
    const leads = await db.getAllLeads();
    res.json({
      ok: true,
      data: {
        total_candidates: candidates.length,
        new_today: candidates.filter(c => {
          return new Date(c.created_at).toDateString() === new Date().toDateString();
        }).length,
        active_jobs: jobs.length,
        leads: leads.length,
        pipeline: {
          new:       candidates.filter(c => c.status === 'new').length,
          screening: candidates.filter(c => c.status === 'screening').length,
          phone:     candidates.filter(c => c.status === 'phone').length,
          interview: candidates.filter(c => c.status === 'interview').length,
          offer:     candidates.filter(c => c.status === 'offer').length,
          hired:     candidates.filter(c => c.status === 'hired').length
        }
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/publish-test', async (req, res) => {
  try {
    const token = process.env.TELEGRAM_TOKEN;
    const r = await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        chat_id: '@ogenemploymenta',
        text: 'בדיקה — עוגן תעסוקתי\nהשרת מחובר לערוץ!',
        parse_mode: 'Markdown'
      }
    );
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
router.get('/publish-jobs', async (req, res) => {
  res.json({ ok: true, message: 'מתחיל פרסום...' });
  try {
    const token = process.env.TELEGRAM_TOKEN;
    const channel = '@ogenemploymenta';
    const jobs = await db.getActiveJobs();
    const limit = parseInt(req.query.limit) || 10;
    const batch = jobs.slice(0, limit);
    for (const j of batch) {
      const sal = j.salary_min ? `\n💰 ₪${Number(j.salary_min).toLocaleString()}${j.salary_max ? '-₪'+Number(j.salary_max).toLocaleString() : '+'}` : '';
      const req2 = j.requirements ? `\n✅ ${j.requirements.substring(0,80)}` : '';
      const text = `🔥 *${j.title}*\n📍 ${j.location || 'לא צוין'}${sal}${req2}\n\n_עוגן תעסוקתי | ogenemployment.co.il_`;
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: channel, text, parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: 'שלח קו"ח', url: 'https://t.me/ogenemployment_bot' }]] }
      });
      await new Promise(r => setTimeout(r, 1100));
    }
  } catch(e) { console.error('Publish error:', e.message); }
});
module.exports = router;
