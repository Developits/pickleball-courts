import { generateToken } from "../../functions/api/utils/jwt.js";

export const TEST_JWT_SECRET = "test-secret-that-is-long-enough-for-local-tests";

export async function createAuthenticatedRequest(
  path,
  {
    method = "POST",
    body,
    userId = 42,
    role = "player",
    studentId = "student42",
    name = "Test Player",
  } = {},
) {
  const token = await generateToken(
    { userId, role, studentId, name },
    TEST_JWT_SECRET,
    3600,
  );
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return new Request(`https://example.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
