import { authenticateRequest } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";
import { applyRateLimit } from "../utils/rateLimit";

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(request, env, { key: 'profile', max: 30, windowSeconds: 60 });
    if (rateLimitResult.error) {
      return rateLimitResult.error;
    }
    
    const authResult = await authenticateRequest(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    // Get user info
    const user = await env.DB.prepare("SELECT id, student_id, name, role, gender, email, created_at FROM users WHERE id = ?")
      .bind(authResult.user.userId)
      .first();
    
    if (!user) {
      return createErrorResponse("User not found", 404);
    }
    
    // Get player statistics
    const statsResult = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_matches,
        SUM(CASE WHEN winner_team = 1 AND (team1_player1_id = ? OR team1_player2_id = ?) THEN 1 
                 WHEN winner_team = 2 AND (team2_player1_id = ? OR team2_player2_id = ?) THEN 1 
                 ELSE 0 END) as wins,
        SUM(CASE WHEN winner_team IS NOT NULL AND (team1_player1_id = ? OR team1_player2_id = ? OR team2_player1_id = ? OR team2_player2_id = ?) THEN 1 ELSE 0 END) as completed_matches
      FROM matches
      WHERE team1_player1_id = ? OR team1_player2_id = ? OR team2_player1_id = ? OR team2_player2_id = ?
    `).bind(
      user.id, user.id, user.id, user.id,
      user.id, user.id, user.id, user.id,
      user.id, user.id, user.id, user.id
    ).first();
    
    const winRate = statsResult.completed_matches > 0 
      ? Math.round((statsResult.wins / statsResult.completed_matches) * 100) 
      : 0;
    
    return createSuccessResponse({
      user: {
        id: user.id,
        studentId: user.student_id,
        name: user.name,
        role: user.role,
        gender: user.gender,
        email: user.email,
        createdAt: user.created_at
      },
      stats: {
        totalMatches: statsResult.total_matches,
        wins: statsResult.wins,
        losses: statsResult.completed_matches - statsResult.wins,
        winRate: winRate,
        completedMatches: statsResult.completed_matches
      }
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return createErrorResponse("Failed to fetch profile", 500);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  
  try {
    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(request, env, { key: 'profile-update', max: 10, windowSeconds: 60 });
    if (rateLimitResult.error) {
      return rateLimitResult.error;
    }
    
    const authResult = await authenticateRequest(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const { name, gender } = await request.json();
    
    if (!name || !gender) {
      return createErrorResponse("Name and gender are required", 400);
    }
    
    if (!['male', 'female', 'other'].includes(gender)) {
      return createErrorResponse("Invalid gender value", 400);
    }
    
    // Update user info
    await env.DB.prepare("UPDATE users SET name = ?, gender = ? WHERE id = ?")
      .bind(name, gender, authResult.user.userId)
      .run();
    
    // Get updated user
    const user = await env.DB.prepare("SELECT id, student_id, name, role, gender, email, created_at FROM users WHERE id = ?")
      .bind(authResult.user.userId)
      .first();
    
    // Get updated stats
    const statsResult = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_matches,
        SUM(CASE WHEN winner_team = 1 AND (team1_player1_id = ? OR team1_player2_id = ?) THEN 1 
                 WHEN winner_team = 2 AND (team2_player1_id = ? OR team2_player2_id = ?) THEN 1 
                 ELSE 0 END) as wins,
        SUM(CASE WHEN winner_team IS NOT NULL AND (team1_player1_id = ? OR team1_player2_id = ? OR team2_player1_id = ? OR team2_player2_id = ?) THEN 1 ELSE 0 END) as completed_matches
      FROM matches
      WHERE team1_player1_id = ? OR team1_player2_id = ? OR team2_player1_id = ? OR team2_player2_id = ?
    `).bind(
      user.id, user.id, user.id, user.id,
      user.id, user.id, user.id, user.id,
      user.id, user.id, user.id, user.id
    ).first();
    
    const winRate = statsResult.completed_matches > 0 
      ? Math.round((statsResult.wins / statsResult.completed_matches) * 100) 
      : 0;
    
    return createSuccessResponse({
      user: {
        id: user.id,
        studentId: user.student_id,
        name: user.name,
        role: user.role,
        gender: user.gender,
        email: user.email,
        createdAt: user.created_at
      },
      stats: {
        totalMatches: statsResult.total_matches,
        wins: statsResult.wins,
        losses: statsResult.completed_matches - statsResult.wins,
        winRate: winRate,
        completedMatches: statsResult.completed_matches
      }
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return createErrorResponse("Failed to update profile", 500);
  }
}
