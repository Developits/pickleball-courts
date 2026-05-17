import { authenticateRequest } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const authResult = await authenticateRequest(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const body = await request.json();
    const { notification_id, mark_all = false } = body;
    const userId = authResult.user.userId;
    
    if (mark_all) {
      await env.DB.prepare(`
        UPDATE notifications
        SET is_read = TRUE
        WHERE user_id = ?
      `).bind(userId).run();
    } else if (notification_id) {
      await env.DB.prepare(`
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = ? AND user_id = ?
      `).bind(notification_id, userId).run();
    }
    
    return createSuccessResponse({
      success: true,
    });
  } catch (error) {
    console.error("Error marking notification read:", error);
    return createErrorResponse("Failed to update notification", 500);
  }
}
