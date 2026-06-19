import { supervisorOrAdmin } from "../utils/auth.js";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt.js";
import { calculateCourtAllocation } from "../utils/queue.js";
import { sendNotificationToMultiple, NOTIFICATION_TYPES } from "../utils/notifications.js";
import { getCurrentCourtSession } from "../utils/courtSession.js";

class MatchCreationConflictError extends Error {}

export async function onRequestPost(context) {
  const { request, env } = context;
  const createdMatches = [];
  let assignmentsCommitted = false;
  
  try {
    const authResult = await supervisorOrAdmin(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }

    const courtSession = await getCurrentCourtSession(env);

    if (!courtSession.isOpen) {
      return createErrorResponse(
        "Court is closed. Open the court before assigning matches.",
        409,
      );
    }
    
    const availableCourts = await env.DB.prepare(`
      SELECT * FROM courts WHERE status = 'available'
    `).all();
    
    if (availableCourts.results.length === 0) {
      return createErrorResponse("No available courts", 400);
    }
    
    const queuePlayers = await env.DB.prepare(`
      SELECT
        q.id as queue_id,
        q.user_id,
        q.game_preference,
        q.joined_at,
        u.name,
        u.gender,
        u.total_matches_today
      FROM queue q
      JOIN users u ON q.user_id = u.id
      WHERE q.is_ready = TRUE
      ORDER BY q.joined_at ASC
    `).all();
    
    if (queuePlayers.results.length < 4) {
      return createErrorResponse("Not enough players in queue (need at least 4)", 400);
    }
    
    const settingsResult = await env.DB.prepare(`
      SELECT key, value FROM settings
    `).all();
    const settings = {};
    settingsResult.results.forEach(row => {
      settings[row.key] = row.value;
    });
    
    const now = new Date();

    const latestCompletedMatch = await env.DB.prepare(`
      SELECT
        team1_player1_id,
        team1_player2_id,
        team2_player1_id,
        team2_player2_id
      FROM matches
      WHERE ended_at IS NOT NULL AND deleted_at IS NULL
      ORDER BY ended_at DESC
      LIMIT 1
    `).first();

    const recentPlayerIds = new Set(
      latestCompletedMatch
        ? [
            latestCompletedMatch.team1_player1_id,
            latestCompletedMatch.team1_player2_id,
            latestCompletedMatch.team2_player1_id,
            latestCompletedMatch.team2_player2_id,
          ].filter(Boolean)
        : []
    );
    
    const calculatePriority = (player, nowDate) => {
      let score = 100 * (10 - (player.total_matches_today || 0));
      
      const joinedAt = new Date(player.joined_at);
      const waitMinutes = Math.max(0, (nowDate - joinedAt) / (1000 * 60));
      score += 2 * waitMinutes;
      
      if (player.game_preference && player.game_preference !== 'any') {
        score += 50;
      }
      
      const lateArrivalTime = settings.late_arrival_time || '20:30';
      const lateThreshold = parseInt(settings.late_arrival_priority_threshold || '2');
      const [hours, minutes] = lateArrivalTime.split(':').map(Number);
      const lateTime = new Date(nowDate);
      lateTime.setHours(hours, minutes, 0, 0);
      
      if (nowDate >= lateTime && (player.total_matches_today || 0) < lateThreshold) {
        score += 1000;
      }
      
      return Math.round(score);
    };
    
    const sortedPlayers = queuePlayers.results.map(player => ({
      ...player,
      priorityScore: calculatePriority(player, now),
      recentlyPlayedLastMatch: recentPlayerIds.has(player.user_id)
    })).sort((a, b) => b.priorityScore - a.priorityScore);
    
    const waitingWomen = sortedPlayers.filter(p => p.gender === 'female').length;
    
    const allocation = calculateCourtAllocation(waitingWomen, settings);
    
    let availableCourtCount = availableCourts.results.length;
    let mensCourtCount = Math.min(allocation.mensCourts, availableCourtCount);
    availableCourtCount -= mensCourtCount;
    let mixedCourtCount = Math.min(allocation.mixedCourts, availableCourtCount);
    availableCourtCount -= mixedCourtCount;
    let womensCourtCount = Math.min(allocation.womensCourts, availableCourtCount);
    
    let remainingPlayers = [...sortedPlayers];

    for (let i = 0; i < womensCourtCount; i++) {
      const playersForMatch = pickPreferredPlayers(
        remainingPlayers,
        4,
        player => player.gender === 'female'
      );

      if (playersForMatch.length < 4) {
        break;
      }

      const result = await createMatch(env, playersForMatch, availableCourts.results[createdMatches.length], 'womens_double');
      createdMatches.push(result);
      
      const assignedIds = playersForMatch.map(p => p.user_id);
      remainingPlayers = remainingPlayers.filter(p => !assignedIds.includes(p.user_id));
    }
    
    for (let i = 0; i < mixedCourtCount; i++) {
      const femaleForMatch = pickPreferredPlayers(
        remainingPlayers,
        2,
        player => player.gender === 'female'
      );
      const maleForMatch = pickPreferredPlayers(
        remainingPlayers,
        2,
        player => player.gender === 'male'
      );
      
      if (femaleForMatch.length >= 2 && maleForMatch.length >= 2) {
        const playersForMatch = [...femaleForMatch, ...maleForMatch];
        const result = await createMatch(env, playersForMatch, availableCourts.results[createdMatches.length], 'mixed_double');
        createdMatches.push(result);
        
        const assignedIds = playersForMatch.map(p => p.user_id);
        remainingPlayers = remainingPlayers.filter(p => !assignedIds.includes(p.user_id));
      } else {
        break;
      }
    }
    
    let mensCourtLeft = mensCourtCount;
    while (mensCourtLeft > 0 && remainingPlayers.length >= 4) {
      const playersForMatch = pickPreferredPlayers(remainingPlayers, 4);
      const femaleInThis = playersForMatch.filter(p => p.gender === 'female').length;
      const gameType = femaleInThis === 4 ? 'womens_double' : 'mens_double';
      
      const result = await createMatch(env, playersForMatch, availableCourts.results[createdMatches.length], gameType);
      createdMatches.push(result);
      
      const assignedIds = playersForMatch.map(p => p.user_id);
      remainingPlayers = remainingPlayers.filter(p => !assignedIds.includes(p.user_id));
      mensCourtLeft--;
    }
    
    if (createdMatches.length === 0) {
      return createErrorResponse("Could not create any matches with current queue composition", 400);
    }

    const latestCourtSession = await getCurrentCourtSession(env);
    if (!latestCourtSession.isOpen) {
      throw new MatchCreationConflictError(
        "Court closed before match assignment could be completed",
      );
    }
    
    const allMatchedPlayerIds = createdMatches.flatMap(m => [m.team1Player1, m.team1Player2, m.team2Player1, m.team2Player2]);
    const placeholders = allMatchedPlayerIds.map(() => "?").join(", ");
    await env.DB.prepare(`
      DELETE FROM queue WHERE user_id IN (${placeholders})
    `).bind(...allMatchedPlayerIds).run();
    assignmentsCommitted = true;

    await sendNotificationToMultiple(
      env,
      allMatchedPlayerIds,
      NOTIFICATION_TYPES.MATCH,
      "Match Assigned!",
      "You've been assigned to a match! Head to the court!"
    );
    
    return createSuccessResponse({
      success: true,
      matches: createdMatches,
      message: `Successfully created ${createdMatches.length} match(es)`
    }, 201);
  } catch (error) {
    if (!assignmentsCommitted && createdMatches.length > 0) {
      try {
        await cleanupCreatedMatches(env, createdMatches);
      } catch (cleanupError) {
        console.error("Failed to roll back partial match assignment:", cleanupError);
      }
    }

    if (error instanceof MatchCreationConflictError) {
      return createErrorResponse(error.message, 409);
    }

    console.error("Error auto-assigning match:", error);
    return createErrorResponse("Failed to auto-assign match: " + error.message, 500);
  }
}

function pickPreferredPlayers(players, count, predicate = () => true) {
  const candidates = players.filter(predicate);
  const nonRecentPlayers = candidates.filter(player => !player.recentlyPlayedLastMatch);
  const recentPlayers = candidates.filter(player => player.recentlyPlayedLastMatch);
  return [...nonRecentPlayers, ...recentPlayers].slice(0, count);
}

async function createMatch(env, players, court, gameType) {
  const team1Player1 = players[0].user_id;
  const team1Player2 = players[2].user_id;
  const team2Player1 = players[1].user_id;
  const team2Player2 = players[3].user_id;

  const playerInfo = await env.DB.prepare(`
    SELECT id, name FROM users WHERE id IN (?, ?, ?, ?)
  `).bind(team1Player1, team1Player2, team2Player1, team2Player2).all();

  const playerMap = {};
  playerInfo.results.forEach(p => {
    playerMap[p.id] = p.name;
  });

  const courtSession = await getCurrentCourtSession(env);
  if (!courtSession.isOpen) {
    throw new MatchCreationConflictError(
      "Court closed before match assignment could be completed",
    );
  }

  const result = await env.DB.prepare(`
    INSERT INTO matches (
      court_id, team1_player1_id, team1_player2_id, 
      team2_player1_id, team2_player2_id, game_type
    )
    SELECT ?, ?, ?, ?, ?, ?
    WHERE EXISTS (
      SELECT 1 FROM court_sessions WHERE date = ? AND is_open = TRUE
    )
    AND EXISTS (
      SELECT 1 FROM courts WHERE id = ? AND status = 'available'
    )
  `).bind(
    court.id,
    team1Player1, team1Player2,
    team2Player1, team2Player2,
    gameType,
    courtSession.date,
    court.id,
  ).run();

  if (result.meta.changes !== 1) {
    const latestSession = await getCurrentCourtSession(env);
    throw new MatchCreationConflictError(
      latestSession.isOpen
        ? `${court.name} is no longer available`
        : "Court closed before match assignment could be completed",
    );
  }
  
  const matchId = result.meta.last_row_id;
  
  const courtUpdate = await env.DB.prepare(`
    UPDATE courts SET status = 'occupied', current_match_id = ?
    WHERE id = ?
      AND status = 'available'
      AND EXISTS (
        SELECT 1 FROM court_sessions WHERE date = ? AND is_open = TRUE
      )
  `).bind(matchId, court.id, courtSession.date).run();

  if (courtUpdate.meta.changes !== 1) {
    await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(matchId).run();
    const latestSession = await getCurrentCourtSession(env);
    throw new MatchCreationConflictError(
      latestSession.isOpen
        ? `${court.name} is no longer available`
        : "Court closed before match assignment could be completed",
    );
  }

  return {
    match_id: matchId,
    court_id: court.id,
    court_name: court.name,
    game_type: gameType,
    team1Player1,
    team1Player2,
    team2Player1,
    team2Player2,
    teams: {
      team1: [playerMap[team1Player1], playerMap[team1Player2]],
      team2: [playerMap[team2Player1], playerMap[team2Player2]]
    }
  };
}

async function cleanupCreatedMatches(env, matches) {
  for (const match of matches) {
    await env.DB.prepare(`DELETE FROM matches WHERE id = ?`)
      .bind(match.match_id)
      .run();
    await env.DB.prepare(`
      UPDATE courts
      SET status = 'available', current_match_id = NULL
      WHERE id = ? AND current_match_id = ?
    `)
      .bind(match.court_id, match.match_id)
      .run();
  }
}
