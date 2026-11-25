import test from "node:test";
import assert from "node:assert/strict";
import { createSqliteDb, seedPlayers } from "./helpers/sqliteDb.js";
import { createAuthenticatedRequest, TEST_JWT_SECRET } from "./helpers/auth.js";
import { onRequestPost as validate } from "../functions/api/auth/validate.js";
import { capabilities } from "../functions/api/utils/tournaments/policy.js";

test("session capabilities are additive, and revocation is reflected without changing primary roles",async t=>{
  const db=createSqliteDb();t.after(()=>db.sqlite.close());seedPlayers(db);
  db.sqlite.exec(`UPDATE users SET role='supervisor' WHERE id=1;
    INSERT INTO user_capabilities VALUES(1,'tournament_organizer',1,0,NULL,1)`);
  const request=()=>createAuthenticatedRequest("/api/auth/validate",{userId:1,role:"supervisor"});
  const response=await validate({request:await request(),env:{DB:db,JWT_SECRET:TEST_JWT_SECRET}});
  const data=await response.json();
  assert.equal(data.user.role,"supervisor");assert.deepEqual(data.user.capabilities,["tournament_organizer"]);
  db.sqlite.exec("UPDATE user_capabilities SET revoked_at=1 WHERE user_id=1");
  assert.deepEqual(await capabilities(db,1),[]);
  assert.equal(db.sqlite.prepare("SELECT role FROM users WHERE id=1").get().role,"supervisor");
});
test("missing additive migration yields no capability, but unrelated database errors are not suppressed",async()=>{
  const missing={prepare(){return {bind(){return {async all(){throw Error("D1_ERROR: no such table: user_capabilities");}};}};}};
  assert.deepEqual(await capabilities(missing,1),[]);
  const broken={prepare(){throw Error("Database offline");}};
  await assert.rejects(capabilities(broken,1),/Database offline/);
});
