import { verifyToken, parseAuthHeader, createErrorResponse } from "./jwt";

export async function authenticateRequest(request, env) {
  const authHeader = request.headers.get("Authorization");
  const token = parseAuthHeader(authHeader);
  
  if (!token) {
    return { 
      authenticated: false, 
      error: createErrorResponse("Authentication required", 401) 
    };
  }
  
  const jwtSecret = env.JWT_SECRET || "default-secret-change-in-production";
  const payload = await verifyToken(token, jwtSecret);
  
  if (!payload) {
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
