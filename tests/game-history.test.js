import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as live } from "../functions/api/game-history/live.js";
import { onRequestGet as history } from "../functions/api/game-history/history.js";
import { onRequestGet as leaderboard } from "../functions/api/game-history/leaderboard.js";
import { createAuthenticatedRequest, TEST_JWT_SECRET } from "./helpers/auth.js";
import { createSqliteDb, seedMatch, seedPlayers } from "./helpers/sqliteDb.js";

async function request(handler, db, query = "", userId = 1) {
  const req = await createAuthenticatedRequest(`/api/game-history/test${query}`, { method: "GET", userId });
  const response = await handler({ request: req, env: { DB: db, JWT_SECRET: TEST_JWT_SECRET } });
  return { status: response.status, data: await response.json() };
}

test("all match-center endpoints require authentication before querying SQLite", async () => {
  for (const handler of [live, history, leaderboard]) {
    const response = await handler({ request: new Request("https://example.test"), env: { DB: null, JWT_SECRET: TEST_JWT_SECRET } });
    assert.equal(response.status, 401);
  }
});

test("live results include only active non-deleted matches and retain missing participant names", async (t) => {
  const db = createSqliteDb(); t.after(() => db.sqlite.close()); seedPlayers(db);
  seedMatch(db, { id: 1, players: [1, 2, 3, 99] });
  seedMatch(db, { id: 2, deleted: "2026-06-19" });
  seedMatch(db, { id: 3, ended: "2026-06-19 05:00:00", winner: 1, score: "11-4" });
  const { status, data } = await request(live, db);
  assert.equal(status, 200);
  assert.deepEqual(data.matches.map(match => match.id), [1]);
  assert.equal(data.matches[0].team2_player2_name, "Former player");
  assert.equal(data.matches[0].court_name, "Court 1");
});

test("history paginates deterministically and 'mine' uses the authenticated player ID", async (t) => {
  const db = createSqliteDb(); t.after(() => db.sqlite.close()); seedPlayers(db);
  seedMatch(db, { id: 1, ended: "2026-06-19 05:00:00", winner: 1, score: "11-4" });
  seedMatch(db, { id: 2, ended: "2026-06-19 05:00:00", players: [5, 6, 7, 8], winner: 2, score: "3-11" });
  seedMatch(db, { id: 3, ended: "2026-06-19 06:00:00", deleted: "2026-06-19" });
  seedMatch(db, { id: 4 });
  const first = await request(history, db, "?limit=1");
  assert.deepEqual(first.data.matches.map(match => match.id), [2]);
  assert.equal(first.data.has_more, true);
  assert.equal(first.data.next_offset, 1);
  const second = await request(history, db, "?limit=1&offset=1");
  assert.deepEqual(second.data.matches.map(match => match.id), [1]);
  assert.equal(second.data.has_more, false);
  const mine = await request(history, db, "?scope=mine&user_id=5");
  assert.deepEqual(mine.data.matches.map(match => match.id), [1]);
  assert.equal(mine.data.matches[0].score, "11-4");
});

test("history rejects invalid filters and pagination", async (t) => {
  const db = createSqliteDb(); t.after(() => db.sqlite.close());
  for (const query of ["?scope=other", "?limit=0", "?limit=101", "?limit=oops", "?offset=-1", "?offset=1.5"]) {
    assert.equal((await request(history, db, query)).status, 400, query);
  }
});

test("leaderboard derives points, draws, wins and losses from completed results instead of stale counters", async (t) => {
  const db = createSqliteDb(); t.after(() => db.sqlite.close()); seedPlayers(db);
  seedMatch(db, { id: 1, ended: "2026-06-19 05:00:00", winner: 1, score: "11-4" });
  seedMatch(db, { id: 2, ended: "2026-06-19 06:00:00", winner: 2, score: "5-11" });
  seedMatch(db, { id: 3, ended: "2026-06-19 07:00:00", score: "8-8" });
  seedMatch(db, { id: 4, ended: "2026-06-19 08:00:00", players: [1, 5, 3, 8], winner: 1, score: "11-3" });
  seedMatch(db, { id: 5, winner: 1 }); // ongoing: does not count
  seedMatch(db, { id: 6, ended: "2026-06-19 09:00:00", deleted: "2026-06-19", winner: 1 });
  const { status, data } = await request(leaderboard, db);
  assert.equal(status, 200);
  assert.equal(data.leaderboard[0].name, "Erin");
  assert.equal(data.leaderboard[0].rank, 1);
  const alice = data.leaderboard.find(player => player.id === 1);
  assert.equal(alice.total_matches, 4);
  assert.equal(alice.wins, 2);
  assert.equal(alice.losses, 1);
  assert.equal(alice.win_rate_percent, 50);
  assert.equal(alice.points, 4);
  assert.ok(!data.leaderboard.some(player => [6, 7].includes(player.id)));
});

test("recording a result moves a match from live to history and updates rankings", async (t) => {
  const db = createSqliteDb(); t.after(() => db.sqlite.close()); seedPlayers(db);
  seedMatch(db, { id: 1 });
  assert.equal((await request(live, db)).data.matches.length, 1);
  assert.equal((await request(leaderboard, db)).data.leaderboard.length, 0);
  db.sqlite.exec("UPDATE matches SET ended_at='2026-06-19 06:00:00',winner_team=1,score='11-4' WHERE id=1");
  assert.equal((await request(live, db)).data.matches.length, 0);
  assert.equal((await request(history, db)).data.matches[0].score, "11-4");
  const players = (await request(leaderboard, db)).data.leaderboard;
  assert.equal(players.find(player => player.id === 1).points, 2);
  assert.equal(players.find(player => player.id === 3).losses, 1);
});
