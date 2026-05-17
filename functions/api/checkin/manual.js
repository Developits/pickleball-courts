import { supervisorOrAdmin } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const authResult = await supervisorOrAdmin(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const supervisorId = authResult.user.userId;
    
    const body = await request.json();
    const { target_user_id } = body;
    
    if (!target_user_id) {
      return createErrorResponse("Target user ID is required", 400);
    }
    
    const targetUser = await env.DB.prepare(`
      SELECT id, name, student_id, banned_until FROM users WHERE id = ?
    `).bind(target_user_id).first();
    
    if (!targetUser) {
      return createErrorResponse("User not found", 404);
    }
    
    if (targetUser.banned_until && new Date(targetUser.banned_until) > new Date()) {
      return createErrorResponse("This user is currently banned", 403);
    }
    
    const activeCheckIn = await env.DB.prepare(`
      SELECT id FROM check_ins 
      WHERE user_id = ? AND checked_out_at IS NULL
    `).bind(target_user_id).first();
    
    if (activeCheckIn) {
      return createErrorResponse("User is already checked in", 400);
    }
    
    await env.DB.prepare(`
      INSERT INTO check_ins (user_id, is_manual, checked_in_by_supervisor_id)
      VALUES (?, TRUE, ?)
    `).bind(target_user_id, supervisorId).run();
    
    return createSuccessResponse({
      success: true,
      message: `${targetUser.name} checked in manually`,
    }, 201);
  } catch (error) {
    console.error("Error during manual check-in:", error);
    return createErrorResponse("Failed to check in user", 500);
  }
}
