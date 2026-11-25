import { authenticateRequest } from "../auth.js";
import { TournamentError, requireValue } from "./validation.js";

export const eligibleSQL = (alias) => `${alias}.is_approved = 1 AND ${alias}.deleted_at IS NULL
  AND (${alias}.banned_until IS NULL OR julianday(${alias}.banned_until) <= julianday('now'))`;
export const organizerSQL = (user = "u") => `EXISTS (SELECT 1 FROM user_capabilities cap
  WHERE cap.user_id=${user}.id AND cap.capability='tournament_organizer' AND cap.revoked_at IS NULL)`;
export function authoritySQL(actorId, eventId = null, action = "admin") {
  const assignment = eventId ? `EXISTS (SELECT 1 FROM tournament_staff staff
    WHERE staff.tournament_id=? AND staff.user_id=u.id AND staff.revoked_at IS NULL AND
      ((staff.staff_role='organizer' AND ${organizerSQL()})
      ${action === "read" ? "OR (staff.staff_role='supervisor' AND u.role IN ('supervisor','admin'))" : ""}))` : "0";
  return {
    sql: `EXISTS (SELECT 1 FROM users u WHERE u.id=? AND ${eligibleSQL("u")}
      AND (u.role='admin' ${action !== "admin" ? `OR ${assignment}` : ""}))`,
    args: [actorId, ...(eventId && action !== "admin" ? [eventId] : [])],
  };
}
export async function currentActor(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.authenticated) return { response: auth.error };
  const user = await env.DB.prepare(`SELECT id,name,student_id,role FROM users u WHERE id=? AND ${eligibleSQL("u")}`)
    .bind(auth.user.userId).first();
  requireValue(user, "Account is not eligible", 403);
  return { user };
}
export async function assertAuthority(db, actor, eventId = null, action = "admin") {
  const guard = authoritySQL(actor.id, eventId, action);
  const row = await db.prepare(`SELECT 1 AS allowed WHERE ${guard.sql}`).bind(...guard.args).first();
  if (!row) throw new TournamentError(eventId ? 404 : 403, eventId ? "Tournament not found" : "Admin access required");
}
export async function eventAccess(db, actor, id, write = false) {
  await assertAuthority(db, actor, id, "read");
  const event = await db.prepare("SELECT * FROM tournaments WHERE id=?").bind(id).first();
  requireValue(event, "Tournament not found", 404);
  if (write) {
    const guard = authoritySQL(actor.id, id, "edit");
    requireValue(await db.prepare(`SELECT 1 AS allowed WHERE ${guard.sql}`).bind(...guard.args).first(), "Read-only tournament access", 403);
  }
  return event;
}
export async function capabilities(db, id) {
  try {
    const rows = await db.prepare(`SELECT capability FROM user_capabilities WHERE user_id=? AND revoked_at IS NULL`).bind(id).all();
    return rows.results.map(row => row.capability);
  } catch (error) {
    // A not-yet-applied additive migration must not break existing casual login.
    if (/no such table: (?:main\.)?user_capabilities/i.test(error.message)) return [];
    throw error;
  }
}
