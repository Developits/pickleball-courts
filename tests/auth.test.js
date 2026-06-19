import test from "node:test";
import assert from "node:assert/strict";
import { authenticateRequest } from "../functions/api/utils/auth.js";
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
