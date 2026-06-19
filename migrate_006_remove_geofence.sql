-- Migration 006: Remove geofence check-in data

DELETE FROM settings
WHERE key IN ('court_latitude', 'court_longitude', 'geofence_radius_meters');

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS check_ins_without_geofence;

CREATE TABLE check_ins_without_geofence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  checked_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_out_at DATETIME,
  is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_by_supervisor_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (checked_in_by_supervisor_id) REFERENCES users(id)
);

INSERT INTO check_ins_without_geofence (
  id,
  user_id,
  checked_in_at,
  checked_out_at,
  is_manual,
  checked_in_by_supervisor_id
)
SELECT
  id,
  user_id,
  checked_in_at,
  checked_out_at,
  is_manual,
  checked_in_by_supervisor_id
FROM check_ins;

DROP TABLE check_ins;

ALTER TABLE check_ins_without_geofence RENAME TO check_ins;

CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_checked_in_at ON check_ins(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_checkins_checked_out_at ON check_ins(checked_out_at);

PRAGMA foreign_keys = ON;
