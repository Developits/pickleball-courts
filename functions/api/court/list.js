import { createSuccessResponse, createErrorResponse } from '../utils/jwt';

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
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