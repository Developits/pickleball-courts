import { playerOrAbove } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const authResult = await playerOrAbove(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    // Get all ongoing matches (ended_at is null)
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
      WHERE m.ended_at IS NULL AND m.deleted_at IS NULL
      ORDER BY m.started_at DESC
      `,
    ).all();

    return createSuccessResponse({
      matches: matches.results,
    });
  } catch (error) {
    console.error("Error fetching live matches:", error);
    return createErrorResponse("Failed to fetch live matches: " + error.message, 500);
  }
}
