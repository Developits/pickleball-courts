-- Migration 005: Add Court Sessions

-- Create court_sessions table
CREATE TABLE IF NOT EXISTS court_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT FALSE,
  opened_by_supervisor_id INTEGER,
  opened_at DATETIME,
  closed_at DATETIME,
  closed_by_supervisor_id INTEGER,
  FOREIGN KEY (opened_by_supervisor_id) REFERENCES users(id),
  FOREIGN KEY (closed_by_supervisor_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_court_sessions_date ON court_sessions(date);
CREATE INDEX IF NOT EXISTS idx_court_sessions_is_open ON court_sessions(is_open);

-- Insert court session settings
INSERT OR IGNORE INTO settings (key, value) VALUES
('daily_reset_shanghai_time', '21:00'),
('queue_lock_shanghai_time', '20:45');
