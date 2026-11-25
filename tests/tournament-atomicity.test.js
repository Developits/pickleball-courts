import test from "node:test";
import assert from "node:assert/strict";
import { createSqliteDb, seedPlayers } from "./helpers/sqliteDb.js";
import { command, replay } from "../functions/api/utils/tournaments/audit.js";
import { createEvent, editEvent, writeCapability, writeCategory } from "../functions/api/utils/tournaments/repository.js";

export function fixture(t) {
  const db=createSqliteDb(); t.after(()=>db.sqlite.close()); seedPlayers(db);
  db.sqlite.exec("UPDATE users SET role='admin' WHERE id=1");
  return db;
}
export const eventData={title:"Local cup",timezone:"Asia/Shanghai",description:"",venue_name:null,
  venue_address:null,starts_at:null,ends_at:null,registration_deadline_at:null,rules_text:""};
export async function cmd(actor,action,target,payload,key=crypto.randomUUID()) {
  return command(new Request("https://example.test",{headers:{"Idempotency-Key":key}}),actor,action,target,payload);
}
async function setupEvent(db) {
  const actor={id:1};
  const operation=await cmd(actor,"event.create","new",eventData);
  operation.targetId=crypto.randomUUID();
  await createEvent(db,actor,operation,eventData);
  return db.prepare("SELECT * FROM tournaments WHERE id=?").bind(operation.targetId).first();
}
test("audit-first guarded writes serialize revisions; replay never writes twice",async t=>{
  const db=fixture(t), actor={id:1}, event=await setupEvent(db);
  const first=await cmd(actor,"event.edit",event.id,{title:"First",expected_revision:1});
  const second=await cmd(actor,"event.edit",event.id,{title:"Second",expected_revision:1});
  const results=await Promise.allSettled([
    editEvent(db,actor,first,event,{...eventData,title:"First"},1),
    editEvent(db,actor,second,event,{...eventData,title:"Second"},1),
  ]);
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
  assert.equal((await db.prepare("SELECT revision FROM tournaments WHERE id=?").bind(event.id).first()).revision,2);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM tournament_audit_log").first()).count,2);
  assert.equal((await replay(db,first)).revision,2);
  assert.equal((await editEvent(db,actor,first,event,{...eventData,title:"First"},1)).replayed,true);
  const mismatch=await cmd(actor,"event.edit",event.id,{title:"Different"},first.requestId);
  await assert.rejects(replay(db,mismatch),/different command/);
});
test("late audit failure rolls back draft creation; category failure rolls back audit and parent revision",async t=>{
  const db=fixture(t), actor={id:1};
  db.sqlite.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON tournament_audit_log BEGIN SELECT RAISE(ABORT,'audit unavailable'); END");
  const operation=await cmd(actor,"event.create","new",eventData); operation.targetId=crypto.randomUUID();
  await assert.rejects(createEvent(db,actor,operation,eventData),/audit unavailable/);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM tournaments").first()).count,0);
  db.sqlite.exec("DROP TRIGGER reject_audit");
  const event=await setupEvent(db);
  const category={code:"mixed",name:"Mixed",team_size:2,rules_text:"",sort_order:0,is_active:1};
  for(let i=0;i<2;i++){
    const op=await cmd(actor,"category.create",event.id,category); op.targetId=crypto.randomUUID();
    if(i===0)await writeCategory(db,actor,op,event,category,1);
    else await assert.rejects(writeCategory(db,actor,op,event,category,2),/UNIQUE/);
  }
  assert.equal((await db.prepare("SELECT revision FROM tournaments WHERE id=?").bind(event.id).first()).revision,2);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM tournament_audit_log").first()).count,2);
});
test("current authority inside the batch denies a stale Admin preflight and a revoked Organizer",async t=>{
  const db=fixture(t), actor={id:1}, event=await setupEvent(db);
  const op=await cmd(actor,"event.edit",event.id,{title:"Denied"});
  db.sqlite.exec("UPDATE users SET role='player' WHERE id=1");
  await assert.rejects(editEvent(db,actor,op,event,eventData,1),/permissions changed/);
  db.sqlite.exec("UPDATE users SET role='admin' WHERE id=1");
  const grant=await cmd(actor,"organizer.grant","2",{expected_revision:0});
  await writeCapability(db,actor,grant,2,0,true,null);
  db.sqlite.prepare("INSERT INTO tournament_staff VALUES (?,2,'organizer',1,0,NULL)").run(event.id);
  const organizerOp=await cmd({id:2},"event.edit",event.id,{title:"Denied"});
  db.sqlite.exec("UPDATE user_capabilities SET revoked_at=1 WHERE user_id=2");
  await assert.rejects(editEvent(db,{id:2},organizerOp,event,eventData,1),/permissions changed/);
  assert.equal((await db.prepare("SELECT revision FROM tournaments WHERE id=?").bind(event.id).first()).revision,1);
});
