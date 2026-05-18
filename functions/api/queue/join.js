import { authenticateRequest } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";
import { sendNotificationToMultiple, NOTIFICATION_TYPES } from "../utils/notifications";

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
      return createErrorResponse("You must check in before joining the queue", 400);
    }
    
    const alreadyInQueue = await env.DB.prepare(`
      SELECT id FROM queue WHERE user_id = ? AND is_ready = TRUE
    `).bind(userId).first();
    
    if (alreadyInQueue) {
      return createErrorResponse("You are already in the queue", 400);
    }
    
    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId).first();
    
    if (user.sit_out_until && new Date(user.sit_out_until) > new Date()) {
      return createErrorResponse(
        `You must wait until ${new Date(user.sit_out_until).toLocaleTimeString()} before joining the queue`,
        403
      );
    }
    
    let gamePreference = "any";
    try {
      const body = await request.json();
      if (body.game_preference) {
        gamePreference = body.game_preference;
      }
    } catch {
      // Use default "any"
    }
    
    await env.DB.prepare(`
      INSERT INTO queue (user_id, game_preference, is_ready)
      VALUES (?, ?, TRUE)
    `).bind(userId, gamePreference).run();
    
    const supervisors = await env.DB.prepare(`
      SELECT id FROM users WHERE role IN ('supervisor', 'admin')
    `).all();
    const supervisorIds = supervisors.results.map(s => s.id);
    await sendNotificationToMultiple(
      env,
      supervisorIds,
      NOTIFICATION_TYPES.QUEUE,
      "New Player in Queue",
      `${user.name} has joined the waiting queue!`
    );
    
    return createSuccessResponse({
      success: true,
      message: "Successfully joined the queue",
    }, 201);
  } catch (error) {
    console.error("Error joining queue:", error);
    return createErrorResponse("Failed to join queue", 500);
  }
}
