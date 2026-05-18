import { authenticateRequest } from '../utils/auth';
import { createSuccessResponse, createErrorResponse } from '../utils/jwt';
import { applyRateLimit } from '../utils/rateLimit';

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const rateLimitResult = await applyRateLimit(request, env, { key: 'courts', max: 10, windowSeconds: 60 });
    if (rateLimitResult.error) {
      return rateLimitResult.error;
    }

    const authResult = await authenticateRequest(request, env);
    if (!authResult.authenticated) {
      return authResult.error;
    }

    const courts = await env.DB.prepare(
      `SELECT * FROM courts ORDER BY id ASC`
    ).all();

    return createSuccessResponse({
      courts: courts.results
    });
  } catch (error) {
    console.error('Error fetching courts:', error);
    return createErrorResponse('Failed to fetch courts', 500);
  }
}
