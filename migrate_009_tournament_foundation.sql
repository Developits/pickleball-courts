-- Additive Phase 1 foundation only. Apply once; no casual data is rewritten.
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
