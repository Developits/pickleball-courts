import bcrypt from "bcryptjs";
import { generateToken, createErrorResponse } from "../utils/jwt";
import { validateStudentId, validatePassword } from "../utils/validation";
import { loginRateLimiter, getRateLimitHeaders } from "../utils/rateLimit";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    console.log("Login endpoint called");

    const { studentId, password } = await request.json();

    console.log("Login attempt for:", studentId);

    const rateLimitResult = await loginRateLimiter(request, env);
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (rateLimitResult.limited) {
      console.log("Rate limit hit for:", studentId);
      return new Response(
        JSON.stringify({
          error: "Too many login attempts. Please try again later.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...Object.fromEntries(rateLimitHeaders),
          },
        },
      );
    }

    try {
      validateStudentId(studentId);
      validatePassword(password);
    } catch (validationError) {
      console.log("Validation error:", validationError);
      return createErrorResponse(validationError.message, 400);
    }

    console.log("Querying database for user:", studentId);
    const user = await env.DB.prepare(
      "SELECT * FROM users WHERE student_id = ?",
    )
      .bind(studentId)
      .first();

    if (!user) {
      console.log("User not found:", studentId);
      return createErrorResponse("Invalid student ID or password", 401);
    }

    console.log("User found, verifying password");
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log("Password mismatch for:", studentId);
      return createErrorResponse("Invalid student ID or password", 401);
    }

    if (!user.is_approved) {
      console.log("User not approved:", studentId);
      return createErrorResponse("Your account is pending admin approval", 403);
    }

    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      console.log("User banned:", studentId);
      return createErrorResponse(
        `You are banned until ${new Date(user.banned_until).toLocaleDateString()}`,
        403,
      );
    }

    console.log("Generating JWT token");
    const jwtSecret =
      env.JWT_SECRET || "development-secret-for-local-only-please-change";
    const token = await generateToken(
      {
        userId: user.id,
        studentId: user.student_id,
        role: user.role,
        name: user.name,
      },
      jwtSecret,
      86400,
    );

    console.log("Login successful for:", studentId);
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
          ...Object.fromEntries(rateLimitHeaders),
        },
      },
    );
  } catch (error) {
    console.error("Login error:", error);
    return createErrorResponse("An error occurred during login", 500);
  }
}
