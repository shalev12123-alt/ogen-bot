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

module.exports = router;
