import { authenticateRequest } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const authResult = await authenticateRequest(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const checkedInPlayers = await env.DB.prepare(`
      SELECT 
        ci.id,
        ci.checked_in_at,
        ci.is_manual,
        u.id as user_id,
        u.name,
        u.student_id,
        u.total_matches_today,
        su.name as checked_in_by_supervisor
      FROM check_ins ci
      JOIN users u ON ci.user_id = u.id
      LEFT JOIN users su ON ci.checked_in_by_supervisor_id = su.id
      WHERE ci.checked_out_at IS NULL
      ORDER BY ci.checked_in_at ASC
    `).all();
    
    return createSuccessResponse({
      checked_in_players: checkedInPlayers.results,
    });
  } catch (error) {
    console.error("Error fetching all checked-in players:", error);
    return createErrorResponse("Failed to fetch checked-in players", 500);
  }
}
