const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ─── CANDIDATES ───────────────────────────────────────

async function getOrCreateCandidate(phone, platform) {
  const { data } = await supabase
    .from('candidates')
    .select('*')
    .eq('phone', phone)
    .single();
  if (data) return data;

  const { data: newCand } = await supabase
    .from('candidates')
    .insert({ phone, platform, status: 'new' })
    .select()
    .single();
  return newCand;
}

async function updateCandidate(phone, fields) {
  const { data } = await supabase
    .from('candidates')
    .update(fields)
    .eq('phone', phone)
    .select()
    .single();
  return data;
}

async function getAllCandidates() {
  const { data } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

async function updateCandidateStatus(id, status) {
  await supabase.from('candidates').update({ status }).eq('id', id);
}

// ─── CONVERSATIONS ────────────────────────────────────

async function saveMessage(candidateId, role, text) {
  await supabase.from('conversations').insert({
    candidate_id: candidateId,
    message_role: role,
    message_text: text
  });
}

async function getHistory(candidateId, limit = 20) {
  const { data } = await supabase
    .from('conversations')
    .select('message_role, message_text')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: true })
    .limit(limit);
  return (data || []).map(r => ({
    role: r.message_role,
    content: r.message_text
  }));
}

// ─── JOBS ─────────────────────────────────────────────

async function getActiveJobs() {
  const { data } = await supabase
    .from('jobs')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return data || [];
}

async function createJob(job) {
  const { data } = await supabase.from('jobs').insert(job).select().single();
  return data;
}

async function updateJob(id, fields) {
  const { data } = await supabase.from('jobs').update(fields).eq('id', id).select().single();
  return data;
}

async function deleteJob(id) {
  await supabase.from('jobs').delete().eq('id', id);
}

// ─── LEADS (לקוחות מגייסים) ───────────────────────────

async function createLead(lead) {
  const { data } = await supabase.from('leads').insert(lead).select().single();
  return data;
}

async function getAllLeads() {
  const { data } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

module.exports = {
  getOrCreateCandidate, updateCandidate, getAllCandidates, updateCandidateStatus,
  saveMessage, getHistory,
  getActiveJobs, createJob, updateJob, deleteJob,
  createLead, getAllLeads
};
