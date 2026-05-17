import { supervisorOrAdmin } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const authResult = await supervisorOrAdmin(request, env);
    
    if (!authResult.authenticated) {
      return authResult.error;
    }
    
    // Get available courts
    const availableCourts = await env.DB.prepare(`
      SELECT * FROM courts WHERE status = 'available'
    `).all();
    
    if (availableCourts.results.length === 0) {
      return createErrorResponse("No available courts", 400);
    }
    
    // Get queue players with user info and sort by priority score
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
    
    // Filter out players in sit-out period
    const now = new Date();
    const eligiblePlayers = queuePlayers.results.filter(player => {
      return !player.sit_out_until || new Date(player.sit_out_until) <= now;
    });
    
    if (eligiblePlayers.length < 4) {
      return createErrorResponse("Not enough eligible players (some are in sit-out period)", 400);
    }
    
    // Helper to calculate priority score
    const calculatePriority = (player, nowDate) => {
      let score = 100 * (10 - (player.total_matches_today || 0));
      
      const joinedAt = new Date(player.joined_at);
      const waitMinutes = Math.max(0, (nowDate - joinedAt) / (1000 * 60));
      score += 2 * waitMinutes;
      
      if (player.game_preference && player.game_preference !== 'any') {
        score += 50;
      }
      
      return Math.round(score);
    };
    
    // Sort eligible players by priority
    const sortedPlayers = eligiblePlayers.map(player => ({
      ...player,
      priorityScore: calculatePriority(player, now)
    })).sort((a, b) => b.priorityScore - a.priorityScore);
    
    // Take top 4 players for the first match
    const top4Players = sortedPlayers.slice(0, 4);
    
    // Select first available court
    const selectedCourt = availableCourts.results[0];
    
    // Determine game type based on players' preferences and genders
    let gameType = "mens_double";
    const femaleCount = top4Players.filter(p => p.gender === "female").length;
    
    // If 4 women, use women's double
    if (femaleCount === 4) {
      gameType = "womens_double";
    } 
    // If 2 women, use mixed double
    else if (femaleCount === 2) {
      gameType = "mixed_double";
    }
    // Otherwise, default to men's double
    else {
      gameType = "mens_double";
    }
    
    // Create teams (sorted by priority)
    const team1Player1 = top4Players[0].user_id;
    const team1Player2 = top4Players[2].user_id;
    const team2Player1 = top4Players[1].user_id;
    const team2Player2 = top4Players[3].user_id;
    
    // Start the match using the existing logic from start.js
    const result = await env.DB.prepare(`
      INSERT INTO matches (
        court_id, team1_player1_id, team1_player2_id, 
        team2_player1_id, team2_player2_id, game_type
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      selectedCourt.id,
      team1Player1, team1Player2,
      team2Player1, team2Player2,
      gameType
    ).run();
    
    // Update court status
    await env.DB.prepare(`
      UPDATE courts SET status = 'occupied', current_match_id = ?
      WHERE id = ?
    `).bind(result.meta.last_row_id, selectedCourt.id).run();
    
    // Remove players from queue (they're now playing, not waiting)
    for (const userId of [team1Player1, team1Player2, team2Player1, team2Player2]) {
      await env.DB.prepare(`
        DELETE FROM queue WHERE user_id = ?
      `).bind(userId).run();
    }
    
    // NOTE: Player stats (total_matches, wins, losses) are updated in matches/end.js
    // when the match is actually finished and winner is determined
    
    // Get player names for the response
    const playerInfo = await env.DB.prepare(`
      SELECT id, name FROM users WHERE id IN (?, ?, ?, ?)
    `).bind(team1Player1, team1Player2, team2Player1, team2Player2).all();
    
    const playerMap = {};
    playerInfo.results.forEach(p => {
      playerMap[p.id] = p.name;
    });
    
    return createSuccessResponse({
      success: true,
      match_id: result.meta.last_row_id,
      court_id: selectedCourt.id,
      court_name: selectedCourt.name,
      game_type: gameType,
      teams: {
        team1: [
          playerMap[team1Player1],
          playerMap[team1Player2]
        ],
        team2: [
          playerMap[team2Player1],
          playerMap[team2Player2]
        ]
      },
      message: "Match automatically created successfully"
    }, 201);
  } catch (error) {
    console.error("Error auto-assigning match:", error);
    return createErrorResponse("Failed to auto-assign match: " + error.message, 500);
  }
}
