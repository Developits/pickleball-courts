import { adminOnly } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const authResult = await adminOnly(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const body = await request.json();
    const { user_id, action, duration } = body;
    
    if (!user_id || !action) {
      return createErrorResponse("user_id and action are required", 400);
    }
    
    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(user_id).first();
    
    if (!user) {
      return createErrorResponse("User not found", 404);
    }
    
    if (action === "warn") {
      const newWarnings = user.warnings + 1;
      
      let banUntil = null;
      if (newWarnings >= 3) {
        banUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (newWarnings >= 2) {
        banUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else {
        banUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      }
      
      await env.DB.prepare(`
        UPDATE users SET warnings = ?, banned_until = ? WHERE id = ?
      `).bind(newWarnings, banUntil, user_id).run();
      
      return createSuccessResponse({
        success: true,
        message: `${user.name} has been warned (${newWarnings}/3 warnings)`,
        banned_until: banUntil,
      });
    } else if (action === "ban") {
      let banUntil;
      
      if (duration === "hour") {
        banUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      } else if (duration === "day") {
        banUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else if (duration === "week") {
        banUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (duration === "permanent") {
        banUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        return createErrorResponse(
          "Invalid duration. Use 'hour', 'day', 'week', or 'permanent'",
          400
        );
      }
      
      await env.DB.prepare(`
        UPDATE users SET banned_until = ?, warnings = warnings + 1 WHERE id = ?
      `).bind(banUntil, user_id).run();
      
      return createSuccessResponse({
        success: true,
        message: `${user.name} has been banned`,
        banned_until: banUntil,
      });
    } else if (action === "unban") {
      await env.DB.prepare(`
        UPDATE users SET banned_until = NULL, warnings = 0 WHERE id = ?
      `).bind(user_id).run();
      
      return createSuccessResponse({
        success: true,
        message: `${user.name} has been unbanned`,
      });
    } else {
      return createErrorResponse(
        "Invalid action. Use 'warn', 'ban', or 'unban'",
        400
      );
    }
  } catch (error) {
    console.error("Error managing user:", error);
    return createErrorResponse("Failed to manage user", 500);
  }
}
