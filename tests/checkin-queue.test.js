import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as validateQr } from "../functions/api/qr/validate.js";
import { onRequestPost as joinQueue } from "../functions/api/queue/join.js";
import { MockD1Database } from "./helpers/mockDb.js";
import {
  createAuthenticatedRequest,
  TEST_JWT_SECRET,
} from "./helpers/auth.js";

test("QR check-in uses the authenticated JWT user ID", async () => {
  let insertedUserId = null;
  const database = new MockD1Database(({ operation, sql, bindings }) => {
    if (sql.includes("FROM court_sessions")) {
      return { id: 1 };
    }
    if (sql.includes("FROM qr_tokens qt")) {
      return {
        id: 8,
        supervisor_id: 7,
        supervisor_name: "Supervisor",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      };
    }
    if (sql.includes("FROM check_ins") && operation === "first") {
      return null;
    }
    if (sql.includes("FROM users WHERE id = ?")) {
      assert.equal(bindings[0], 42);
      return {
        id: 42,
        name: "Test Player",
        student_id: "student42",
        is_approved: 1,
        banned_until: null,
      };
    }
    if (sql.startsWith("INSERT INTO check_ins")) {
      insertedUserId = bindings[0];
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith("DELETE FROM qr_tokens")) {
      return { meta: { changes: 1 } };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const request = await createAuthenticatedRequest("/api/qr/validate", {
    body: { token: "valid-token", user_id: 999 },
  });

  const response = await validateQr({
    request,
    env: { DB: database, JWT_SECRET: TEST_JWT_SECRET },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(insertedUserId, 42);
  assert.equal(body.user.id, 42);
});

test("queue join is rejected before mutation when the court is closed", async () => {
  const database = new MockD1Database(({ sql }) => {
    if (sql.includes("FROM court_sessions")) return null;
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const request = await createAuthenticatedRequest("/api/queue/join", {
    body: { game_preference: "any" },
  });

  const response = await joinQueue({
    request,
    env: { DB: database, JWT_SECRET: TEST_JWT_SECRET },
  });

  assert.equal(response.status, 400);
  assert.equal(database.calls.length, 1);
});
