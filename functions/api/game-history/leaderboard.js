import { anyAuthenticated } from "../utils/auth.js";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt.js";
import { LEADERBOARD_QUERY } from "../utils/gameHistory.js";

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const authResult = await anyAuthenticated(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    const users = await env.DB.prepare(LEADERBOARD_QUERY).all();

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
    return createErrorResponse("Failed to fetch leaderboard", 500);
  }
}
