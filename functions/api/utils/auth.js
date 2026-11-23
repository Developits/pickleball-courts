import { verifyToken, parseAuthHeader, createErrorResponse } from "./jwt.js";

export function getJwtSecret(env) {
  const secret = env.JWT_SECRET;
  return typeof secret === "string" && secret.trim().length >= 32 ? secret : null;
}

export async function authenticateRequest(request, env) {
  const authHeader = request.headers.get("Authorization");
  const token = parseAuthHeader(authHeader);

  if (!token) {
    return { 
      authenticated: false, 
      error: createErrorResponse("Authentication required", 401) 
    };
  }
  
  const jwtSecret = getJwtSecret(env);
  if (!jwtSecret) {
    return {
      authenticated: false,
      error: createErrorResponse("Authentication is not configured", 503),
    };
  }
  const payload = await verifyToken(token, jwtSecret);

  if (!payload || !Number.isSafeInteger(payload.userId) || payload.userId < 1
      || !["player", "supervisor", "admin"].includes(payload.role)) {
    return { 
      authenticated: false, 
      error: createErrorResponse("Invalid or expired token", 401) 
    };
  }
  
  return {
    authenticated: true,
    user: payload,
  };
}

export function requireRole(...allowedRoles) {
  return async (request, env) => {
    const authResult = await authenticateRequest(request, env);
    
    if (!authResult.authenticated) {
      return authResult;
    }
    
    if (!allowedRoles.includes(authResult.user.role)) {
      return {
        authenticated: false,
        error: createErrorResponse("Insufficient permissions", 403),
      };
    }
    
    return authResult;
  };
}

export async function adminOnly(request, env) {
  return requireRole("admin")(request, env);
}

export async function supervisorOrAdmin(request, env) {
  return requireRole("supervisor", "admin")(request, env);
}

export async function anyAuthenticated(request, env) {
  return authenticateRequest(request, env);
}
