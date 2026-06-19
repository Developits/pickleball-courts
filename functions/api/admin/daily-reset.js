import { adminOnly } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const authResult = await adminOnly(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    // --- FULL DAILY RESET ---

    // 1. DELETE ALL ONGOING MATCHES COMPLETELY (NO RECORD LEFT)
    await env.DB.prepare(`
      DELETE FROM matches WHERE ended_at IS NULL
    `).run();

    // 2. Reset total_matches_today for all users
    await env.DB.prepare(`
      UPDATE users SET total_matches_today = 0
    `).run();

    // 3. Clear all queue entries
    await env.DB.prepare(`
      DELETE FROM queue
    `).run();

    // 4. Set all courts to available
    await env.DB.prepare(`
      UPDATE courts SET status = 'available', current_match_id = NULL
    `).run();

    // 5. Clear all check-ins
    await env.DB.prepare(`
      UPDATE check_ins SET checked_out_at = CURRENT_TIMESTAMP WHERE checked_out_at IS NULL
    `).run();

    // 6. Delete all QR tokens
    await env.DB.prepare(`
      DELETE FROM qr_tokens
    `).run();

    // Also mark today's court session as closed if open
    const now = new Date();
    const shanghaiNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const todayDate = shanghaiNow.toISOString().split('T')[0]; // YYYY-MM-DD

    await env.DB.prepare(`
      UPDATE court_sessions 
      SET is_open = false,
          closed_at = CURRENT_TIMESTAMP,
          closed_by_supervisor_id = ?
      WHERE date = ? AND is_open = true
    `).bind(authResult.user.userId, todayDate).run();

    return createSuccessResponse({
      success: true,
      message: "Daily reset completed successfully! All stats reset, queue cleared, courts available, check-ins cleared, ongoing matches deleted."
    });
  } catch (error) {
    console.error("Error performing daily reset:", error);
    return createErrorResponse("Failed to perform daily reset", 500);
  }
}
