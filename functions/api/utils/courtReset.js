export async function performCourtReset(
  env,
  { date, closedByUserId = null },
) {
  if (!date) {
    throw new Error("Court reset date is required");
  }

  return env.DB.batch([
    env.DB.prepare(`
      UPDATE court_sessions
      SET is_open = FALSE,
          closed_at = CURRENT_TIMESTAMP,
          closed_by_supervisor_id = ?
      WHERE date = ? AND is_open = TRUE
    `).bind(closedByUserId, date),
    env.DB.prepare(`
      DELETE FROM matches WHERE ended_at IS NULL
    `),
    env.DB.prepare(`
      UPDATE users SET total_matches_today = 0
    `),
    env.DB.prepare(`
      DELETE FROM queue
    `),
    env.DB.prepare(`
      UPDATE courts
      SET status = 'available',
          reserved_for = NULL,
          current_match_id = NULL
    `),
    env.DB.prepare(`
      UPDATE check_ins
      SET checked_out_at = CURRENT_TIMESTAMP
      WHERE checked_out_at IS NULL
    `),
    env.DB.prepare(`
      DELETE FROM qr_tokens
    `),
  ]);
}
