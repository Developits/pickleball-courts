import { supervisorOrAdmin } from "../utils/auth.js";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt.js";
import { getCurrentCourtSession } from "../utils/courtSession.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const authResult = await supervisorOrAdmin(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }

    const courtSession = await getCurrentCourtSession(env);

    if (!courtSession.isOpen) {
      return createErrorResponse(
        "Court is closed. Open the court before starting a match.",
        409,
      );
    }
    
    const body = await request.json();
    const { 
      court_id, 
      team1_player1_id, 
      team1_player2_id, 
      team2_player1_id, 
      team2_player2_id,
      game_type 
    } = body;
    
    if (!court_id || !team1_player1_id || !team1_player2_id || 
        !team2_player1_id || !team2_player2_id || !game_type) {
      return createErrorResponse("Missing required fields", 400);
    }
    
    const court = await env.DB.prepare(`
      SELECT id, status FROM courts WHERE id = ?
    `).bind(court_id).first();
    
    if (!court) {
      return createErrorResponse("Court not found", 404);
    }
    
    if (court.status !== "available") {
      return createErrorResponse("Court is not available", 409);
    }
    
    const users = await env.DB.prepare(`
      SELECT id FROM users
      WHERE id IN (?, ?, ?, ?)
    `).bind(team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id).all();
    
    if (users.results.length !== 4) {
      return createErrorResponse("One or more players not found", 404);
    }
    
    const result = await env.DB.prepare(`
      INSERT INTO matches (
        court_id, team1_player1_id, team1_player2_id, 
        team2_player1_id, team2_player2_id, game_type
      )
      SELECT ?, ?, ?, ?, ?, ?
      WHERE EXISTS (
        SELECT 1 FROM court_sessions WHERE date = ? AND is_open = TRUE
      )
      AND EXISTS (
        SELECT 1 FROM courts WHERE id = ? AND status = 'available'
      )
    `).bind(
      court_id, 
      team1_player1_id, team1_player2_id,
      team2_player1_id, team2_player2_id,
      game_type,
      courtSession.date,
      court_id,
    ).run();

    if (result.meta.changes !== 1) {
      const latestSession = await getCurrentCourtSession(env);
      return createErrorResponse(
        latestSession.isOpen
          ? "Court is no longer available"
          : "Court closed before the match could be started",
        409,
      );
    }

    const matchId = result.meta.last_row_id;
    
    const courtUpdate = await env.DB.prepare(`
      UPDATE courts SET status = 'occupied', current_match_id = ?
      WHERE id = ?
        AND status = 'available'
        AND EXISTS (
          SELECT 1 FROM court_sessions WHERE date = ? AND is_open = TRUE
        )
    `).bind(matchId, court_id, courtSession.date).run();

    if (courtUpdate.meta.changes !== 1) {
      await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(matchId).run();
      const latestSession = await getCurrentCourtSession(env);
      return createErrorResponse(
        latestSession.isOpen
          ? "Court is no longer available"
          : "Court closed before the match could be started",
        409,
      );
    }
    
    // Remove players from queue and check-ins (they're now playing)
    for (const userId of [team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id]) {
      await env.DB.prepare(`
        DELETE FROM queue WHERE user_id = ?
      `).bind(userId).run();
      
      await env.DB.prepare(`
        UPDATE check_ins SET checked_out_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND checked_out_at IS NULL
      `).bind(userId).run();
    }
    
    // NOTE: Player stats (total_matches, wins, losses) are updated in matches/end.js
    // when the match is actually finished and winner is determined
    
    return createSuccessResponse({
      success: true,
      match_id: matchId,
      message: "Match started successfully",
    }, 201);
  } catch (error) {
    console.error("Error starting match:", error);
    return createErrorResponse("Failed to start match", 500);
  }
}
