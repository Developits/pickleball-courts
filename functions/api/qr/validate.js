import { authenticateRequest } from "../utils/auth.js";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const authResult = await authenticateRequest(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    const body = await request.json();
    const { token } = body;
    const userId = authResult.user.userId;
    
    if (!token) {
      return createErrorResponse("Token is required", 400);
    }

    const now = new Date();
    const shanghaiNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const todayDate = shanghaiNow.toISOString().split("T")[0];

    const session = await env.DB.prepare(`
      SELECT id FROM court_sessions WHERE date = ? AND is_open = true
    `).bind(todayDate).first();

    if (!session) {
      return createErrorResponse("Court is not open today", 400);
    }
    
    const qrToken = await env.DB.prepare(`
      SELECT 
        qt.id,
        qt.supervisor_id,
        qt.expires_at,
        qt.created_at,
        u.name as supervisor_name
      FROM qr_tokens qt
      JOIN users u ON qt.supervisor_id = u.id
      WHERE qt.token = ?
    `).bind(token).first();
    
    if (!qrToken) {
      return createErrorResponse("Invalid QR token", 400);
    }
    
    if (new Date(qrToken.expires_at) < new Date()) {
      return createErrorResponse("QR token has expired", 400);
    }
    
    const activeCheckIn = await env.DB.prepare(`
      SELECT id FROM check_ins 
      WHERE user_id = ? AND checked_out_at IS NULL
    `).bind(userId).first();
    
    if (activeCheckIn) {
      return createErrorResponse("You are already checked in", 400);
    }
    
    const user = await env.DB.prepare(`
      SELECT id, name, student_id, banned_until, is_approved FROM users WHERE id = ?
    `).bind(userId).first();
    
    if (!user) {
      return createErrorResponse("User not found", 404);
    }
    
    if (!user.is_approved) {
      return createErrorResponse("Your account is not approved", 403);
    }
    
    if (user.banned_until && new Date(user.banned_until) > now) {
      return createErrorResponse(
        `You are banned until ${new Date(user.banned_until).toLocaleDateString()}`,
        403
      );
    }
    
    await env.DB.prepare(`
      INSERT INTO check_ins (user_id, is_manual, checked_in_by_supervisor_id)
      VALUES (?, FALSE, ?)
    `).bind(userId, qrToken.supervisor_id).run();
    
    await env.DB.prepare(`
      DELETE FROM qr_tokens WHERE id = ?
    `).bind(qrToken.id).run();
    
    return createSuccessResponse({
      success: true,
      message: "Check-in successful",
      user: {
        id: user.id,
        name: user.name,
        student_id: user.student_id,
      },
      validated_by: qrToken.supervisor_name,
    });
  } catch (error) {
    console.error("Error validating QR token:", error);
    return createErrorResponse("Failed to validate QR token", 500);
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    
    if (!token) {
      return createErrorResponse("Token is required", 400);
    }
    
    const qrToken = await env.DB.prepare(`
      SELECT 
        qt.id,
        qt.supervisor_id,
        qt.expires_at,
        u.name as supervisor_name
      FROM qr_tokens qt
      JOIN users u ON qt.supervisor_id = u.id
      WHERE qt.token = ?
    `).bind(token).first();
    
    if (!qrToken) {
      return createErrorResponse("Invalid QR token", 400);
    }
    
    if (new Date(qrToken.expires_at) < new Date()) {
      return createErrorResponse("QR token has expired", 400);
    }
    
    return createSuccessResponse({
      valid: true,
      token: token,
      expires_at: qrToken.expires_at,
      supervisor_name: qrToken.supervisor_name,
    });
  } catch (error) {
    console.error("Error checking QR token:", error);
    return createErrorResponse("Failed to check QR token", 500);
  }
}
