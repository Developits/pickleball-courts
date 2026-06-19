import { authenticateRequest } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const authResult = await authenticateRequest(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const userId = authResult.user.userId;
    
    const checkIn = await env.DB.prepare(`
      SELECT 
        ci.id,
        ci.checked_in_at,
        ci.is_manual,
        ci.checked_out_at,
        u.name as supervisor_name
      FROM check_ins ci
      LEFT JOIN users u ON ci.checked_in_by_supervisor_id = u.id
      WHERE ci.user_id = ? AND ci.checked_out_at IS NULL
      ORDER BY ci.checked_in_at DESC
      LIMIT 1
    `).bind(userId).first();
    
    return createSuccessResponse({
      checked_in: !!checkIn,
      check_in: checkIn || null,
    });
  } catch (error) {
    console.error("Error fetching check-in status:", error);
    return createErrorResponse("Failed to fetch check-in status", 500);
  }
}
