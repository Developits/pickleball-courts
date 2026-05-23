export async function scheduled(event, env, ctx) {
  console.log("Starting auto-close court task...");

  try {
    // Get today's date in Shanghai time (UTC+8)
    const now = new Date();
    const shanghaiNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const todayDate = shanghaiNow.toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if court is open
    const session = await env.DB.prepare(`
      SELECT * FROM court_sessions WHERE date = ?
    `).bind(todayDate).first();

    if (!session || !session.is_open) {
      console.log("Court is not open, no need to auto-close");
      return;
    }

    // --- FULL DAILY RESET ---

    // 1. DELETE ALL ONGOING MATCHES COMPLETELY (NO RECORD LEFT)
    await env.DB.prepare(`
      DELETE FROM matches WHERE ended_at IS NULL
    `).run();

    // 2. Reset all courts to available
    await env.DB.prepare(`
      UPDATE courts SET status = 'available', current_match_id = NULL
    `).run();

    // 3. Reset total_matches_today for all users
    await env.DB.prepare(`
      UPDATE users SET total_matches_today = 0
    `).run();

    // 4. Clear all queue entries
    await env.DB.prepare(`
      DELETE FROM queue
    `).run();

    // 5. Clear sit-out periods
    await env.DB.prepare(`
      UPDATE users SET sit_out_until = NULL
    `).run();

    // 6. Clear all active check-ins
    await env.DB.prepare(`
      UPDATE check_ins SET checked_out_at = CURRENT_TIMESTAMP WHERE checked_out_at IS NULL
    `).run();

    // 7. Delete all QR tokens
    await env.DB.prepare(`
      DELETE FROM qr_tokens
    `).run();

    // 8. Mark session as closed (auto-closed, no supervisor)
    await env.DB.prepare(`
      UPDATE court_sessions 
      SET is_open = false,
          closed_at = CURRENT_TIMESTAMP,
          closed_by_supervisor_id = NULL
      WHERE date = ?
    `).bind(todayDate).run();

    console.log("Auto-close court task completed successfully!");
  } catch (error) {
    console.error("Error in auto-close court task:", error);
    throw error; // Let Cloudflare handle the error
  }
}
