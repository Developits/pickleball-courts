import { supervisorOrAdmin } from '../utils/auth';
import { createSuccessResponse, createErrorResponse } from '../utils/jwt';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const authResult = await supervisorOrAdmin(request, env);

    if (!authResult.authenticated) {
      return authResult.error;
    }

    const { courtId, status } = await request.json();

    if (!courtId || !status) {
      return createErrorResponse('Court ID and status are required', 400);
    }

    const validStatuses = ['available', 'occupied', 'reserved'];
    if (!validStatuses.includes(status)) {
      return createErrorResponse('Invalid status', 400);
    }

    await env.DB.prepare(
      `UPDATE courts SET status = ? WHERE id = ?`
    ).bind(status, courtId).run();

    return createSuccessResponse({
      success: true,
      message: `Court ${courtId} status updated to ${status}`
    });
  } catch (error) {
    console.error('Error setting court status:', error);
    return createErrorResponse('Failed to update court status', 500);
  }
}