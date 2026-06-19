import bcrypt from "bcryptjs";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";
import { 
  validateStudentId, 
  validatePassword, 
  validateName,
  validateDepartment,
  validateDegree,
  validateYear,
  validateGender,
  sanitizeUserInput
} from "../utils/validation";
import { authRateLimiter, getRateLimitHeaders } from "../utils/rateLimit";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const rateLimitResult = await authRateLimiter(request, env);
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
    
    if (rateLimitResult.limited) {
      return new Response(
        JSON.stringify({ error: "Too many registration attempts. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...Object.fromEntries(rateLimitHeaders)
          },
        }
      );
    }

    const { studentId, password, name, department, degree, year, gender } =
      await request.json();
    
    const validatedData = {
      studentId: sanitizeUserInput(studentId),
      password: password,
      name: sanitizeUserInput(name),
      department: sanitizeUserInput(department),
      degree: degree,
      year: year,
      gender: gender,
    };
    
    try {
      validatedData.studentId = validateStudentId(studentId);
      validatedData.password = validatePassword(password);
      validatedData.name = validateName(name);
      validatedData.department = validateDepartment(department);
      validatedData.degree = validateDegree(degree);
      validatedData.year = validateYear(year);
      validatedData.gender = validateGender(gender);
    } catch (validationError) {
      return createErrorResponse(validationError.message, 400);
    }

    const existingUser = await env.DB.prepare(
      "SELECT id FROM users WHERE student_id = ?",
    )
      .bind(validatedData.studentId)
      .first();

    if (existingUser) {
      return createErrorResponse("Student ID already registered", 400);
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    await env.DB.prepare(
      `
    INSERT INTO users (
      student_id, password, name, department, degree, year, gender, role, is_approved
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'player', FALSE)
  `,
    )
      .bind(
        validatedData.studentId, 
        hashedPassword, 
        validatedData.name, 
        validatedData.department, 
        validatedData.degree, 
        validatedData.year, 
        validatedData.gender
      )
      .run();

    return createSuccessResponse(
      {
        success: true,
        message:
          "Registration submitted! Your account will be approved by an admin.",
      },
      201
    );
  } catch (error) {
    console.error("Registration error:", error);
    return createErrorResponse("An error occurred during registration", 500);
  }
}
