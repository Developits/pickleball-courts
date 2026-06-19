import { adminOnly } from "../utils/auth.js";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt.js";
import { getShanghaiDateTime } from "../utils/courtSession.js";
import { performCourtReset } from "../utils/courtReset.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const authResult = await adminOnly(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    const { date } = getShanghaiDateTime();
    await performCourtReset(env, {
      date,
      closedByUserId: authResult.user.userId,
    });

    return createSuccessResponse({
      success: true,
      message:
        "Daily reset completed. Daily counters reset, unfinished matches and queue cleared, players checked out, QR tokens invalidated, and court closed.",
      date,
      is_open: false,
    });
  } catch (error) {
    console.error("Error performing daily reset:", error);
    return createErrorResponse("Failed to perform daily reset", 500);
  }
}
