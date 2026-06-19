import { supervisorOrAdmin } from "../utils/auth.js";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt.js";
import { getCurrentCourtSession } from "../utils/courtSession.js";
import { performCourtReset } from "../utils/courtReset.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const authResult = await supervisorOrAdmin(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    const courtSession = await getCurrentCourtSession(env);

    if (!courtSession.isOpen) {
      return createSuccessResponse({
        success: true,
        message: "Court is already closed!",
        is_open: false,
        date: courtSession.date,
      });
    }

    await performCourtReset(env, {
      date: courtSession.date,
      closedByUserId: authResult.user.userId,
    });

    return createSuccessResponse({
      success: true,
      message: "Court closed and daily operations reset.",
      is_open: false,
      date: courtSession.date,
    });
  } catch (error) {
    console.error("Error closing court:", error);
    return createErrorResponse("Failed to close court", 500);
  }
}
