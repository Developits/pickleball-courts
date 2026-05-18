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
    
    const user = await env.DB.prepare("SELECT id, student_id, name, role, gender, department, degree, year, created_at FROM users WHERE id = ?")
      .bind(userId)
      .first();
    
    if (!user) {
      return createErrorResponse("User not found", 404);
    }
    
    const totalMatchesResult = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM matches 
      WHERE team1_player1_id = ? OR team1_player2_id = ? OR team2_player1_id = ? OR team2_player2_id = ?
    `).bind(userId, userId, userId, userId).first();
    
    const winsResult = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM matches 
      WHERE (winner_team = 1 AND (team1_player1_id = ? OR team1_player2_id = ?))
         OR (winner_team = 2 AND (team2_player1_id = ? OR team2_player2_id = ?))
    `).bind(userId, userId, userId, userId).first();
    
    const completedResult = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM matches 
      WHERE winner_team IS NOT NULL AND (team1_player1_id = ? OR team1_player2_id = ? OR team2_player1_id = ? OR team2_player2_id = ?)
    `).bind(userId, userId, userId, userId).first();
    
    const totalMatches = totalMatchesResult.count || 0;
    const wins = winsResult.count || 0;
    const completedMatches = completedResult.count || 0;
    const losses = completedMatches - wins;
    const winRate = completedMatches > 0 ? Math.round((wins / completedMatches) * 100) : 0;
    
    return createSuccessResponse({
      user: {
        id: user.id,
        studentId: user.student_id,
        name: user.name,
        role: user.role,
        gender: user.gender,
        department: user.department,
        degree: user.degree,
        year: user.year,
        createdAt: user.created_at
      },
      stats: {
        totalMatches: totalMatches,
        wins: wins,
        losses: losses,
        winRate: winRate,
        completedMatches: completedMatches
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
    
    const user = await env.DB.prepare("SELECT id, student_id, name, role, gender, department, degree, year, created_at FROM users WHERE id = ?")
      .bind(userId)
      .first();
    
    const totalMatchesResult = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM matches 
      WHERE team1_player1_id = ? OR team1_player2_id = ? OR team2_player1_id = ? OR team2_player2_id = ?
    `).bind(userId, userId, userId, userId).first();
    
    const winsResult = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM matches 
      WHERE (winner_team = 1 AND (team1_player1_id = ? OR team1_player2_id = ?))
         OR (winner_team = 2 AND (team2_player1_id = ? OR team2_player2_id = ?))
    `).bind(userId, userId, userId, userId).first();
    
    const completedResult = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM matches 
      WHERE winner_team IS NOT NULL AND (team1_player1_id = ? OR team1_player2_id = ? OR team2_player1_id = ? OR team2_player2_id = ?)
    `).bind(userId, userId, userId, userId).first();
    
    const totalMatches = totalMatchesResult.count || 0;
    const wins = winsResult.count || 0;
    const completedMatches = completedResult.count || 0;
    const losses = completedMatches - wins;
    const winRate = completedMatches > 0 ? Math.round((wins / completedMatches) * 100) : 0;
    
    return createSuccessResponse({
      user: {
        id: user.id,
        studentId: user.student_id,
        name: user.name,
        role: user.role,
        gender: user.gender,
        department: user.department,
        degree: user.degree,
        year: user.year,
        createdAt: user.created_at
      },
      stats: {
        totalMatches: totalMatches,
        wins: wins,
        losses: losses,
        winRate: winRate,
        completedMatches: completedMatches
      }
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return createErrorResponse("Failed to update profile", 500);
  }
}
