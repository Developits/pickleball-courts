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
    const { match_id, winner_team } = body;
    
    if (!match_id || !winner_team) {
      return createErrorResponse("Missing required fields", 400);
    }
    
    if (winner_team !== 1 && winner_team !== 2) {
      return createErrorResponse("Winner team must be 1 or 2", 400);
    }
    
    const match = await env.DB.prepare(`
      SELECT * FROM matches WHERE id = ? AND ended_at IS NULL
    `).bind(match_id).first();
    
    if (!match) {
      return createErrorResponse("Active match not found", 404);
    }
    
    const settings = await env.DB.prepare(`
      SELECT value FROM settings WHERE key = 'sit_out_matches'
    `).first();
    
    const sitOutMatches = parseInt(settings?.value || "1", 10);
    
    const loserTeamPlayerIds = winner_team === 1 
      ? [match.team2_player1_id, match.team2_player2_id]
      : [match.team1_player1_id, match.team1_player2_id];
    
    const winnerTeamPlayerIds = winner_team === 1
      ? [match.team1_player1_id, match.team1_player2_id]
      : [match.team2_player1_id, match.team2_player2_id];
    
    await env.DB.prepare(`
      UPDATE matches SET ended_at = CURRENT_TIMESTAMP, winner_team = ?
      WHERE id = ?
    `).bind(winner_team, match_id).run();
    
    await env.DB.prepare(`
      UPDATE courts SET status = 'available', current_match_id = NULL
      WHERE id = ?
    `).bind(match.court_id).run();
    
    const allMatchPlayerIds = [
      match.team1_player1_id,
      match.team1_player2_id,
      match.team2_player1_id,
      match.team2_player2_id
    ];
    
    // Update total_matches and total_matches_today for ALL players
    for (const userId of allMatchPlayerIds) {
      await env.DB.prepare(`
        UPDATE users SET 
          total_matches = total_matches + 1,
          total_matches_today = total_matches_today + 1
        WHERE id = ?
      `).bind(userId).run();
    }
    
    // Update wins for winner team
    for (const userId of winnerTeamPlayerIds) {
      await env.DB.prepare(`
        UPDATE users SET wins = wins + 1 WHERE id = ?
      `).bind(userId).run();
    }
    
    // Update losses and sit-out period for loser team
    for (const userId of loserTeamPlayerIds) {
      await env.DB.prepare(`
        UPDATE users SET losses = losses + 1 WHERE id = ?
      `).bind(userId).run();
      
      await env.DB.prepare(`
        UPDATE users SET sit_out_until = datetime(CURRENT_TIMESTAMP, '+' || ? || ' minutes')
        WHERE id = ?
      `).bind(sitOutMatches, userId).run();
    }
    
    return createSuccessResponse({
      success: true,
      message: "Match ended successfully",
      winner_team: winner_team,
      sit_out_for: loserTeamPlayerIds,
    });
  } catch (error) {
    console.error("Error ending match:", error);
    return createErrorResponse("Failed to end match", 500);
  }
}
