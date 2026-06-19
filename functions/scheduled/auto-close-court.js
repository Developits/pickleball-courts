import { getCurrentCourtSession } from "../api/utils/courtSession.js";
import { performCourtReset } from "../api/utils/courtReset.js";

export async function scheduled(event, env) {
  console.log("Starting auto-close court task...");

  try {
    const courtSession = await getCurrentCourtSession(env);

    if (!courtSession.isOpen) {
      console.log("Court is not open, no need to auto-close");
      return;
    }

    await performCourtReset(env, {
      date: courtSession.date,
      closedByUserId: null,
    });

    console.log("Auto-close court task completed successfully!");
  } catch (error) {
    console.error("Error in auto-close court task:", error);
    throw error;
  }
}
