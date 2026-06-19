import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as startMatch } from "../functions/api/matches/start.js";
import { onRequestPost as autoAssign } from "../functions/api/matches/auto-assign.js";
import { MockD1Database } from "./helpers/mockDb.js";
import {
  createAuthenticatedRequest,
  TEST_JWT_SECRET,
} from "./helpers/auth.js";

const MATCH_BODY = {
  court_id: 1,
  team1_player1_id: 1,
  team1_player2_id: 2,
  team2_player1_id: 3,
  team2_player2_id: 4,
  game_type: "mens_double",
};

test("manual and automatic match creation reject a closed court", async () => {
  for (const [path, handler] of [
    ["/api/matches/start", startMatch],
    ["/api/matches/auto-assign", autoAssign],
  ]) {
    const database = new MockD1Database(({ sql }) => {
      if (sql.includes("FROM court_sessions")) return null;
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const request = await createAuthenticatedRequest(path, {
      role: "supervisor",
      body: MATCH_BODY,
    });

    const response = await handler({
      request,
      env: { DB: database, JWT_SECRET: TEST_JWT_SECRET },
    });

    assert.equal(response.status, 409);
    assert.equal(database.calls.length, 1);
  }
});

test("manual match creation guards the insert and mutates players only after court reservation", async () => {
  let matchInserted = false;
  let courtReserved = false;
  let queueDeletes = 0;
  const database = new MockD1Database(({ operation, sql, bindings }) => {
    if (sql.includes("FROM court_sessions") && operation === "first") {
      return { id: 10, date: "2026-06-19", is_open: 1 };
    }
    if (sql.startsWith("SELECT id, status FROM courts")) {
      return { id: 1, status: "available" };
    }
    if (sql.startsWith("SELECT id FROM users")) {
      return { results: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] };
    }
    if (sql.startsWith("INSERT INTO matches")) {
      assert.match(sql, /WHERE EXISTS/);
      assert.equal(bindings.at(-2), "2026-06-19");
      matchInserted = true;
      return { meta: { changes: 1, last_row_id: 100 } };
    }
    if (sql.startsWith("UPDATE courts SET status = 'occupied'")) {
      assert.equal(matchInserted, true);
      courtReserved = true;
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith("DELETE FROM queue")) {
      assert.equal(courtReserved, true);
      queueDeletes += 1;
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith("UPDATE check_ins")) {
      assert.equal(courtReserved, true);
      return { meta: { changes: 1 } };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const request = await createAuthenticatedRequest("/api/matches/start", {
    role: "supervisor",
    body: MATCH_BODY,
  });

  const response = await startMatch({
    request,
    env: { DB: database, JWT_SECRET: TEST_JWT_SECRET },
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.match_id, 100);
  assert.equal(queueDeletes, 4);
});
