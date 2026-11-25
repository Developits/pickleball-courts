import { anyAuthenticated } from "../utils/auth.js";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt.js";
import { MATCH_SELECT } from "../utils/gameHistory.js";

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const authResult = await anyAuthenticated(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    const params = new URL(request.url).searchParams;
    const scope = params.get("scope") ?? "all";
    const limit = Number(params.get("limit") ?? 20);
    const offset = Number(params.get("offset") ?? 0);
    if (!["all", "mine"].includes(scope)
        || !Number.isSafeInteger(limit) || limit < 1 || limit > 100
        || !Number.isSafeInteger(offset) || offset < 0 || offset > 1000000) {
      return createErrorResponse("Invalid history scope or pagination", 400);
    }
    const mine = scope === "mine";
    const matches = await env.DB.prepare(`${MATCH_SELECT}
      WHERE m.ended_at IS NOT NULL AND m.deleted_at IS NULL
      ${mine ? "AND ? IN (m.team1_player1_id, m.team1_player2_id, m.team2_player1_id, m.team2_player2_id)" : ""}
      ORDER BY m.ended_at DESC, m.id DESC LIMIT ? OFFSET ?
    `).bind(...(mine ? [authResult.user.userId] : []), limit + 1, offset).all();
    const hasMore = matches.results.length > limit;

    return createSuccessResponse({
      matches: matches.results.slice(0, limit),
      has_more: hasMore,
      next_offset: hasMore ? offset + limit : null,
    });
  } catch (error) {
    console.error("Error fetching match history:", error);
    return createErrorResponse("Failed to fetch match history", 500);
  }
}
