import test from "node:test";
import assert from "node:assert/strict";
import { authenticateRequest } from "../functions/api/utils/auth.js";
import { onRequestPost as login } from "../functions/api/auth/login.js";
import { onRequestGet as events } from "../functions/api/events/index.js";
import { generateToken, verifyToken } from "../functions/api/utils/jwt.js";
import bcrypt from "bcryptjs";
import { MockD1Database } from "./helpers/mockDb.js";
import {
  createAuthenticatedRequest,
  TEST_JWT_SECRET,
} from "./helpers/auth.js";

test("authentication accepts a valid JWT without logging its payload", async () => {
  const request = await createAuthenticatedRequest("/api/profile");
  const originalLog = console.log;
  const logCalls = [];
  console.log = (...args) => logCalls.push(args);

  try {
    const result = await authenticateRequest(request, {
      JWT_SECRET: TEST_JWT_SECRET,
    });

    assert.equal(result.authenticated, true);
    assert.equal(result.user.userId, 42);
    assert.equal(logCalls.length, 0);
  } finally {
    console.log = originalLog;
  }
});

test("API, login, and SSE fail closed when the JWT secret is absent or invalid", async () => {
  // This was previously a usable signing key whenever configuration was absent.
  const token = await generateToken(
    { userId: 1, role: "admin" },
    "development-secret-for-local-only-please-change",
  );
  for (const secret of [undefined, "", "short", " ".repeat(40), 123]) {
    const env = { JWT_SECRET: secret };
    const request = new Request("https://example.test/api/events", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal((await authenticateRequest(request, env)).error.status, 503);
    assert.equal((await events({ request, env })).status, 503);
    assert.equal((await login({ request, env })).status, 503);
  }
});

test("SSE rejects missing credentials, URL tokens, and invalid header credentials before opening a stream", async () => {
  const env = { JWT_SECRET: TEST_JWT_SECRET };
  const token = await generateToken({ userId: 42, role: "player" }, TEST_JWT_SECRET);
  for (const request of [
    new Request("https://example.test/api/events"),
    new Request(`https://example.test/api/events?token=${token}`),
    new Request("https://example.test/api/events", { headers: { Authorization: "Bearer invalid" } }),
  ]) {
    assert.equal((await events({ request, env })).status, 401);
  }
});

test("shared authentication rejects signed tokens without a valid identity and role", async () => {
  for (const claims of [{}, { userId: 0, role: "player" }, { userId: 42, role: "owner" }]) {
    const token = await generateToken(claims, TEST_JWT_SECRET);
    const request = new Request("https://example.test/api/profile", { headers: { Authorization: `Bearer ${token}` } });
    assert.equal((await authenticateRequest(request, { JWT_SECRET: TEST_JWT_SECRET })).error.status, 401);
  }
});

test("configured login checks bcrypt passwords and returns a usable signed session", async () => {
  const password = "TestPassword123";
  const hash = await bcrypt.hash(password, 4);
  const database = new MockD1Database(({ sql }) => {
    if (sql.includes("FROM user_capabilities")) return { results: [] };
    if (sql.startsWith("INSERT INTO rate_limits")) {
      return { request_count: 1, expires_at: Math.floor(Date.now() / 1000) + 60 };
    }
    if (sql.startsWith("DELETE FROM rate_limits")) return { meta: { changes: 0 } };
    if (sql.startsWith("SELECT * FROM users")) {
      return { id: 42, student_id: "student42", password: hash, name: "Nahid 李", role: "player", gender: "male", is_approved: true };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  for (const [suppliedPassword, expectedStatus] of [[password, 200], ["WrongPassword123", 401]]) {
    const request = new Request("https://example.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: "student42", password: suppliedPassword }),
    });
    const response = await login({ request, env: { JWT_SECRET: TEST_JWT_SECRET, DB: database } });
    assert.equal(response.status, expectedStatus);
    if (expectedStatus === 200) {
      const body = await response.json();
      const claims = await verifyToken(body.token, TEST_JWT_SECRET);
      assert.equal(claims.userId, 42);
      assert.equal(claims.name, "Nahid 李");
      assert.equal(body.user.password, undefined);
    }
  }
});
