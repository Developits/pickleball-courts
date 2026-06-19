import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRateLimit,
  createRateLimiter,
} from "../functions/api/utils/rateLimit.js";
import { MockD1Database } from "./helpers/mockDb.js";

function createRateLimitDatabase() {
  const records = new Map();

  return new MockD1Database(({ operation, sql, bindings }) => {
    if (sql.startsWith("INSERT INTO rate_limits")) {
      assert.equal(operation, "first");
      const [key, nowSeconds, expiresAt] = bindings;
      const existing = records.get(key);
      const record =
        !existing || existing.expires_at <= nowSeconds
          ? {
              request_count: 1,
              window_started_at: nowSeconds,
              expires_at: expiresAt,
            }
          : {
              ...existing,
              request_count: existing.request_count + 1,
            };
      records.set(key, record);
      return {
        request_count: record.request_count,
        expires_at: record.expires_at,
      };
    }

    if (sql.startsWith("DELETE FROM rate_limits")) {
      const [nowSeconds] = bindings;
      for (const [key, record] of records) {
        if (record.expires_at <= nowSeconds) records.delete(key);
      }
      return { meta: { changes: 0 } };
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  });
}

test("rate-limit counts persist across limiter instances", async () => {
  const database = createRateLimitDatabase();
  const request = new Request("https://example.test/api/auth/login", {
    headers: { "CF-Connecting-IP": "203.0.113.10" },
  });
  const firstInstance = createRateLimiter(2, 60_000, "test:login");
  const replacementInstance = createRateLimiter(2, 60_000, "test:login");

  assert.equal((await firstInstance(request, { DB: database })).limited, false);
  assert.equal(
    (await replacementInstance(request, { DB: database })).limited,
    false,
  );
  assert.equal(
    (await replacementInstance(request, { DB: database })).limited,
    true,
  );
});

test("generic API limiter returns a 429 response after the limit", async () => {
  const database = createRateLimitDatabase();
  const request = new Request("https://example.test/api/queue", {
    headers: { "CF-Connecting-IP": "203.0.113.20" },
  });

  assert.equal(
    (await applyRateLimit(request, { DB: database }, { key: "queue", max: 1 }))
      .error,
    null,
  );

  const result = await applyRateLimit(request, { DB: database }, {
    key: "queue",
    max: 1,
  });
  assert.equal(result.error.status, 429);
  assert.ok(Number(result.error.headers.get("Retry-After")) > 0);
});
