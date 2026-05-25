import { anyAuthenticated } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const authResult = await anyAuthenticated(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    // Get all past matches (ended_at is not null)
    const matches = await env.DB.prepare(
      `
      SELECT 
        m.*,
        c.name as court_name,
        u1.name as team1_player1_name,
        u2.name as team1_player2_name,
        u3.name as team2_player1_name,
        u4.name as team2_player2_name
      FROM matches m
      JOIN courts c ON m.court_id = c.id
      JOIN users u1 ON m.team1_player1_id = u1.id
      JOIN users u2 ON m.team1_player2_id = u2.id
      JOIN users u3 ON m.team2_player1_id = u3.id
      JOIN users u4 ON m.team2_player2_id = u4.id
      WHERE m.ended_at IS NOT NULL AND m.deleted_at IS NULL
      ORDER BY m.ended_at DESC
      LIMIT 100
      `,
    ).all();

    return createSuccessResponse({
      matches: matches.results,
    });
  } catch (error) {
    console.error("Error fetching match history:", error);
    return createErrorResponse("Failed to fetch match history: " + error.message, 500);
  }
}
