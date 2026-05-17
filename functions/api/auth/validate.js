import { verifyToken, parseAuthHeader, createSuccessResponse, createErrorResponse } from "../utils/jwt";
import { authenticateRequest } from "../utils/auth";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const authResult = await authenticateRequest(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(authResult.user.userId)
      .first();
    
    if (!user) {
      return createErrorResponse("User not found", 404);
    }
    
    if (!user.is_approved) {
      return createErrorResponse("Your account is pending admin approval", 403);
    }
    
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      return createErrorResponse(
        `You are banned until ${new Date(user.banned_until).toLocaleDateString()}`,
        403
      );
    }
    
    return createSuccessResponse({
      user: {
        id: user.id,
        studentId: user.student_id,
        name: user.name,
        role: user.role,
        gender: user.gender,
      },
    });
  } catch (error) {
    return createErrorResponse("An error occurred during validation", 500);
  }
}
