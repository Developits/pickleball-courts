import { adminOnly } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";
import { sendNotification, NOTIFICATION_TYPES } from "../utils/notifications";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const authResult = await adminOnly(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const body = await request.json();
    const { user_id, action } = body;
    
    if (!user_id || !action) {
      return createErrorResponse("user_id and action are required", 400);
    }
    
    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(user_id).first();
    
    if (!user) {
      return createErrorResponse("User not found", 404);
    }
    
    if (action === "approve") {
      await env.DB.prepare(`
        UPDATE users SET is_approved = TRUE WHERE id = ?
      `).bind(user_id).run();
      
      // Send notification
      await sendNotification(
        env,
        user_id,
        NOTIFICATION_TYPES.ACCOUNT_APPROVED,
        "Account Approved!",
        `Hi ${user.name}! Your account has been approved and you can now use the system.`
      );
      
      return createSuccessResponse({
        success: true,
        message: `${user.name} has been approved`,
      });
    } else if (action === "reject") {
      await env.DB.prepare("DELETE FROM users WHERE id = ?")
        .bind(user_id).run();
      
      return createSuccessResponse({
        success: true,
        message: `${user.name} has been rejected and removed`,
      });
    } else {
      return createErrorResponse("Invalid action. Use 'approve' or 'reject'", 400);
    }
  } catch (error) {
    console.error("Approve endpoint error:", error);
    return createErrorResponse("Failed to process user: " + error.message, 500);
  }
}
