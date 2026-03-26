const express = require('express');
const router  = express.Router();
const db      = require('../db/supabase');
const axios   = require('axios');

router.get('/candidates', async (req, res) => {
  try { const candidates = await db.getAllCandidates(); res.json({ ok: true, data: candidates }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/candidates/:id/status', async (req, res) => {
  try { await db.updateCandidateStatus(req.params.id, req.body.status); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/jobs', async (req, res) => {
  try { const jobs = await db.getActiveJobs(); res.json({ ok: true, data: jobs }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/jobs', async (req, res) => {
  try { const job = await db.createJob(req.body); res.json({ ok: true, data: job })
