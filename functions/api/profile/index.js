import { authenticateRequest } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

const PROFILE_QUERY = `
  SELECT
    id,
    student_id,
    name,
    role,
    gender,
    department,
    degree,
    year,
    created_at,
    total_matches,
    total_matches_today,
    wins,
    losses
  FROM users
  WHERE id = ? AND deleted_at IS NULL
`;

async function getProfile(env, userId) {
  return env.DB.prepare(PROFILE_QUERY).bind(userId).first();
}

function buildProfileResponse(user) {
  const totalMatches = Number(user.total_matches) || 0;
  const wins = Number(user.wins) || 0;
  const losses = Number(user.losses) || 0;

  return {
    user: {
      id: user.id,
      studentId: user.student_id,
      name: user.name,
      role: user.role,
      gender: user.gender,
      department: user.department,
      degree: user.degree,
      year: user.year,
      createdAt: user.created_at,
    },
    stats: {
      totalMatches,
      totalMatchesToday: Number(user.total_matches_today) || 0,
      wins,
      losses,
      winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
      completedMatches: totalMatches,
    },
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const authResult = await authenticateRequest(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    const user = await getProfile(env, authResult.user.userId);

    if (!user) {
      return createErrorResponse("User not found", 404);
    }

    return createSuccessResponse(buildProfileResponse(user));
  } catch (error) {
    console.error("Error fetching profile:", error);
    return createErrorResponse("Failed to fetch profile", 500);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;

  try {
    const authResult = await authenticateRequest(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    const userId = authResult.user.userId;
    const { name, gender } = await request.json();

    if (!name || !gender) {
      return createErrorResponse("Name and gender are required", 400);
    }

    if (!["male", "female", "other"].includes(gender)) {
      return createErrorResponse("Invalid gender value", 400);
    }

    await env.DB.prepare(
      "UPDATE users SET name = ?, gender = ? WHERE id = ? AND deleted_at IS NULL",
    )
      .bind(name, gender, userId)
      .run();

    const user = await getProfile(env, userId);

    if (!user) {
      return createErrorResponse("User not found", 404);
    }

    return createSuccessResponse(buildProfileResponse(user));
  } catch (error) {
    console.error("Error updating profile:", error);
    return createErrorResponse("Failed to update profile", 500);
  }
}
