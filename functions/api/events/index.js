/**
 * Server-Sent Events (SSE) for real-time updates
 * Note: This implementation uses a simple polling approach within SSE
 * For production with multiple instances, consider using Durable Objects
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  
  // Get token from query parameter or Authorization header
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || 
                request.headers.get("Authorization")?.replace("Bearer ", "");
  
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  // Verify the token
  try {
    const jwtSecret = env.JWT_SECRET || "development-secret-for-local-only-please-change";
    const { verifyToken } = await import("../utils/jwt");
    const payload = await verifyToken(token, jwtSecret);
    
    if (!payload) {
      return new Response("Invalid token", { status: 401 });
    }
  } catch (error) {
    console.error("Token verification error:", error);
    return new Response("Invalid token", { status: 401 });
  }
  
  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (eventName, data) => {
        const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };
      
      // Send initial connection message
      sendEvent("connected", { message: "SSE connection established" });
      
      // Poll for updates every 2 seconds
      const intervalId = setInterval(async () => {
        try {
          // Fetch latest data from the database
          const courts = await env.DB.prepare(`
            SELECT id, name, status, reserved_for, current_match_id 
            FROM courts
          `).all();
          
          const queue = await env.DB.prepare(`
            SELECT q.id, q.user_id, q.game_preference, q.is_ready, u.name as user_name
            FROM queue q
            JOIN users u ON q.user_id = u.id
            WHERE q.is_ready = TRUE
            ORDER BY q.joined_at ASC
          `).all();
          
          const matches = await env.DB.prepare(`
            SELECT
              m.*,
              c.name as court_name,
              u1.name as team1_player1_name,
              u2.name as team1_player2_name,
              u3.name as team2_player1_name,
              u4.name as team2_player2_name
            FROM matches m
            JOIN courts c ON m.court_id = c.id
            JOIN users u1 ON m.team1_player1_id = u1.id
            JOIN users u2 ON m.team1_player2_id = u2.id
            JOIN users u3 ON m.team2_player1_id = u3.id
            JOIN users u4 ON m.team2_player2_id = u4.id
            WHERE m.ended_at IS NULL AND m.deleted_at IS NULL
            ORDER BY m.started_at DESC
          `).all();
          
          const checkedIn = await env.DB.prepare(`
            SELECT c.id, c.user_id, c.checked_in_at, u.name
            FROM check_ins c
            JOIN users u ON c.user_id = u.id
            WHERE c.checked_out_at IS NULL
            ORDER BY c.checked_in_at DESC
          `).all();
          
          // Send update event with all data
          sendEvent("update", {
            courts: courts.results,
            queue: queue.results,
            matches: matches.results,
            checkedIn: checkedIn.results,
            timestamp: Date.now()
          });
          
        } catch (error) {
          console.error("SSE update error:", error);
          sendEvent("error", { message: "Error fetching updates" });
        }
      }, 2000); // Update every 2 seconds
      
      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
