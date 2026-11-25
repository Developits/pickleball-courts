import { TournamentError, requireValue, uuid } from "./validation.js";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export async function command(request, actor, action, targetId, payload) {
  const requestId = uuid(request.headers.get("Idempotency-Key"), "Idempotency-Key");
  const encoded = new TextEncoder().encode(JSON.stringify(canonical({ action, targetId, payload })));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return {
    id: crypto.randomUUID(), requestId, actorId: actor.id, action, targetId,
    fingerprint: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,"0")).join(""),
    now: Math.floor(Date.now()/1000),
  };
}
export async function replay(db, cmd) {
  const old = await db.prepare(`SELECT target_id,resource_revision,request_fingerprint FROM tournament_audit_log
    WHERE actor_user_id=? AND request_id=?`).bind(cmd.actorId, cmd.requestId).first();
  if (!old) return null;
  requireValue(old.request_fingerprint === cmd.fingerprint, "Idempotency key was used for a different command", 409);
  return { id: old.target_id, revision: old.resource_revision, replayed: true };
}
export function auditInsert(db, cmd, eventId, type, resourceRevision, before, after, guard, args = []) {
  return db.prepare(`INSERT INTO tournament_audit_log
    (id,request_id,request_fingerprint,tournament_id,actor_user_id,action,target_type,target_id,
      resource_revision,before_json,after_json,created_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE (${guard})
    AND NOT EXISTS (SELECT 1 FROM tournament_audit_log WHERE actor_user_id=? AND request_id=?)`)
    .bind(cmd.id, cmd.requestId, cmd.fingerprint, eventId, cmd.actorId, cmd.action, type, cmd.targetId,
      resourceRevision, before === null ? null : JSON.stringify(before), JSON.stringify(after), cmd.now,
      ...args, cmd.actorId, cmd.requestId);
}
// The fresh, server-generated audit ID is a command-local guard. Prior replay
// rows have different IDs and cannot authorize dependent writes.
export const commandGuard = "EXISTS (SELECT 1 FROM tournament_audit_log WHERE id=?)";

export async function runCommand(db, cmd, statements, auditIndex = 0) {
  const prior = await replay(db, cmd);
  if (prior) return prior;
  const results = await db.batch(statements);
  if (results[auditIndex].meta.changes === 1) {
    const result = await replay(db, cmd);
    if (result) return { ...result, replayed: false };
  }
  const raced = await replay(db, cmd);
  if (raced) return raced;
  throw new TournamentError(409, "Revision, eligibility or permissions changed. Reload before retrying.");
}
