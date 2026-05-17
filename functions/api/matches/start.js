import { supervisorOrAdmin } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const authResult = await supervisorOrAdmin(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
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
    
    if (court.status === "occupied") {
      return createErrorResponse("Court is already occupied", 400);
    }
    
    const users = await env.DB.prepare(`
      SELECT id, total_matches_today, sit_out_until FROM users 
      WHERE id IN (?, ?, ?, ?)
    `).bind(team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id).all();
    
    if (users.results.length !== 4) {
      return createErrorResponse("One or more players not found", 404);
    }
    
    for (const user of users.results) {
      if (user.sit_out_until && new Date(user.sit_out_until) > new Date()) {
        const userInfo = users.results.find(u => u.id === user.id);
        return createErrorResponse(
          `${userInfo.name} is still in sit-out period`,
          403
        );
      }
    }
    
    const result = await env.DB.prepare(`
      INSERT INTO matches (
        court_id, team1_player1_id, team1_player2_id, 
        team2_player1_id, team2_player2_id, game_type
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      court_id, 
      team1_player1_id, team1_player2_id,
      team2_player1_id, team2_player2_id,
      game_type
    ).run();
    
    await env.DB.prepare(`
      UPDATE courts SET status = 'occupied', current_match_id = ?
      WHERE id = ?
    `).bind(result.meta.last_row_id, court_id).run();
    
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
      match_id: result.meta.last_row_id,
      message: "Match started successfully",
    }, 201);
  } catch (error) {
    console.error("Error starting match:", error);
    return createErrorResponse("Failed to start match", 500);
  }
}
