import { anyAuthenticated } from "../utils/auth.js";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt.js";
import { LIVE_MATCHES_QUERY } from "../utils/gameHistory.js";

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const authResult = await anyAuthenticated(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    const matches = await env.DB.prepare(LIVE_MATCHES_QUERY).all();

    return createSuccessResponse({
      matches: matches.results,
    });
  } catch (error) {
    console.error("Error fetching live matches:", error);
    return createErrorResponse("Failed to fetch live matches", 500);
  }
}
