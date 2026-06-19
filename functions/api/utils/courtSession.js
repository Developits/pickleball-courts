const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

export function getShanghaiDateTime(now = new Date()) {
  const shanghaiNow = new Date(now.getTime() + SHANGHAI_OFFSET_MS);
  const isoTimestamp = shanghaiNow.toISOString();

  return {
    date: isoTimestamp.slice(0, 10),
    time: isoTimestamp.slice(11, 19),
  };
}

export async function getCurrentCourtSession(env, now = new Date()) {
  const { date, time } = getShanghaiDateTime(now);
  const session = await env.DB.prepare(
    `SELECT id, date, is_open FROM court_sessions WHERE date = ?`,
  )
    .bind(date)
    .first();

  return {
    date,
    time,
    session,
    isOpen: Boolean(session?.is_open),
  };
}

export async function getQueueLockState(env, currentTime) {
  const setting = await env.DB.prepare(
    `SELECT value FROM settings WHERE key = 'queue_lock_shanghai_time'`,
  ).first();
  const queueLockTime = setting?.value || "20:45";

  return {
    queueLockTime,
    isQueueLocked: currentTime >= queueLockTime,
  };
}
