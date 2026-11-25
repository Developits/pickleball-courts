import { authoritySQL, eligibleSQL, organizerSQL } from "./policy.js";
import { auditInsert, commandGuard, runCommand } from "./audit.js";

export function eventGuard(actor, eventId, expected, action = "edit") {
  const auth = authoritySQL(actor.id, eventId, action);
  return {
    sql: `${auth.sql} AND EXISTS (SELECT 1 FROM tournaments WHERE id=? AND status='draft' AND revision=?)`,
    args: [...auth.args, eventId, expected],
  };
}
function bump(db, cmd, eventId) {
  return db.prepare(`UPDATE tournaments SET revision=revision+1,updated_at=? WHERE id=? AND ${commandGuard}`)
    .bind(cmd.now, eventId, cmd.id);
}
export async function createEvent(db, actor, cmd, data) {
  const auth = authoritySQL(actor.id);
  const fields = Object.keys(data);
  const insert = db.prepare(`INSERT INTO tournaments
    (id,${fields.join(",")},created_by_user_id,created_at,updated_at,revision)
    SELECT ?,${fields.map(() => "?").join(",")},?,?,?,1 WHERE ${auth.sql}
    AND NOT EXISTS(SELECT 1 FROM tournament_audit_log WHERE actor_user_id=? AND request_id=?)`)
    .bind(cmd.targetId, ...fields.map(key => data[key]), actor.id, cmd.now, cmd.now,
      ...auth.args, actor.id, cmd.requestId);
  const audit = auditInsert(db,cmd,cmd.targetId,"event",1,null,data,
    "EXISTS(SELECT 1 FROM tournaments WHERE id=?)",[cmd.targetId]);
  return runCommand(db,cmd,[insert,audit],1);
}
export async function editEvent(db, actor, cmd, event, data, expected) {
  const guard = eventGuard(actor,event.id,expected);
  const fields = Object.keys(data);
  const update = db.prepare(`UPDATE tournaments SET ${fields.map(key => `${key}=?`).join(",")},
    revision=revision+1,updated_at=? WHERE id=? AND ${commandGuard}`)
    .bind(...fields.map(key => data[key]),cmd.now,event.id,cmd.id);
  return runCommand(db,cmd,[
    auditInsert(db,cmd,event.id,"event",expected+1,event,data,guard.sql,guard.args), update,
  ]);
}
export async function writeCategory(db, actor, cmd, event, data, expected, previous = null) {
  const guard = eventGuard(actor,event.id,expected);
  if (previous) {
    guard.sql += " AND EXISTS(SELECT 1 FROM tournament_categories WHERE id=? AND tournament_id=?)";
    guard.args.push(previous.id,event.id);
  }
  const fields = Object.keys(data);
  const write = previous
    ? db.prepare(`UPDATE tournament_categories SET ${fields.map(key => `${key}=?`).join(",")},updated_at=?
        WHERE id=? AND tournament_id=? AND ${commandGuard}`)
      .bind(...fields.map(key => data[key]),cmd.now,previous.id,event.id,cmd.id)
    : db.prepare(`INSERT INTO tournament_categories (id,tournament_id,${fields.join(",")},created_at,updated_at)
        SELECT ?,?,${fields.map(() => "?").join(",")},?,? WHERE ${commandGuard}`)
      .bind(cmd.targetId,event.id,...fields.map(key => data[key]),cmd.now,cmd.now,cmd.id);
  return runCommand(db,cmd,[
    auditInsert(db,cmd,event.id,"category",expected+1,previous,data,guard.sql,guard.args),
    bump(db,cmd,event.id), write,
  ]);
}
export async function writeCapability(db, actor, cmd, target, expected, active, previous) {
  const auth = authoritySQL(actor.id);
  const guard = `${auth.sql}
    AND COALESCE((SELECT revision FROM user_capabilities WHERE user_id=? AND capability='tournament_organizer'),0)=?
    AND EXISTS(SELECT 1 FROM users recipient WHERE recipient.id=? ${active ? `AND ${eligibleSQL("recipient")}` : ""})
    AND ${active
      ? "NOT EXISTS(SELECT 1 FROM user_capabilities WHERE user_id=? AND capability='tournament_organizer' AND revoked_at IS NULL)"
      : "EXISTS(SELECT 1 FROM user_capabilities WHERE user_id=? AND capability='tournament_organizer' AND revoked_at IS NULL)"}`;
  const audit = auditInsert(db,cmd,null,"organizer",expected+1,previous,
    { user_id:target, active },guard,[...auth.args,target,expected,target,target]);
  const write = active
    ? db.prepare(`INSERT INTO user_capabilities (user_id,capability,granted_by_user_id,granted_at,revoked_at,revision)
      SELECT ?,'tournament_organizer',?,?,NULL,? WHERE ${commandGuard}
      ON CONFLICT(user_id,capability) DO UPDATE SET granted_by_user_id=excluded.granted_by_user_id,
      granted_at=excluded.granted_at,revoked_at=NULL,revision=excluded.revision`)
      .bind(target,actor.id,cmd.now,expected+1,cmd.id)
    : db.prepare(`UPDATE user_capabilities SET revoked_at=?,revision=revision+1
      WHERE user_id=? AND capability='tournament_organizer' AND ${commandGuard}`)
      .bind(cmd.now,target,cmd.id);
  return runCommand(db,cmd,[audit,write]);
}
export async function writeStaff(db, actor, cmd, event, target, roles, expected, previous) {
  const guard = eventGuard(actor,event.id,expected,"admin");
  if (roles.length) {
    guard.sql += ` AND EXISTS(SELECT 1 FROM users recipient WHERE recipient.id=? AND ${eligibleSQL("recipient")}
      ${roles.includes("supervisor") ? "AND recipient.role IN ('supervisor','admin')" : ""}
      ${roles.includes("organizer") ? `AND (recipient.role='admin' OR ${organizerSQL("recipient")})` : ""})`;
    guard.args.push(target);
  }
  const revoke = db.prepare(`UPDATE tournament_staff SET revoked_at=? WHERE tournament_id=? AND user_id=? AND ${commandGuard}`)
    .bind(cmd.now,event.id,target,cmd.id);
  const inserts = roles.map(role => db.prepare(`INSERT INTO tournament_staff
    (tournament_id,user_id,staff_role,assigned_by_user_id,assigned_at,revoked_at)
    SELECT ?,?,?,?,?,NULL WHERE ${commandGuard}
    ON CONFLICT(tournament_id,user_id,staff_role) DO UPDATE SET
      assigned_by_user_id=excluded.assigned_by_user_id,assigned_at=excluded.assigned_at,revoked_at=NULL`)
    .bind(event.id,target,role,actor.id,cmd.now,cmd.id));
  return runCommand(db,cmd,[
    auditInsert(db,cmd,event.id,"staff",expected+1,{ roles:previous },{ user_id:target, roles },guard.sql,guard.args),
    bump(db,cmd,event.id),revoke,...inserts,
  ]);
}
