import { authenticateRequest } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const authResult = await authenticateRequest(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    // Get today's date in Shanghai time (UTC+8)
    const now = new Date();
    const shanghaiNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const todayDate = shanghaiNow.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = shanghaiNow.toTimeString().split(' ')[0]; // HH:MM:SS

    // Check if court is open today
    const session = await env.DB.prepare(`
      SELECT * FROM court_sessions WHERE date = ?
    `).bind(todayDate).first();

    // Get settings for queue lock time
    const queueLockSetting = await env.DB.prepare(`
      SELECT value FROM settings WHERE key = 'queue_lock_shanghai_time'
    `).first();

    const queueLockTime = queueLockSetting?.value || '20:45';

    // Check if queue is locked
    const isQueueLocked = currentTime >= queueLockTime;

    return createSuccessResponse({
      is_open: session?.is_open || false,
      date: todayDate,
      current_shanghai_time: currentTime,
      is_queue_locked: isQueueLocked
    });
  } catch (error) {
    console.error("Error getting court status:", error);
    return createErrorResponse("Failed to get court status", 500);
  }
}
