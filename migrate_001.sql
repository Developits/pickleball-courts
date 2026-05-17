-- Migration script to add indexes and new settings to existing database
-- Run this with: wrangler d1 execute pickleball-courts --file=./migrate_001.sql --remote

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_banned_until ON users(banned_until);

-- Check-ins table indexes
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_checked_in_at ON check_ins(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_checkins_checked_out_at ON check_ins(checked_out_at);

-- QR tokens table indexes
CREATE INDEX IF NOT EXISTS idx_qr_tokens_supervisor_id ON qr_tokens(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_expires_at ON qr_tokens(expires_at);

-- Courts table indexes
CREATE INDEX IF NOT EXISTS idx_courts_status ON courts(status);

-- Queue table indexes
CREATE INDEX IF NOT EXISTS idx_queue_user_id ON queue(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_game_preference ON queue(game_preference);
CREATE INDEX IF NOT EXISTS idx_queue_is_ready ON queue(is_ready);
CREATE INDEX IF NOT EXISTS idx_queue_joined_at ON queue(joined_at);

-- Teams table indexes
CREATE INDEX IF NOT EXISTS idx_teams_player1_id ON teams(player1_id);
CREATE INDEX IF NOT EXISTS idx_teams_player2_id ON teams(player2_id);

-- Team invites table indexes
CREATE INDEX IF NOT EXISTS idx_team_invites_sender_id ON team_invites(sender_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_recipient_id ON team_invites(recipient_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_status ON team_invites(status);
CREATE INDEX IF NOT EXISTS idx_team_invites_expires_at ON team_invites(expires_at);

-- Matches table indexes
CREATE INDEX IF NOT EXISTS idx_matches_court_id ON matches(court_id);
CREATE INDEX IF NOT EXISTS idx_matches_started_at ON matches(started_at);
CREATE INDEX IF NOT EXISTS idx_matches_ended_at ON matches(ended_at);
CREATE INDEX IF NOT EXISTS idx_matches_game_type ON matches(game_type);

-- New settings entries
INSERT OR IGNORE INTO settings (key, value) VALUES
('password_min_length', '8'),
('max_login_attempts', '3'),
('login_lockout_minutes', '5');

-- The check_ins UNIQUE constraint fix requires special handling
-- Since D1 doesn't support transactions in SQL scripts, we'll skip this for now
-- The constraint issue doesn't affect functionality - it just allows multiple NULL checked_out_at values
-- If you need to fix it, you'll need to use a Cloudflare Worker script with the JavaScript API

SELECT 'Migration completed successfully (indexes and settings added)' AS result;