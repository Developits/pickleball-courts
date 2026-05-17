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
    const { match_id, team1_score, team2_score } = body;
    
    if (!match_id || team1_score === undefined || team2_score === undefined) {
      return createErrorResponse("match_id, team1_score, and team2_score are required", 400);
    }
    
    // Validate scores are numbers
    const score1 = parseInt(team1_score);
    const score2 = parseInt(team2_score);
    
    if (isNaN(score1) || isNaN(score2)) {
      return createErrorResponse("Scores must be valid numbers", 400);
    }
    
    if (score1 < 0 || score2 < 0) {
      return createErrorResponse("Scores must be non-negative", 400);
    }
    
    const match = await env.DB.prepare(`
      SELECT * FROM matches WHERE id = ? AND ended_at IS NULL
    `).bind(match_id).first();
    
    if (!match) {
      return createErrorResponse("Active match not found", 404);
    }
    
    // Determine winner based on scores
    let winner_team = null;
    let winner_name = "";
    
    if (score1 > score2) {
      winner_team = 1;
      // Get winner names
      const winnerUsers = await env.DB.prepare(`
        SELECT name FROM users WHERE id IN (?, ?)
      `).bind(match.team1_player1_id, match.team1_player2_id).all();
      winner_name = winnerUsers.results.map(u => u.name).join(" & ");
    } else if (score2 > score1) {
      winner_team = 2;
      // Get winner names
      const winnerUsers = await env.DB.prepare(`
        SELECT name FROM users WHERE id IN (?, ?)
      `).bind(match.team2_player1_id, match.team2_player2_id).all();
      winner_name = winnerUsers.results.map(u => u.name).join(" & ");
    } else {
      // It's a tie - no winner
      winner_team = null;
      winner_name = "Tie";
    }
    
    const settings = await env.DB.prepare(`
      SELECT value FROM settings WHERE key = 'sit_out_matches'
    `).first();
    
    const sitOutMatches = parseInt(settings?.value || "1", 10);
    
    // Determine loser team
    const loserTeamPlayerIds = winner_team === 1 
      ? [match.team2_player1_id, match.team2_player2_id]
      : winner_team === 2 
      ? [match.team1_player1_id, match.team1_player2_id]
      : [];
    
    const winnerTeamPlayerIds = winner_team === 1
      ? [match.team1_player1_id, match.team1_player2_id]
      : winner_team === 2
      ? [match.team2_player1_id, match.team2_player2_id]
      : [];
    
    // Format score as "team1score-team2score"
    const formattedScore = `${score1}-${score2}`;
    
    // Update match with scores and winner
    await env.DB.prepare(`
      UPDATE matches SET ended_at = CURRENT_TIMESTAMP, winner_team = ?, score = ?
      WHERE id = ?
    `).bind(winner_team, formattedScore, match_id).run();
    
    // Reset court status to available
    await env.DB.prepare(`
      UPDATE courts SET status = 'available', current_match_id = NULL WHERE id = ?
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
    
    // Update wins for winner team (only if there's a winner)
    for (const userId of winnerTeamPlayerIds) {
      await env.DB.prepare(`
        UPDATE users SET wins = wins + 1 WHERE id = ?
      `).bind(userId).run();
    }
    
    // Update losses and sit-out period for loser team (only if there's a loser)
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
      winner_name: winner_name,
      score: formattedScore,
      sit_out_for: loserTeamPlayerIds,
    });
  } catch (error) {
    console.error("Error ending match:", error);
    return createErrorResponse("Failed to end match: " + error.message, 500);
  }
}
