import { supervisorOrAdmin } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const authResult = await supervisorOrAdmin(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const body = await request.json();
    const { court_id } = body;
    
    if (!court_id) {
      return createErrorResponse("court_id is required", 400);
    }
    
    // Verify court exists
    const court = await env.DB.prepare(`
      SELECT * FROM courts WHERE id = ?
    `).bind(court_id).first();
    
    if (!court) {
      return createErrorResponse("Court not found", 404);
    }
    
    // Unreserve the court
    await env.DB.prepare(`
      UPDATE courts 
      SET reserved_for = NULL, status = 'available'
      WHERE id = ?
    `).bind(court_id).run();
    
    console.log(`Court ${court_id} unreserved by supervisor ${authResult.user.userId}`);
    
    return createSuccessResponse({
      success: true,
      message: "Court reservation removed",
      court_id: court_id
    });
  } catch (error) {
    console.error("Error unreserving court:", error);
    return createErrorResponse("Failed to unreserve court: " + error.message, 500);
  }
}
