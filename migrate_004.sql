-- Migration 004: Add Soft Delete Fields
-- Run with: wrangler d1 execute pickleball-courts --file=./migrate_004.sql --local (or --remote)

-- Add deleted_at column to users table
ALTER TABLE users ADD COLUMN deleted_at DATETIME;

-- Add deleted_at column to matches table
ALTER TABLE matches ADD COLUMN deleted_at DATETIME;

SELECT 'Migration 004 complete: Soft delete fields added to users and matches tables!';
