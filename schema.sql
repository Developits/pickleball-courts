-- Users Table (Players, Supervisors, Admins)
CREATE TABLE users (
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
  warnings INTEGER NOT NULL DEFAULT 0,
  banned_until DATETIME,
  push_subscription TEXT, -- For PWA push notifications
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME -- Soft delete field
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_approved ON users(is_approved);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_banned_until ON users(banned_until);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- Daily Check-ins Table (QR and supervisor/manual check-ins)
CREATE TABLE check_ins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  checked_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_out_at DATETIME,
  is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_by_supervisor_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (checked_in_by_supervisor_id) REFERENCES users(id)
);

-- Court Sessions Table (Tracks daily court open/close)
CREATE TABLE court_sessions (
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

CREATE UNIQUE INDEX idx_court_sessions_date ON court_sessions(date);
CREATE INDEX idx_court_sessions_is_open ON court_sessions(is_open);

CREATE INDEX idx_checkins_user_id ON check_ins(user_id);
CREATE INDEX idx_checkins_checked_in_at ON check_ins(checked_in_at);
CREATE INDEX idx_checkins_checked_out_at ON check_ins(checked_out_at);

-- Dynamic QR Tokens Table (30-second expiry)
CREATE TABLE qr_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  supervisor_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (supervisor_id) REFERENCES users(id)
);

CREATE INDEX idx_qr_tokens_supervisor_id ON qr_tokens(supervisor_id);
CREATE INDEX idx_qr_tokens_expires_at ON qr_tokens(expires_at);

-- Courts Table (3 courts total)
CREATE TABLE courts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  reserved_for TEXT,
  current_match_id INTEGER
);

CREATE INDEX idx_courts_status ON courts(status);

-- Waiting Queue Table
CREATE TABLE queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  team_id INTEGER,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  game_preference TEXT NOT NULL DEFAULT 'any',
  is_ready BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_queue_user_id ON queue(user_id);
CREATE INDEX idx_queue_game_preference ON queue(game_preference);
CREATE INDEX idx_queue_is_ready ON queue(is_ready);
CREATE INDEX idx_queue_joined_at ON queue(joined_at);

-- 2-Person Teams Table
CREATE TABLE teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player1_id INTEGER NOT NULL,
  player2_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player1_id) REFERENCES users(id),
  FOREIGN KEY (player2_id) REFERENCES users(id)
);

CREATE INDEX idx_teams_player1_id ON teams(player1_id);
CREATE INDEX idx_teams_player2_id ON teams(player2_id);

-- Team Invites Table (2-minute expiry)
CREATE TABLE team_invites (
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

CREATE INDEX idx_team_invites_sender_id ON team_invites(sender_id);
CREATE INDEX idx_team_invites_recipient_id ON team_invites(recipient_id);
CREATE INDEX idx_team_invites_status ON team_invites(status);
CREATE INDEX idx_team_invites_expires_at ON team_invites(expires_at);

-- Matches Table (All current and historical matches)
CREATE TABLE matches (
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
  score TEXT,
  deleted_at DATETIME, -- Soft delete field
  FOREIGN KEY (court_id) REFERENCES courts(id)
);

CREATE INDEX idx_matches_court_id ON matches(court_id);
CREATE INDEX idx_matches_started_at ON matches(started_at);
CREATE INDEX idx_matches_ended_at ON matches(ended_at);
CREATE INDEX idx_matches_game_type ON matches(game_type);

-- Notifications Table
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'info', 'warning', 'success', 'match', 'team_invite', 'account_approved'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Durable API Rate Limits
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX idx_rate_limits_expires_at ON rate_limits(expires_at);

-- System Settings Table (All rules configurable here)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert default 3 courts
INSERT INTO courts (name) VALUES ('Court 1'), ('Court 2'), ('Court 3');

-- Insert all default system rules (matches our algorithm)
INSERT INTO settings (key, value) VALUES
('late_arrival_time', '20:30'),
('late_arrival_priority_threshold', '2'),
('default_mens_double_courts', '2'),
('default_mixed_double_courts', '1'),
('lights_off_time', '21:00'),
('team_invite_expiry_minutes', '2'),
('auto_checkout_minutes', '5'),
('password_min_length', '8'),
('max_login_attempts', '3'),
('login_lockout_minutes', '5'),
('daily_reset_shanghai_time', '21:00'),
('queue_lock_shanghai_time', '20:45');

-- Tournament Phase 1 foundation (migrate_009_tournament_foundation.sql).
CREATE TABLE user_capabilities (
  user_id INTEGER NOT NULL REFERENCES users(id),
  capability TEXT NOT NULL CHECK (capability = 'tournament_organizer'),
  granted_by_user_id INTEGER NOT NULL REFERENCES users(id),
  granted_at INTEGER NOT NULL,
  revoked_at INTEGER,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  PRIMARY KEY (user_id, capability)
);
CREATE TABLE tournaments (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  description TEXT NOT NULL DEFAULT '',
  venue_name TEXT,
  venue_address TEXT,
  timezone TEXT NOT NULL,
  starts_at INTEGER,
  ends_at INTEGER,
  registration_deadline_at INTEGER,
  rules_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status = 'draft'),
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  CHECK ((starts_at IS NULL AND ends_at IS NULL) OR
    (starts_at IS NOT NULL AND ends_at IS NOT NULL AND ends_at >= starts_at))
);
CREATE INDEX idx_tournaments_list ON tournaments(status, updated_at, id);
CREATE INDEX idx_tournaments_creator ON tournaments(created_by_user_id, id);
CREATE TABLE tournament_categories (
  id TEXT PRIMARY KEY NOT NULL,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  code TEXT NOT NULL CHECK (length(code) BETWEEN 1 AND 64),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  team_size INTEGER NOT NULL CHECK (team_size > 0),
  rules_text TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (tournament_id, code)
);
CREATE INDEX idx_tournament_categories_list ON tournament_categories(tournament_id, is_active, sort_order, id);
CREATE TABLE tournament_staff (
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  staff_role TEXT NOT NULL CHECK (staff_role IN ('organizer','supervisor')),
  assigned_by_user_id INTEGER NOT NULL REFERENCES users(id),
  assigned_at INTEGER NOT NULL,
  revoked_at INTEGER,
  PRIMARY KEY (tournament_id, user_id, staff_role)
);
CREATE INDEX idx_tournament_staff_user ON tournament_staff(user_id, revoked_at, tournament_id);
CREATE TABLE tournament_audit_log (
  id TEXT PRIMARY KEY NOT NULL,
  request_id TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  tournament_id TEXT REFERENCES tournaments(id),
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  resource_revision INTEGER NOT NULL CHECK (resource_revision >= 1),
  before_json TEXT CHECK (before_json IS NULL OR (json_valid(before_json) AND json_type(before_json) = 'object')),
  after_json TEXT NOT NULL CHECK (json_valid(after_json) AND json_type(after_json) = 'object'),
  created_at INTEGER NOT NULL,
  UNIQUE (actor_user_id, request_id)
);
CREATE INDEX idx_tournament_audit_list ON tournament_audit_log(tournament_id, created_at, id);
