import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { token, user_id } = body;
    
    if (!token || !user_id) {
      return createErrorResponse("Token and user_id are required", 400);
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
    `).bind(user_id).first();
    
    if (activeCheckIn) {
      return createErrorResponse("User is already checked in", 400);
    }
    
    const user = await env.DB.prepare(`
      SELECT id, name, student_id, banned_until, is_approved FROM users WHERE id = ?
    `).bind(user_id).first();
    
    if (!user) {
      return createErrorResponse("User not found", 404);
    }
    
    if (!user.is_approved) {
      return createErrorResponse("User account is not approved", 403);
    }
    
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      return createErrorResponse(
        `User is banned until ${new Date(user.banned_until).toLocaleDateString()}`,
        403
      );
    }
    
    await env.DB.prepare(`
      INSERT INTO check_ins (user_id, is_manual, checked_in_by_supervisor_id)
      VALUES (?, FALSE, ?)
    `).bind(user_id, qrToken.supervisor_id).run();
    
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
