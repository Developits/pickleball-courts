-- Migration 007: Disable hard time-based sit-out

DELETE FROM settings WHERE key = 'sit_out_matches';

UPDATE users SET sit_out_until = NULL;
