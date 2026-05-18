import { authenticateRequest } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const authResult = await authenticateRequest(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const userId = authResult.user.userId;
    
    const user = await env.DB.prepare("SELECT id, student_id, name, role, gender, email, created_at FROM users WHERE id = ?")
      .bind(userId)
      .first();
    
    if (!user) {
      return createErrorResponse("User not found", 404);
    }
    
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
      userId, userId, userId, userId,
      userId, userId, userId, userId,
      userId, userId, userId, userId
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
    const authResult = await authenticateRequest(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const userId = authResult.user.userId;
    const { name, gender } = await request.json();
    
    if (!name || !gender) {
      return createErrorResponse("Name and gender are required", 400);
    }
    
    if (!['male', 'female', 'other'].includes(gender)) {
      return createErrorResponse("Invalid gender value", 400);
    }
    
    await env.DB.prepare("UPDATE users SET name = ?, gender = ? WHERE id = ?")
      .bind(name, gender, userId)
      .run();
    
    const user = await env.DB.prepare("SELECT id, student_id, name, role, gender, email, created_at FROM users WHERE id = ?")
      .bind(userId)
      .first();
    
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
      userId, userId, userId, userId,
      userId, userId, userId, userId,
      userId, userId, userId, userId
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
