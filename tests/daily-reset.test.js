import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as dailyReset } from "../functions/api/admin/daily-reset.js";
import { MockD1Database } from "./helpers/mockDb.js";
import {
  createAuthenticatedRequest,
  TEST_JWT_SECRET,
} from "./helpers/auth.js";

test("daily reset executes one session-first transactional batch", async () => {
  const database = new MockD1Database(({ operation, statements }) => {
    assert.equal(operation, "batch");
    assert.equal(statements.length, 7);
    assert.match(statements[0].sql, /^UPDATE court_sessions/);
    assert.equal(statements[0].bindings[0], 42);
    assert.match(statements[0].bindings[1], /^\d{4}-\d{2}-\d{2}$/);
    assert.match(
      statements[1].sql,
      /^DELETE FROM matches WHERE ended_at IS NULL$/,
    );
    assert.equal(
      statements[2].sql,
      "UPDATE users SET total_matches_today = 0",
    );
    assert.doesNotMatch(statements[2].sql, /total_matches\s*=/);
    assert.match(statements[4].sql, /reserved_for = NULL/);
    assert.match(statements[4].sql, /current_match_id = NULL/);
    return statements.map(() => ({ meta: { changes: 1 } }));
  });
  const request = await createAuthenticatedRequest("/api/admin/daily-reset", {
    role: "admin",
  });

  const response = await dailyReset({
    request,
    env: { DB: database, JWT_SECRET: TEST_JWT_SECRET },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.is_open, false);
  assert.equal(database.calls.length, 1);
});

test("daily reset reports failure when the transaction fails", async () => {
  const database = new MockD1Database(({ operation }) => {
    assert.equal(operation, "batch");
    throw new Error("Simulated batch failure");
  });
  const request = await createAuthenticatedRequest("/api/admin/daily-reset", {
    role: "admin",
  });
  const originalError = console.error;
  console.error = () => {};

  try {
    const response = await dailyReset({
      request,
      env: { DB: database, JWT_SECRET: TEST_JWT_SECRET },
    });
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.equal(body.error, "Failed to perform daily reset");
    assert.equal(database.calls.length, 1);
  } finally {
    console.error = originalError;
  }
});
