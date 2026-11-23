import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet } from "../functions/api/events/index.js";
import { generateToken } from "../functions/api/utils/jwt.js";
import { TEST_JWT_SECRET } from "./helpers/auth.js";

async function openStream(database, signal, expiresIn = 3600) {
  const token = await generateToken({ userId: 42, role: "player" }, TEST_JWT_SECRET, expiresIn);
  return onRequestGet({
    request: new Request("https://example.test/api/events", { headers: { Authorization: `Bearer ${token}` }, signal }),
    env: { JWT_SECRET: TEST_JWT_SECRET, DB: database },
  });
}

test("SSE authenticates, sends a handshake and snapshot, then stops polling on cancellation", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  let queries = 0;
  const database = { prepare() { return { async all() { queries++; return { results: [] }; } }; } };
  const response = await openStream(database);
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: connected/);
  t.mock.timers.tick(2000);
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: update/);
  assert.equal(queries, 4);
  await reader.cancel();
  t.mock.timers.tick(10000);
  assert.equal(queries, 4);
});

test("SSE stops on request abort and on token expiration", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"], now: new Date("2026-06-19T04:00:00Z") });
  for (const mode of ["abort", "expire"]) {
    const controller = new AbortController();
    const response = await openStream({}, controller.signal, 1);
    const reader = response.body.getReader();
    await reader.read();
    if (mode === "abort") controller.abort();
    else t.mock.timers.tick(2000);
    assert.equal((await reader.read()).done, true);
  }
});

test("SSE ignores completion of an in-flight poll after response cancellation", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let queries = 0;
  const database = { prepare() { return { async all() { queries++; await pending; return { results: [] }; } }; } };
  const response = await openStream(database);
  const reader = response.body.getReader();
  await reader.read();
  t.mock.timers.tick(6000);
  assert.equal(queries, 1, "slow polls must not overlap");
  await reader.cancel();
  release();
  // Drain the sequential async database reads from the canceled poll.
  for (let i = 0; i < 10; i++) await Promise.resolve();
  t.mock.timers.tick(10000);
  assert.equal(queries, 4);
});
