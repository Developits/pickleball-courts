import { authenticateRequest } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const authResult = await authenticateRequest(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const queue = await env.DB.prepare(`
      SELECT 
        q.id,
        q.user_id,
        q.team_id,
        q.joined_at,
        q.game_preference,
        q.is_ready,
        u.name as user_name,
        u.total_matches_today,
        u.student_id
      FROM queue q
      JOIN users u ON q.user_id = u.id
      WHERE q.is_ready = TRUE
      ORDER BY q.joined_at ASC
    `).all();
    
    const teams = await env.DB.prepare(`
      SELECT 
        t.id,
        t.player1_id,
        t.player2_id,
        t.created_at,
        u1.name as player1_name,
        u2.name as player2_name
      FROM teams t
      JOIN users u1 ON t.player1_id = u1.id
      JOIN users u2 ON t.player2_id = u2.id
    `).all();
    
    return createSuccessResponse({
      queue: queue.results,
      teams: teams.results,
    });
  } catch (error) {
    console.error("Error fetching queue:", error);
    return createErrorResponse("Failed to fetch queue", 500);
  }
}
