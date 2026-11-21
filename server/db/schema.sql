-- SchemeSathi SQLite Schema
-- Designed for easy migration to MySQL or PostgreSQL

CREATE TABLE IF NOT EXISTS schemes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_te TEXT,
  government_level TEXT NOT NULL, -- 'Central' or 'State'
  department TEXT NOT NULL,
  department_te TEXT,
  description TEXT NOT NULL,
  description_te TEXT,
  purpose TEXT,
  benefit TEXT,
  benefit_te TEXT,
  category TEXT NOT NULL, -- 'Agriculture', 'Health', 'Education', 'Pension', 'Business', 'Housing & energy', 'Women & child', 'Financial assistance'
  state TEXT NOT NULL DEFAULT 'All India',
  target_group TEXT,
  helpline TEXT,
  deadline TEXT,
  official_url TEXT NOT NULL,
  official_source_url TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  last_verified TEXT,
  criteria_complete INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  color TEXT DEFAULT 'blue',
  symbol TEXT DEFAULT 'योजना',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS criteria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scheme_id TEXT NOT NULL,
  field TEXT NOT NULL,
  operator TEXT NOT NULL, -- 'equals', 'oneOf', 'min', 'max'
  expected_value TEXT NOT NULL, -- JSON string or scalar
  mandatory INTEGER NOT NULL DEFAULT 1,
  source_url TEXT NOT NULL,
  verified_at TEXT,
  explanation TEXT NOT NULL,
  explanation_te TEXT,
  FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS required_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scheme_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_te TEXT,
  is_mandatory INTEGER NOT NULL DEFAULT 1,
  issuing_authority TEXT,
  source_url TEXT NOT NULL,
  verified_at TEXT,
  FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS application_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scheme_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  title TEXT,
  instruction TEXT NOT NULL,
  instruction_te TEXT,
  source_url TEXT,
  verified_at TEXT,
  FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schemes_category ON schemes(category);
CREATE INDEX IF NOT EXISTS idx_schemes_state ON schemes(state);
CREATE INDEX IF NOT EXISTS idx_schemes_is_active ON schemes(is_active);
CREATE INDEX IF NOT EXISTS idx_criteria_scheme_id ON criteria(scheme_id);
CREATE INDEX IF NOT EXISTS idx_documents_scheme_id ON required_documents(scheme_id);
CREATE INDEX IF NOT EXISTS idx_steps_scheme_id ON application_steps(scheme_id);
