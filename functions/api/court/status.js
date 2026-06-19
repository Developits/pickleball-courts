import { authenticateRequest } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";
import {
  getCurrentCourtSession,
  getQueueLockState,
} from "../utils/courtSession";

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const authResult = await authenticateRequest(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    const courtSession = await getCurrentCourtSession(env);
    const queueLock = await getQueueLockState(env, courtSession.time);

    return createSuccessResponse({
      is_open: courtSession.isOpen,
      date: courtSession.date,
      current_shanghai_time: courtSession.time,
      is_queue_locked: queueLock.isQueueLocked
    });
  } catch (error) {
    console.error("Error getting court status:", error);
    return createErrorResponse("Failed to get court status", 500);
  }
}
