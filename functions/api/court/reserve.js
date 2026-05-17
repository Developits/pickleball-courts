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
    const { court_id, reserved_for } = body;
    
    if (!court_id) {
      return createErrorResponse("court_id is required", 400);
    }
    
    if (!reserved_for || reserved_for.trim() === "") {
      return createErrorResponse("reserved_for is required (e.g., 'Chinese Students')", 400);
    }
    
    // Verify court exists
    const court = await env.DB.prepare(`
      SELECT * FROM courts WHERE id = ?
    `).bind(court_id).first();
    
    if (!court) {
      return createErrorResponse("Court not found", 404);
    }
    
    // Check if court is currently occupied
    if (court.status === 'occupied') {
      return createErrorResponse("Cannot reserve an occupied court", 400);
    }
    
    // Reserve the court
    await env.DB.prepare(`
      UPDATE courts 
      SET reserved_for = ?, status = 'reserved'
      WHERE id = ?
    `).bind(reserved_for, court_id).run();
    
    console.log(`Court ${court_id} reserved for ${reserved_for} by supervisor ${authResult.user.userId}`);
    
    return createSuccessResponse({
      success: true,
      message: `Court reserved for ${reserved_for}`,
      court_id: court_id,
      reserved_for: reserved_for
    });
  } catch (error) {
    console.error("Error reserving court:", error);
    return createErrorResponse("Failed to reserve court: " + error.message, 500);
  }
}
