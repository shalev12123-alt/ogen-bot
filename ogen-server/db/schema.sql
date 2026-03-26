-- ═══════════════════════════════════════════════════════════
--  עוגן תעסוקתי — Supabase Schema
--  הדבק את כל הקוד הזה ב-SQL Editor של Supabase והרץ
-- ═══════════════════════════════════════════════════════════

-- טבלת מועמדים
CREATE TABLE IF NOT EXISTS candidates (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  phone         TEXT UNIQUE NOT NULL,
  platform      TEXT DEFAULT 'whatsapp',
  name          TEXT,
  role_sought   TEXT,
  experience    TEXT,
  salary_exp    TEXT,
  location      TEXT,
  availability  TEXT,
  cv_url        TEXT,
  score         INTEGER,
  status        TEXT DEFAULT 'new',
  -- pipeline: new → screening → phone → interview → offer → hired / rejected
  notes         TEXT,
  assigned_to   TEXT
);

-- טבלת שיחות
CREATE TABLE IF NOT EXISTS conversations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  candidate_id  UUID REFERENCES candidates(id) ON DELETE CASCADE,
  message_role  TEXT NOT NULL,   -- 'user' | 'assistant'
  message_text  TEXT NOT NULL
);

-- טבלת משרות
CREATE TABLE IF NOT EXISTS jobs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  title         TEXT NOT NULL,
  company       TEXT,
  location      TEXT,
  field         TEXT,
  salary_min    INTEGER,
  salary_max    INTEGER,
  requirements  TEXT,
  description   TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  urgent        BOOLEAN DEFAULT FALSE
);

-- טבלת לידים (חברות מגייסות)
CREATE TABLE IF NOT EXISTS leads (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  company_name  TEXT,
  contact_name  TEXT,
  phone         TEXT,
  email         TEXT,
  role_needed   TEXT,
  location      TEXT,
  salary_range  TEXT,
  platform      TEXT,
  status        TEXT DEFAULT 'new'
);

-- אינדקסים לביצועים
CREATE INDEX IF NOT EXISTS idx_candidates_phone    ON candidates(phone);
CREATE INDEX IF NOT EXISTS idx_candidates_status   ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_conversations_cand  ON conversations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_jobs_active         ON jobs(is_active);

-- עדכון updated_at אוטומטי
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security (אופציונלי — מומלץ)
ALTER TABLE candidates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads         ENABLE ROW LEVEL SECURITY;

-- פוליסה: רק service role יכול לגשת (הבוט משתמש בזה)
CREATE POLICY "service_only" ON candidates   FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_only" ON conversations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_only" ON jobs          FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_only" ON leads         FOR ALL USING (auth.role() = 'service_role');

-- ✅ הטבלאות מוכנות!
