const encoder = new TextEncoder();

function getClientIp(request) {
  const forwardedFor = request.headers.get("X-Forwarded-For");
  return (
    request.headers.get("CF-Connecting-IP") ||
    forwardedFor?.split(",")[0]?.trim() ||
    "unknown"
  );
}

async function hashRateLimitKey(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function cleanupExpiredRateLimits(env, nowSeconds) {
  await env.DB.prepare(`DELETE FROM rate_limits WHERE expires_at <= ?`)
    .bind(nowSeconds)
    .run();
}

async function consumeRateLimit(request, env, options) {
  const { key, max, windowSeconds } = options;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = nowSeconds + windowSeconds;
  const clientIp = getClientIp(request);
  const storageKey = await hashRateLimitKey(`${key}:${clientIp}`);

  const record = await env.DB.prepare(`
    INSERT INTO rate_limits (
      key,
      request_count,
      window_started_at,
      expires_at
    ) VALUES (?, 1, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      request_count = CASE
        WHEN rate_limits.expires_at <= excluded.window_started_at THEN 1
        ELSE rate_limits.request_count + 1
      END,
      window_started_at = CASE
        WHEN rate_limits.expires_at <= excluded.window_started_at
          THEN excluded.window_started_at
        ELSE rate_limits.window_started_at
      END,
      expires_at = CASE
        WHEN rate_limits.expires_at <= excluded.window_started_at
          THEN excluded.expires_at
        ELSE rate_limits.expires_at
      END
    RETURNING request_count, expires_at
  `)
    .bind(storageKey, nowSeconds, expiresAt)
    .first();

  if (!record) {
    throw new Error("Rate limit storage did not return a result");
  }

  const requestCount = Number(record.request_count);
  const resetTime = Math.max(0, Number(record.expires_at) - nowSeconds);

  if (requestCount === 1) {
    await cleanupExpiredRateLimits(env, nowSeconds);
  }

  return {
    limited: requestCount > max,
    remaining: Math.max(0, max - requestCount),
    resetTime,
    retryAfter: resetTime,
  };
}

export function createRateLimiter(
  maxRequests = 5,
  windowMs = 60000,
  key = "request",
) {
  return async function rateLimiter(request, env) {
    return consumeRateLimit(request, env, {
      key,
      max: maxRequests,
      windowSeconds: Math.ceil(windowMs / 1000),
    });
  };
}

export async function applyRateLimit(request, env, options = {}) {
  const { key = "default", max = 10, windowSeconds = 60 } = options;
  const result = await consumeRateLimit(request, env, {
    key,
    max,
    windowSeconds,
  });

  if (!result.limited) {
    return { error: null };
  }

  return {
    error: new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": result.retryAfter.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.resetTime.toString(),
        },
      },
    ),
  };
}

export function getRateLimitHeaders(result) {
  const headers = new Headers();
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", result.resetTime.toString());

  if (result.limited) {
    headers.set("Retry-After", result.retryAfter.toString());
  }

  return headers;
}

const authRateLimiter = createRateLimiter(5, 60000, "auth:register");
const loginRateLimiter = createRateLimiter(3, 300000, "auth:login");

export { authRateLimiter, loginRateLimiter };
