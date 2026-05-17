/**
 * Utility functions for sending in-app notifications
 */

export async function sendNotification(env, userId, type, title, message) {
  try {
    await env.DB.prepare(`
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (?, ?, ?, ?)
    `).bind(userId, type, title, message).run();
    
    console.log(`Notification sent to user ${userId}: ${title}`);
    return true;
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
  }
}

export async function sendNotificationToMultiple(env, userIds, type, title, message) {
  try {
    const promises = userIds.map(userId => 
      sendNotification(env, userId, type, title, message)
    );
    await Promise.all(promises);
    console.log(`Notifications sent to ${userIds.length} users`);
    return true;
  } catch (error) {
    console.error("Error sending notifications:", error);
    return false;
  }
}

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success',
  MATCH: 'match',
  TEAM_INVITE: 'team_invite',
  ACCOUNT_APPROVED: 'account_approved',
  CHECK_IN: 'check_in',
  CHECK_OUT: 'check_out',
  QUEUE: 'queue'
};
