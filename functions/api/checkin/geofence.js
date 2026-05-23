import { authenticateRequest } from "../utils/auth";
import { createSuccessResponse, createErrorResponse } from "../utils/jwt";

// Haversine formula to calculate distance between two points in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const authResult = await authenticateRequest(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    const userId = authResult.user.userId;

    // Get player's coordinates from request body
    const body = await request.json();
    const { latitude, longitude } = body;

    if (!latitude || !longitude) {
      return createErrorResponse("Latitude and longitude are required", 400);
    }

    // Get court coordinates and radius from settings
    const courtLatResult = await env.DB.prepare(`
      SELECT value FROM settings WHERE key = 'court_latitude'
    `).first();
    const courtLonResult = await env.DB.prepare(`
      SELECT value FROM settings WHERE key = 'court_longitude'
    `).first();
    const radiusResult = await env.DB.prepare(`
      SELECT value FROM settings WHERE key = 'geofence_radius_meters'
    `).first();

    const courtLat = parseFloat(courtLatResult?.value || '32.204786');
    const courtLon = parseFloat(courtLonResult?.value || '118.713767');
    const radius = parseFloat(radiusResult?.value || '50');

    // Calculate distance
    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      courtLat,
      courtLon
    );

    // Check if within radius
    if (distance > radius) {
      return createErrorResponse(
        `You are ${Math.round(distance)} meters away from the court. Please be within ${radius} meters to check in.`,
        400
      );
    }

    // Get today's date in Shanghai time (UTC+8) and check if court is open
    const now = new Date();
    const shanghaiNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const todayDate = shanghaiNow.toISOString().split('T')[0]; // YYYY-MM-DD

    const session = await env.DB.prepare(`
      SELECT * FROM court_sessions WHERE date = ?
    `).bind(todayDate).first();

    if (!session || !session.is_open) {
      return createErrorResponse("Court is not open today!", 400);
    }

    // Check if already checked in
    const activeCheckIn = await env.DB.prepare(`
      SELECT * FROM check_ins WHERE user_id = ? AND checked_out_at IS NULL
    `).bind(userId).first();

    if (activeCheckIn) {
      return createSuccessResponse({
        success: true,
        message: "You are already checked in!",
        checked_in: true
      });
    }

    // Get user info to verify eligibility
    const user = await env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(userId).first();

    if (!user) {
      return createErrorResponse("User not found", 404);
    }

    if (!user.is_approved) {
      return createErrorResponse("Your account is not approved yet", 403);
    }

    if (user.banned_until && new Date(user.banned_until) > now) {
      return createErrorResponse(
        `You are banned until ${new Date(user.banned_until).toLocaleDateString()}`,
        403
      );
    }

    // Finally, create check-in record
    await env.DB.prepare(`
      INSERT INTO check_ins (user_id, is_manual, geofence_verified)
      VALUES (?, false, true)
    `).bind(userId).run();

    return createSuccessResponse({
      success: true,
      message: "Successfully checked in via geofencing!",
      checked_in: true,
      distance: Math.round(distance)
    });
  } catch (error) {
    console.error("Error in geofencing check-in:", error);
    return createErrorResponse("Failed to check in", 500);
  }
}
