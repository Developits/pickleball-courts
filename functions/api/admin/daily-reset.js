import { adminOnly } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const authResult = await adminOnly(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    // Reset total_matches_today for all users
    await env.DB.prepare(`
      UPDATE users SET total_matches_today = 0
    `).run();
    
    // Clear all queue entries
    await env.DB.prepare(`
      DELETE FROM queue
    `).run();
    
    // Set all courts to available
    await env.DB.prepare(`
      UPDATE courts SET status = 'available', current_match_id = NULL
    `).run();
    
    // Clear sit-out periods
    await env.DB.prepare(`
      UPDATE users SET sit_out_until = NULL
    `).run();
    
    return createSuccessResponse({
      success: true,
      message: "Daily reset completed successfully! All stats reset, queue cleared, courts available."
    });
  } catch (error) {
    console.error("Error performing daily reset:", error);
    return createErrorResponse("Failed to perform daily reset", 500);
  }
}
