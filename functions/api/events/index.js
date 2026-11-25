/**
 * Server-Sent Events (SSE) for real-time updates
 * Note: This implementation uses a simple polling approach within SSE
 * For production with multiple instances, consider using Durable Objects
 */
import { authenticateRequest } from "../utils/auth.js";
import { LIVE_MATCHES_QUERY } from "../utils/gameHistory.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  
  // Match the rest of the API: fail closed without a configured secret.
  // The frontend uses fetch streaming and sends an Authorization header.
  // Do not accept query-string tokens, which can leak into URLs and logs.
  const authResult = await authenticateRequest(request, env);
  if (!authResult.authenticated) return authResult.error;
  
  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  let intervalId;
  let stopped = false;
  let stop;
  
  const stream = new ReadableStream({
    async start(controller) {
      stop = (closeStream = true) => {
        if (stopped) return;
        stopped = true;
        clearInterval(intervalId);
        request.signal.removeEventListener("abort", onAbort);
        if (closeStream) controller.close();
      };
      const onAbort = () => stop();
      const sendEvent = (eventName, data) => {
        if (stopped) return;
        const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      if (request.signal.aborted) {
        stop();
        return;
      }
      
      // Send initial connection message
      sendEvent("connected", { message: "SSE connection established" });
      
      // Poll for updates every 2 seconds
      let polling = false;
      intervalId = setInterval(async () => {
        if (stopped || polling) return;
        if (authResult.user.exp <= Math.floor(Date.now() / 1000)) {
          stop();
          return;
        }
        polling = true;
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
          
          const matches = await env.DB.prepare(LIVE_MATCHES_QUERY).all();
          
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
        } finally {
          polling = false;
        }
      }, 2000); // Update every 2 seconds
      
      // Handle client disconnect
      request.signal.addEventListener("abort", onAbort, { once: true });
    },
    cancel() {
      // A canceled response body is already closed by the stream machinery.
      stop(false);
    },
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    }
  });
}
