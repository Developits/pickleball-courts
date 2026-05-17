import { authenticateRequest } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const authResult = await authenticateRequest(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const userId = authResult.user.userId;
    
    const queueEntry = await env.DB.prepare(`
      SELECT id, user_id, team_id FROM queue 
      WHERE user_id = ? AND is_ready = TRUE
    `).bind(userId).first();
    
    if (!queueEntry) {
      return createErrorResponse("You are not in the queue", 404);
    }
    
    if (queueEntry.team_id) {
      await env.DB.prepare(`
        UPDATE teams SET player2_id = player1_id, player1_id = player2_id, created_at = CURRENT_TIMESTAMP
        WHERE id = ? AND (player1_id = ? OR player2_id = ?)
      `).bind(queueEntry.team_id, userId, userId).run();
      
      const updatedTeam = await env.DB.prepare(`
        SELECT player1_id, player2_id FROM teams WHERE id = ?
      `).bind(queueEntry.team_id).first();
      
      if (updatedTeam.player1_id === updatedTeam.player2_id) {
        await env.DB.prepare("DELETE FROM teams WHERE id = ?")
          .bind(queueEntry.team_id).run();
        
        await env.DB.prepare(`
          DELETE FROM queue WHERE user_id = ? AND team_id = ?
        `).bind(updatedTeam.player1_id, queueEntry.team_id).run();
      }
    }
    
    await env.DB.prepare(`
      DELETE FROM queue WHERE user_id = ?
    `).bind(userId).run();
    
    return createSuccessResponse({
      success: true,
      message: "Successfully left the queue",
    });
  } catch (error) {
    console.error("Error leaving queue:", error);
    return createErrorResponse("Failed to leave queue", 500);
  }
}
