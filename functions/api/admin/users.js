import { adminOnly } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const authResult = await adminOnly(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const users = await env.DB.prepare(`
      SELECT 
        id,
        student_id,
        name,
        department,
        degree,
        year,
        gender,
        role,
        is_approved,
        total_matches,
        total_matches_today,
        wins,
        losses,
        warnings,
        banned_until,
        created_at
      FROM users
      ORDER BY created_at DESC
    `).all();
    
    return createSuccessResponse({
      users: users.results,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return createErrorResponse("Failed to fetch users", 500);
  }
}
