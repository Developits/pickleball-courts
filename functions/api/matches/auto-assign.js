import { supervisorOrAdmin } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";
import { calculateCourtAllocation } from "../utils/queue";
import { sendNotificationToMultiple, NOTIFICATION_TYPES } from "../utils/notifications";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const authResult = await supervisorOrAdmin(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
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
        u.total_matches_today,
        u.sit_out_until
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
    const eligiblePlayers = queuePlayers.results.filter(player => {
      return !player.sit_out_until || new Date(player.sit_out_until) <= now;
    });
    
    if (eligiblePlayers.length < 4) {
      return createErrorResponse("Not enough eligible players (some are in sit-out period)", 400);
    }
    
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
    
    const sortedPlayers = eligiblePlayers.map(player => ({
      ...player,
      priorityScore: calculatePriority(player, now)
    })).sort((a, b) => b.priorityScore - a.priorityScore);
    
    const waitingWomen = sortedPlayers.filter(p => p.gender === 'female').length;
    
    const allocation = calculateCourtAllocation(waitingWomen, settings);
    
    let availableCourtCount = availableCourts.results.length;
    let mensCourtCount = Math.min(allocation.mensCourts, availableCourtCount);
    availableCourtCount -= mensCourtCount;
    let mixedCourtCount = Math.min(allocation.mixedCourts, availableCourtCount);
    availableCourtCount -= mixedCourtCount;
    let womensCourtCount = Math.min(allocation.womensCourts, availableCourtCount);
    
    const createdMatches = [];
    let remainingPlayers = [...sortedPlayers];
    
    const femalePlayers = remainingPlayers.filter(p => p.gender === 'female');
    
    for (let i = 0; i < womensCourtCount && femalePlayers.length >= 4; i++) {
      const playersForMatch = femalePlayers.slice(0, 4);
      const result = await createMatch(env, playersForMatch, availableCourts.results[createdMatches.length], 'womens_double');
      createdMatches.push(result);
      
      const assignedIds = playersForMatch.map(p => p.user_id);
      remainingPlayers = remainingPlayers.filter(p => !assignedIds.includes(p.user_id));
    }
    
    for (let i = 0; i < mixedCourtCount; i++) {
      const femaleForMatch = remainingPlayers.filter(p => p.gender === 'female').slice(0, 2);
      const maleForMatch = remainingPlayers.filter(p => p.gender === 'male').slice(0, 2);
      
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
      const playersForMatch = remainingPlayers.slice(0, 4);
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
    
    const allMatchedPlayerIds = createdMatches.flatMap(m => [m.team1Player1, m.team1Player2, m.team2Player1, m.team2Player2]);
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
    console.error("Error auto-assigning match:", error);
    return createErrorResponse("Failed to auto-assign match: " + error.message, 500);
  }
}

async function createMatch(env, players, court, gameType) {
  const team1Player1 = players[0].user_id;
  const team1Player2 = players[2].user_id;
  const team2Player1 = players[1].user_id;
  const team2Player2 = players[3].user_id;
  
  const result = await env.DB.prepare(`
    INSERT INTO matches (
      court_id, team1_player1_id, team1_player2_id, 
      team2_player1_id, team2_player2_id, game_type
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    court.id,
    team1Player1, team1Player2,
    team2Player1, team2Player2,
    gameType
  ).run();
  
  const matchId = result.meta.last_row_id;
  
  await env.DB.prepare(`
    UPDATE courts SET status = 'occupied', current_match_id = ?
    WHERE id = ?
  `).bind(matchId, court.id).run();
  
  for (const userId of [team1Player1, team1Player2, team2Player1, team2Player2]) {
    await env.DB.prepare(`
      DELETE FROM queue WHERE user_id = ?
    `).bind(userId).run();
  }
  
  const playerInfo = await env.DB.prepare(`
    SELECT id, name FROM users WHERE id IN (?, ?, ?, ?)
  `).bind(team1Player1, team1Player2, team2Player1, team2Player2).all();
  
  const playerMap = {};
  playerInfo.results.forEach(p => {
    playerMap[p.id] = p.name;
  });
  
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
