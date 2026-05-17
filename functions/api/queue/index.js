import { authenticateRequest } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";
import { calculatePriorityScore, isInSitOutPeriod } from "../utils/queue";
import { applyRateLimit, clearRateLimit } from "../utils/rateLimit";

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    // Apply rate limiting (15 requests per minute per user)
    const rateLimitResult = await applyRateLimit(request, env, { key: 'queue', max: 15, windowSeconds: 60 });
    if (rateLimitResult.error) {
      return rateLimitResult.error;
    }
    
    const authResult = await authenticateRequest(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    // Get system settings
    const settingsResult = await env.DB.prepare(`
      SELECT key, value FROM settings
    `).all();
    
    const settings = {};
    settingsResult.results.forEach(row => {
      settings[row.key] = row.value;
    });
    
    const queue = await env.DB.prepare(`
      SELECT 
        q.id,
        q.user_id,
        q.team_id,
        q.joined_at,
        q.game_preference,
        q.is_ready,
        u.name as user_name,
        u.total_matches_today,
        u.student_id,
        u.sit_out_until,
        u.gender
      FROM queue q
      JOIN users u ON q.user_id = u.id
      WHERE q.is_ready = TRUE
      ORDER BY q.joined_at ASC
    `).all();
    
    const now = new Date();
    
    // Calculate priority scores and filter out players in sit-out period
    const queueWithPriority = queue.results.map(item => {
      const priorityScore = calculatePriorityScore({ ...item, settings }, now);
      const inSitOut = isInSitOutPeriod(item, now);
      return {
        ...item,
        priority_score: priorityScore,
        in_sit_out_period: inSitOut
      };
    });
    
    // Filter out players in sit-out period and sort by priority score (descending)
    const activeQueue = queueWithPriority
      .filter(item => !item.in_sit_out_period)
      .sort((a, b) => b.priority_score - a.priority_score);
    
    const teams = await env.DB.prepare(`
      SELECT 
        t.id,
        t.player1_id,
        t.player2_id,
        t.created_at,
        u1.name as player1_name,
        u2.name as player2_name
      FROM teams t
      JOIN users u1 ON t.player1_id = u1.id
      JOIN users u2 ON t.player2_id = u2.id
    `).all();
    
    return createSuccessResponse({
      queue: activeQueue,
      all_queue_items: queueWithPriority,
      teams: teams.results,
      settings: settings
    });
  } catch (error) {
    console.error("Error fetching queue:", error);
    return createErrorResponse("Failed to fetch queue", 500);
  }
}
