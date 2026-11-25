import test from "node:test";
import assert from "node:assert/strict";
import { createSqliteDb, seedPlayers } from "./helpers/sqliteDb.js";
import { createAuthenticatedRequest, TEST_JWT_SECRET } from "./helpers/auth.js";
import { handleTournament } from "../functions/api/utils/tournaments/service.js";
import { performCourtReset } from "../functions/api/utils/courtReset.js";
import { supervisorOrAdmin } from "../functions/api/utils/auth.js";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const A="11111111-1111-4111-8111-111111111111",B="22222222-2222-4222-8222-222222222222";
function setup(t){
  const db=createSqliteDb();t.after(()=>db.sqlite.close());seedPlayers(db);
  db.sqlite.exec(`UPDATE users SET role='admin' WHERE id=1;
    UPDATE users SET role='supervisor' WHERE id IN (3,5);
    UPDATE users SET banned_until='2099-01-01' WHERE id=8;
    INSERT INTO user_capabilities VALUES (2,'tournament_organizer',1,0,NULL,1),(4,'tournament_organizer',1,0,NULL,1),(5,'tournament_organizer',1,0,NULL,1);`);
  for(const id of [A,B])db.sqlite.prepare("INSERT INTO tournaments (id,title,timezone,created_by_user_id,created_at,updated_at,revision) VALUES (?,'Draft','UTC',1,0,0,1)").run(id);
  db.sqlite.prepare("INSERT INTO tournament_staff VALUES (?,2,'organizer',1,0,NULL),(?,3,'supervisor',1,0,NULL),(?,5,'organizer',1,0,NULL),(?,4,'organizer',1,0,NULL)").run(A,A,A,B);
  return db;
}
async function call(db,resource,{actor=1,method="GET",body,params={},query="",key=crypto.randomUUID(),tokenRole}={}){
  const role=tokenRole||({1:"admin",3:"supervisor",5:"supervisor"}[actor]||"player");
  const base=await createAuthenticatedRequest(`/api/test${query}`,{userId:actor,role,method,body});
  const headers=new Headers(base.headers);headers.set("Idempotency-Key",key);
  const request=new Request(base,{headers});
  const response=await handleTournament({request,env:{DB:db,JWT_SECRET:TEST_JWT_SECRET},params},resource);
  return {status:response.status,data:await response.json()};
}
const count=db=>Number(db.sqlite.prepare("SELECT COUNT(*) AS n FROM tournament_audit_log").get().n);
test("current DB roles and assignments govern scoped reads/edits, not forged/stale role claims",async t=>{
  const db=setup(t);
  for(const [actor,status] of [[1,200],[2,200],[3,200],[4,404],[6,403],[7,403],[8,403]]){
    assert.equal((await call(db,"event",{actor,params:{tournamentId:A}})).status,status);
  }
  assert.equal((await call(db,"event",{actor:3,method:"PATCH",params:{tournamentId:A},body:{title:"Denied",expected_revision:1}})).status,403);
  assert.equal((await call(db,"organizers",{actor:2,tokenRole:"admin"})).status,403);
  const visible=await call(db,"list",{actor:2});
  assert.deepEqual(visible.data.tournaments.map(row=>row.id),[A]);
  assert.equal((await call(db,"audit",{actor:3,params:{tournamentId:A}})).status,403);
  assert.equal((await call(db,"event",{actor:2,method:"PATCH",params:{tournamentId:A},body:{title:"Organizer edit",expected_revision:1}})).status,200);
});
test("Admin drafts are idempotent and only approved Phase 1 fields/actions are accepted",async t=>{
  const db=setup(t),key=crypto.randomUUID(),body={title:"New cup",timezone:"Asia/Shanghai",venue_name:"Hall",rules_text:"Plain text rules"};
  const first=await call(db,"list",{method:"POST",body,key});
  const again=await call(db,"list",{method:"POST",body,key});
  assert.equal(first.status,201);assert.equal(again.data.id,first.data.id);assert.equal(again.data.replayed,true);
  assert.equal(count(db),1);
  assert.equal((await call(db,"list",{method:"POST",body:{...body,title:"Other"},key})).status,409);
  for(const invalid of [{...body,status:"registration_open"},{...body,created_by_user_id:2},{...body,starts_at:1},{...body,timezone:"Wrong/Zone"}]){
    assert.equal((await call(db,"list",{method:"POST",body:invalid})).status,400);
  }
  assert.equal((await call(db,"list",{actor:2,method:"POST",body})).status,403);
  assert.equal((await call(db,"event",{params:{tournamentId:A},method:"DELETE",body:{}})).status,405);
  assert.equal(count(db),1);
});
test("categories require parent scope, revisions and allow disable rather than delete",async t=>{
  const db=setup(t),params={tournamentId:A};
  const first=await call(db,"categories",{actor:2,method:"POST",params,body:{code:"custom",name:"Custom category",team_size:3,expected_revision:1}});
  assert.equal(first.status,201);
  const child={...params,categoryId:first.data.id};
  assert.equal((await call(db,"category",{actor:2,method:"PATCH",params:child,body:{name:"Stale",expected_revision:1}})).status,409);
  assert.equal((await call(db,"category",{method:"PATCH",params:{...child,tournamentId:B},body:{name:"Wrong parent",expected_revision:1}})).status,404);
  assert.equal((await call(db,"category",{actor:2,method:"PATCH",params:child,body:{is_active:false,expected_revision:2}})).status,200);
  const rows=await call(db,"categories",{actor:3,params});
  assert.equal(rows.data.categories[0].is_active,0);
  assert.equal(count(db),2);
});
test("grant revocation disables old tokens immediately without replacing casual Supervisor role",async t=>{
  const db=setup(t);
  assert.equal((await call(db,"organizer",{method:"DELETE",params:{userId:"5"},body:{expected_revision:1}})).status,200);
  assert.equal((await call(db,"event",{actor:5,params:{tournamentId:A}})).status,404);
  assert.equal(db.sqlite.prepare("SELECT role FROM users WHERE id=5").get().role,"supervisor");
  const request=await createAuthenticatedRequest("/api/casual",{userId:5,role:"supervisor"});
  assert.equal((await supervisorOrAdmin(request,{JWT_SECRET:TEST_JWT_SECRET})).authenticated,true);
  assert.equal((await call(db,"organizer",{actor:2,method:"PUT",params:{userId:"5"},body:{expected_revision:2}})).status,403);
  const users=await call(db,"organizers",{query:"?q=Erin&limit=1"});
  assert.equal(users.data.users.length,1);assert.equal(users.data.users[0].organizer_active,0);
  assert.ok(!JSON.stringify(users.data).includes("password"));
});
test("Admin staff replacement is audited, eligibility-checked and revision guarded",async t=>{
  const db=setup(t),params={tournamentId:A,userId:"5"};
  const update=await call(db,"staffMember",{method:"PUT",params,body:{roles:["organizer","supervisor"],expected_revision:1}});
  assert.equal(update.status,200);
  const staff=await call(db,"staff",{actor:3,params:{tournamentId:A}});
  assert.deepEqual(staff.data.staff.find(row=>row.user_id===5).roles,["organizer","supervisor"]);
  assert.equal((await call(db,"staffMember",{actor:2,method:"DELETE",params,body:{expected_revision:2}})).status,403);
  assert.equal((await call(db,"staffMember",{method:"PUT",params:{...params,userId:"8"},body:{roles:["supervisor"],expected_revision:2}})).status,409);
  assert.equal((await call(db,"staffMember",{method:"DELETE",params,body:{expected_revision:2}})).status,200);
  assert.equal((await call(db,"event",{actor:5,params:{tournamentId:A}})).status,404);
  assert.equal((await call(db,"audit",{actor:2,params:{tournamentId:A},query:"?limit=1"})).data.has_more,true);
});
test("permission checks inside the batch stop a revocation race with no successful audit",async t=>{
  const db=setup(t),batch=db.batch;
  db.batch=async statements=>{
    db.sqlite.exec("UPDATE user_capabilities SET revoked_at=1 WHERE user_id=2");
    return batch(statements);
  };
  const response=await call(db,"event",{actor:2,method:"PATCH",params:{tournamentId:A},body:{title:"Racing edit",expected_revision:1}});
  assert.equal(response.status,409);assert.equal(count(db),0);
  assert.equal(db.sqlite.prepare("SELECT revision FROM tournaments WHERE id=?").get(A).revision,1);
});
test("replayed commands re-check current authority instead of trusting the original grant",async t=>{
  const db=setup(t),key=crypto.randomUUID(),params={tournamentId:A};
  const body={title:"Replay edit",expected_revision:1};
  assert.equal((await call(db,"event",{actor:2,method:"PATCH",params,body,key})).status,200);
  db.sqlite.exec("UPDATE user_capabilities SET revoked_at=1 WHERE user_id=2");
  assert.equal((await call(db,"event",{actor:2,method:"PATCH",params,body,key})).status,404);
  assert.equal(count(db),1);
  assert.equal(db.sqlite.prepare("SELECT revision FROM tournaments WHERE id=?").get(A).revision,2);
});
test("casual reset does not alter tournament records; rejected oversized requests do not write",async t=>{
  const db=setup(t);
  const before=db.sqlite.prepare("SELECT * FROM tournaments").all();
  await performCourtReset({DB:db},{date:"2026-01-01"});
  assert.deepEqual(db.sqlite.prepare("SELECT * FROM tournaments").all(),before);
  const response=await call(db,"list",{method:"POST",body:{title:"x".repeat(70000),timezone:"UTC"}});
  assert.equal(response.status,413);assert.equal(count(db),0);
});
test("fresh schema and additive upgrade are equivalent and preserve existing casual data",()=>{
  const full=readFileSync(new URL("../schema.sql",import.meta.url),"utf8");
  const legacy=full.split("-- Tournament Phase 1 foundation")[0];
  const upgrade=readFileSync(new URL("../migrate_009_tournament_foundation.sql",import.meta.url),"utf8");
  const a=new DatabaseSync(":memory:"),b=new DatabaseSync(":memory:");
  try{
    a.exec(full);b.exec(legacy);
    b.exec("INSERT INTO court_sessions(date,is_open) VALUES ('2026-01-01',1)");
    const courts=b.prepare("SELECT * FROM courts").all();
    b.exec(upgrade);
    const definitions=db=>db.prepare("SELECT name,type,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();
    assert.deepEqual(definitions(a),definitions(b));
    assert.deepEqual(b.prepare("SELECT * FROM courts").all(),courts);
    assert.equal(b.prepare("SELECT COUNT(*) AS n FROM court_sessions").get().n,1);
    assert.throws(()=>b.exec(upgrade),/already exists/);
    assert.throws(()=>b.exec("INSERT INTO tournament_staff VALUES ('missing',999,'organizer',999,0,NULL)"),/FOREIGN KEY/);
  }finally{a.close();b.close();}
});
