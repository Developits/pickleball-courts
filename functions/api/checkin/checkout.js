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
    
    const activeCheckIn = await env.DB.prepare(`
      SELECT id FROM check_ins 
      WHERE user_id = ? AND checked_out_at IS NULL
    `).bind(userId).first();
    
    if (!activeCheckIn) {
      return createErrorResponse("You are not checked in", 400);
    }
    
    const inQueue = await env.DB.prepare(`
      SELECT id FROM queue WHERE user_id = ? AND is_ready = TRUE
    `).bind(userId).first();
    
    if (inQueue) {
      return createErrorResponse(
        "You must leave the queue before checking out",
        400
      );
    }
    
    await env.DB.prepare(`
      UPDATE check_ins SET checked_out_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND checked_out_at IS NULL
    `).bind(userId).run();
    
    return createSuccessResponse({
      success: true,
      message: "Checked out successfully",
    });
  } catch (error) {
    console.error("Error during check-out:", error);
    return createErrorResponse("Failed to check out", 500);
  }
}
