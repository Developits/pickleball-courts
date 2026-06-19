import { authenticateRequest } from "../utils/auth.js";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt.js";
import { sendNotificationToMultiple, NOTIFICATION_TYPES } from "../utils/notifications.js";
import {
  getCurrentCourtSession,
  getQueueLockState,
} from "../utils/courtSession.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const authResult = await authenticateRequest(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const userId = authResult.user.userId;

    const courtSession = await getCurrentCourtSession(env);

    if (!courtSession.isOpen) {
      return createErrorResponse("Court is not open today", 400);
    }

    const queueLock = await getQueueLockState(env, courtSession.time);

    if (queueLock.isQueueLocked) {
      return createErrorResponse(
        "Queue is locked because court closing time is near",
        403
      );
    }
    
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
    
    let gamePreference = "any";
    try {
      const body = await request.json();
      if (body.game_preference) {
        gamePreference = body.game_preference;
      }
    } catch {
      // Use default "any"
    }

    const allowedPreferences = ["any", "mens_double", "womens_double", "mixed_double"];
    if (!allowedPreferences.includes(gamePreference)) {
      return createErrorResponse("Invalid game preference", 400);
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
