-- Migration 003: Add Score Field to Matches Table
-- Run with: wrangler d1 execute pickleball-courts --file=./migrate_003.sql --local (or --remote)

ALTER TABLE matches ADD COLUMN score TEXT;

SELECT 'Migration 003 complete: Score field added to matches table!';
