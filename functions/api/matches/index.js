import { supervisorOrAdmin } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";
import { applyRateLimit } from "../utils/rateLimit";

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const rateLimitResult = await applyRateLimit(request, env, { key: 'matches', max: 20, windowSeconds: 60 });
    if (rateLimitResult.error) {
      return rateLimitResult.error;
    }
    
    const authResult = await supervisorOrAdmin(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const matches = await env.DB.prepare(`
      SELECT 
        m.id,
        m.court_id,
        m.team1_player1_id,
        m.team1_player2_id,
        m.team2_player1_id,
        m.team2_player2_id,
        m.game_type,
        m.started_at,
        m.ended_at,
        m.winner_team,
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
      WHERE m.ended_at IS NULL
      ORDER BY m.started_at DESC
    `).all();
    
    console.log("Found matches:", matches.results);
    
    const courts = await env.DB.prepare(`
      SELECT * FROM courts ORDER BY id
    `).all();
    
    return createSuccessResponse({
      matches: matches.results,
      courts: courts.results,
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return createErrorResponse("Failed to fetch matches", 500);
  }
}
