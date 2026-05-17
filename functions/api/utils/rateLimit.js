const rateLimitStore = new Map();

export function createRateLimiter(maxRequests = 5, windowMs = 60000) {
  return async function rateLimiter(request, env) {
    const ip = request.headers.get("CF-Connecting-IP") || 
               request.headers.get("X-Forwarded-For") || 
               "unknown";
    
    const now = Date.now();
    const key = `${ip}:${request.url}`;
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, {
        count: 0,
        resetTime: now + windowMs,
      });
    }
    
    const record = rateLimitStore.get(key);
    
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }
    
    record.count++;
    
    const remaining = Math.max(0, maxRequests - record.count);
    const resetTime = Math.ceil((record.resetTime - now) / 1000);
    
    if (record.count > maxRequests) {
      return {
        limited: true,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil(windowMs / 1000),
      };
    }
    
    return {
      limited: false,
      remaining,
      resetTime,
      retryAfter: 0,
    };
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

export function cleanupOldEntries() {
  const now = Date.now();
  const maxAge = 3600000;
  
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime + maxAge) {
      rateLimitStore.delete(key);
    }
  }
}

const authRateLimiter = createRateLimiter(5, 60000);
const loginRateLimiter = createRateLimiter(3, 300000);

export { authRateLimiter, loginRateLimiter };
