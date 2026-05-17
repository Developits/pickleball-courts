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
    
    const settings = await env.DB.prepare(`
      SELECT value FROM settings WHERE key = 'team_invite_expiry_minutes'
    `).first();
    
    const expiryMinutes = parseInt(settings?.value || "2", 10);
    
    const token = generateRandomToken(32);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    
    await env.DB.prepare(`
      DELETE FROM qr_tokens WHERE expires_at < datetime('now')
    `).run();
    
    await env.DB.prepare(`
      INSERT INTO qr_tokens (token, supervisor_id, expires_at)
      VALUES (?, ?, ?)
    `).bind(token, supervisorId, expiresAt).run();
    
    return createSuccessResponse({
      success: true,
      token: token,
      expires_at: expiresAt,
      expires_in_seconds: expiryMinutes * 60,
      scan_url: `/api/qr/validate?token=${token}`,
    }, 201);
  } catch (error) {
    console.error("Error generating QR token:", error);
    return createErrorResponse("Failed to generate QR token", 500);
  }
}

function generateRandomToken(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}
