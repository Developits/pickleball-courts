import bcrypt from "bcryptjs";
import { generateToken, createSuccessResponse, createErrorResponse } from "../utils/jwt";
import { validateStudentId, validatePassword } from "../utils/validation";
import { loginRateLimiter, getRateLimitHeaders } from "../utils/rateLimit";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { studentId, password } = await request.json();
    
    const rateLimitResult = await loginRateLimiter(request, env);
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
    
    if (rateLimitResult.limited) {
      return new Response(
        JSON.stringify({ error: "Too many login attempts. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...Object.fromEntries(rateLimitHeaders)
          },
        }
      );
    }
    
    try {
      validateStudentId(studentId);
      validatePassword(password);
    } catch (validationError) {
      return createErrorResponse(validationError.message, 400);
    }

    const user = await env.DB.prepare("SELECT * FROM users WHERE student_id = ?")
      .bind(studentId)
      .first();

    if (!user) {
      return createErrorResponse("Invalid student ID or password", 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return createErrorResponse("Invalid student ID or password", 401);
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

    const jwtSecret = env.JWT_SECRET || "default-secret-change-in-production";
    const token = await generateToken(
      {
        userId: user.id,
        studentId: user.student_id,
        role: user.role,
        name: user.name,
      },
      jwtSecret,
      86400
    );

    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: {
          id: user.id,
          studentId: user.student_id,
          name: user.name,
          role: user.role,
          gender: user.gender,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`,
          ...Object.fromEntries(rateLimitHeaders)
        },
      }
    );
  } catch (error) {
    return createErrorResponse("An error occurred during login", 500);
  }
}
