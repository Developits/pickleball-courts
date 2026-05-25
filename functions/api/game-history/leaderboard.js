import { anyAuthenticated } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const authResult = await anyAuthenticated(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    // Get leaderboard - all approved users, sorted by win rate (desc), then wins (desc), then name
    const users = await env.DB.prepare(
      `
      SELECT 
        id,
        name,
        total_matches,
        wins,
        losses,
        -- Calculate win rate (handle division by zero)
        CASE 
          WHEN total_matches > 0 THEN CAST(wins AS FLOAT) / total_matches 
          ELSE 0 
        END AS win_rate
      FROM users
      WHERE is_approved = TRUE AND deleted_at IS NULL
      ORDER BY win_rate DESC, wins DESC, name ASC
      `,
    ).all();

    // Calculate points (2 per win)
    const leaderboard = users.results.map((user, index) => ({
      ...user,
      rank: index + 1,
      points: user.wins * 2,
      win_rate_percent: user.total_matches > 0 
        ? Math.round((user.win_rate * 100) * 10) / 10 
        : 0,
    }));

    return createSuccessResponse({
      leaderboard,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return createErrorResponse("Failed to fetch leaderboard: " + error.message, 500);
  }
}
