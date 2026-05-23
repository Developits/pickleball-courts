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

    // Get today's date in Shanghai time (UTC+8)
    const now = new Date();
    const shanghaiNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const todayDate = shanghaiNow.toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if there's already an open session today
    const existingSession = await env.DB.prepare(`
      SELECT * FROM court_sessions WHERE date = ?
    `).bind(todayDate).first();

    if (existingSession) {
      if (existingSession.is_open) {
        return createSuccessResponse({
          success: true,
          message: "Court is already open for today!",
          is_open: true
        });
      } else {
        // Session exists but was closed - re-open it
        await env.DB.prepare(`
          UPDATE court_sessions 
          SET is_open = true, 
              opened_by_supervisor_id = ?,
              opened_at = CURRENT_TIMESTAMP,
              closed_at = NULL,
              closed_by_supervisor_id = NULL
          WHERE date = ?
        `).bind(supervisorId, todayDate).run();
      }
    } else {
      // Create new session
      await env.DB.prepare(`
        INSERT INTO court_sessions (date, is_open, opened_by_supervisor_id, opened_at)
        VALUES (?, true, ?, CURRENT_TIMESTAMP)
      `).bind(todayDate, supervisorId).run();
    }

    return createSuccessResponse({
      success: true,
      message: "Court is now open!",
      is_open: true,
      date: todayDate
    });
  } catch (error) {
    console.error("Error opening court:", error);
    return createErrorResponse("Failed to open court", 500);
  }
}
