// Keep REST and SSE match snapshots consistent. LEFT JOIN preserves historical
// results even if a related account/court is no longer present.
export const MATCH_SELECT = `
  SELECT m.id, m.court_id, m.team1_player1_id, m.team1_player2_id,
    m.team2_player1_id, m.team2_player2_id, m.game_type, m.started_at,
    m.ended_at, m.winner_team, m.score,
    COALESCE(c.name, 'Former court') AS court_name,
    COALESCE(u1.name, 'Former player') AS team1_player1_name,
    COALESCE(u2.name, 'Former player') AS team1_player2_name,
    COALESCE(u3.name, 'Former player') AS team2_player1_name,
    COALESCE(u4.name, 'Former player') AS team2_player2_name
  FROM matches m
  LEFT JOIN courts c ON m.court_id = c.id
  LEFT JOIN users u1 ON m.team1_player1_id = u1.id
  LEFT JOIN users u2 ON m.team1_player2_id = u2.id
  LEFT JOIN users u3 ON m.team2_player1_id = u3.id
  LEFT JOIN users u4 ON m.team2_player2_id = u4.id
`;

export const LIVE_MATCHES_QUERY = `${MATCH_SELECT}
  WHERE m.ended_at IS NULL AND m.deleted_at IS NULL
  ORDER BY m.started_at DESC, m.id DESC`;

// Scoreboards come from completed, non-deleted results, not mutable cached
// user counters that can drift after historical resets or interrupted writes.
export const LEADERBOARD_QUERY = `
  WITH participants AS (
    SELECT team1_player1_id AS user_id, 1 AS team, winner_team FROM matches WHERE ended_at IS NOT NULL AND deleted_at IS NULL
    UNION ALL
    SELECT team1_player2_id, 1, winner_team FROM matches WHERE ended_at IS NOT NULL AND deleted_at IS NULL
    UNION ALL
    SELECT team2_player1_id, 2, winner_team FROM matches WHERE ended_at IS NOT NULL AND deleted_at IS NULL
    UNION ALL
    SELECT team2_player2_id, 2, winner_team FROM matches WHERE ended_at IS NOT NULL AND deleted_at IS NULL
  )
  SELECT u.id, u.name, COUNT(*) AS total_matches,
    SUM(CASE WHEN p.winner_team = p.team THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN p.winner_team IN (1, 2) AND p.winner_team != p.team THEN 1 ELSE 0 END) AS losses,
    CAST(SUM(CASE WHEN p.winner_team = p.team THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) AS win_rate
  FROM users u JOIN participants p ON p.user_id = u.id
  WHERE u.is_approved = TRUE AND u.deleted_at IS NULL
  GROUP BY u.id
  ORDER BY win_rate DESC, wins DESC, u.name COLLATE NOCASE ASC, u.id ASC
`;
