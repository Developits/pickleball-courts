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
    const { match_id } = body;
    
    if (!match_id) {
      return createErrorResponse("match_id is required", 400);
    }
    
    // Check if match exists and is active
    const match = await env.DB.prepare(`
      SELECT * FROM matches WHERE id = ? AND ended_at IS NULL
    `).bind(match_id).first();
    
    if (!match) {
      return createErrorResponse("Active match not found", 404);
    }
    
    // Update match as canceled (ended without a winner)
    await env.DB.prepare(`
      UPDATE matches SET ended_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(match_id).run();
    
    // Reset court status to available
    await env.DB.prepare(`
      UPDATE courts SET status = 'available', current_match_id = NULL WHERE id = ?
    `).bind(match.court_id).run();
    
    return createSuccessResponse({
      success: true,
      message: "Match canceled successfully"
    });
  } catch (error) {
    console.error("Error canceling match:", error);
    return createErrorResponse("Failed to cancel match: " + error.message, 500);
  }
}