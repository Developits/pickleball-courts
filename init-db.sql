-- Complete database schema and initial data for Pickleball Courts Management
-- Run with: wrangler d1 execute pickleball-courts --file=./init-db.sql --local (or --remote)

PRAGMA foreign_keys = ON;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  degree TEXT NOT NULL,
  year INTEGER NOT NULL,
  gender TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player',
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  total_matches INTEGER NOT NULL DEFAULT 0,
  total_matches_today INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  sit_out_until DATETIME,
  warnings INTEGER NOT NULL DEFAULT 0,
  banned_until DATETIME,
  push_subscription TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Check-ins Table
CREATE TABLE IF NOT EXISTS check_ins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  checked_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_out_at DATETIME,
  is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_by_supervisor_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (checked_in_by_supervisor_id) REFERENCES users(id)
);

-- QR Tokens Table
CREATE TABLE IF NOT EXISTS qr_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  supervisor_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (supervisor_id) REFERENCES users(id)
);

-- Courts Table
CREATE TABLE IF NOT EXISTS courts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  reserved_for TEXT,
  current_match_id INTEGER
);

-- Queue Table
CREATE TABLE IF NOT EXISTS queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  team_id INTEGER,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  game_preference TEXT NOT NULL DEFAULT 'any',
  is_ready BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player1_id INTEGER NOT NULL,
  player2_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player1_id) REFERENCES users(id),
  FOREIGN KEY (player2_id) REFERENCES users(id)
);

-- Team Invites Table
CREATE TABLE IF NOT EXISTS team_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  game_preference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

-- Matches Table
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  court_id INTEGER NOT NULL,
  team1_player1_id INTEGER NOT NULL,
  team1_player2_id INTEGER NOT NULL,
  team2_player1_id INTEGER NOT NULL,
  team2_player2_id INTEGER NOT NULL,
  game_type TEXT NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  winner_team INTEGER,
  FOREIGN KEY (court_id) REFERENCES courts(id)
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_banned_until ON users(banned_until);

CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_checked_in_at ON check_ins(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_checkins_checked_out_at ON check_ins(checked_out_at);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_supervisor_id ON qr_tokens(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_expires_at ON qr_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_courts_status ON courts(status);

CREATE INDEX IF NOT EXISTS idx_queue_user_id ON queue(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_game_preference ON queue(game_preference);
CREATE INDEX IF NOT EXISTS idx_queue_is_ready ON queue(is_ready);
CREATE INDEX IF NOT EXISTS idx_queue_joined_at ON queue(joined_at);

CREATE INDEX IF NOT EXISTS idx_teams_player1_id ON teams(player1_id);
CREATE INDEX IF NOT EXISTS idx_teams_player2_id ON teams(player2_id);

CREATE INDEX IF NOT EXISTS idx_team_invites_sender_id ON team_invites(sender_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_recipient_id ON team_invites(recipient_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_status ON team_invites(status);
CREATE INDEX IF NOT EXISTS idx_team_invites_expires_at ON team_invites(expires_at);

CREATE INDEX IF NOT EXISTS idx_matches_court_id ON matches(court_id);
CREATE INDEX IF NOT EXISTS idx_matches_started_at ON matches(started_at);
CREATE INDEX IF NOT EXISTS idx_matches_ended_at ON matches(ended_at);
CREATE INDEX IF NOT EXISTS idx_matches_game_type ON matches(game_type);

-- Insert default courts
INSERT OR IGNORE INTO courts (name) VALUES ('Court 1'), ('Court 2'), ('Court 3');

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
('sit_out_matches', '1'),
('late_arrival_time', '20:30'),
('late_arrival_priority_threshold', '2'),
('default_mens_double_courts', '2'),
('default_mixed_double_courts', '1'),
('lights_off_time', '21:00'),
('team_invite_expiry_minutes', '2'),
('auto_checkout_minutes', '5'),
('password_min_length', '8'),
('max_login_attempts', '3'),
('login_lockout_minutes', '5');

-- Create initial admin user (change this in production!)
-- Password: Admin123! (hashed with bcrypt rounds=10)
INSERT OR IGNORE INTO users (
  student_id, password, name, department, degree, year, gender, role, is_approved
) VALUES (
  'admin001',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'System Administrator',
  'Computer Science',
  'Master',
  2024,
  'male',
  'admin',
  TRUE
);

-- Create a test supervisor (password: Supervisor123!)
INSERT OR IGNORE INTO users (
  student_id, password, name, department, degree, year, gender, role, is_approved
) VALUES (
  'supervisor001',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'Pickleball Supervisor',
  'Sports Management',
  'Bachelor',
  2023,
  'female',
  'supervisor',
  TRUE
);

SELECT 'Database initialization complete!';
SELECT 'Admin user: admin001 / Admin123!';
SELECT 'Supervisor user: supervisor001 / Supervisor123!';