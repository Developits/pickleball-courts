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
    
    const notifications = await env.DB.prepare(`
      SELECT 
        id,
        user_id,
        type,
        title,
        message,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(userId).all();
    
    const unreadCount = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND is_read = FALSE
    `).bind(userId).first();
    
    return createSuccessResponse({
      notifications: notifications.results,
      unread_count: unreadCount.count,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return createErrorResponse("Failed to fetch notifications", 500);
  }
}
