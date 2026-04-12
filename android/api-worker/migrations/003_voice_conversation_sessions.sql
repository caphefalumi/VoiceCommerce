CREATE TABLE IF NOT EXISTS voice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_intent TEXT,
  last_user_text TEXT,
  last_response_text TEXT
);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id ON voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_updated_at ON voice_sessions(updated_at);

CREATE TABLE IF NOT EXISTS voice_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT,
  role TEXT NOT NULL,
  text TEXT NOT NULL,
  intent TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES voice_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_voice_messages_session_id ON voice_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_created_at ON voice_messages(created_at);

CREATE TABLE IF NOT EXISTS voice_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  user_id TEXT,
  user_text TEXT,
  response_text TEXT,
  intent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_voice_logs_created_at ON voice_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_voice_logs_session_id ON voice_logs(session_id);
