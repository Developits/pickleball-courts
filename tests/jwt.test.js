import test from "node:test";
import assert from "node:assert/strict";
import { generateToken, verifyToken } from "../functions/api/utils/jwt.js";
import { TEST_JWT_SECRET } from "./helpers/auth.js";

// Independent signer lets tests exercise malformed claims without relying on
// generateToken to construct the exact input verifyToken is expected to reject.
async function signClaims(claims, header = { alg: "HS256", typ: "JWT" }) {
  const data = [header, claims].map((value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url"),
  ).join(".");
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(TEST_JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${Buffer.from(signature).toString("base64url")}`;
}

test("JWT round-trips UTF-8 names and rejects a different signing secret", async () => {
  const token = await generateToken({ userId: 42, role: "player", name: "Nahid 李 🏓" }, TEST_JWT_SECRET);
  const payload = await verifyToken(token, TEST_JWT_SECRET);
  assert.equal(payload.name, "Nahid 李 🏓");
  assert.equal(await verifyToken(token, `${TEST_JWT_SECRET}-different`), null);
});

test("JWT rejects missing, invalid, and expired expiration claims at the exact boundary", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-06-19T04:00:00Z") });
  const now = Math.floor(Date.now() / 1000);
  for (const exp of [undefined, null, false, "9999999999", now - 1, now, 1.5]) {
    const token = await signClaims({ userId: 42, role: "player", exp });
    assert.equal(await verifyToken(token, TEST_JWT_SECRET), null, `exp=${exp}`);
  }
  const valid = await signClaims({ userId: 42, role: "player", exp: now + 1 });
  assert.ok(await verifyToken(valid, TEST_JWT_SECRET));
  t.mock.timers.tick(1000);
  assert.equal(await verifyToken(valid, TEST_JWT_SECRET), null);
});

test("JWT validates the declared algorithm and not-before claim", async () => {
  const now = Math.floor(Date.now() / 1000);
  const claims = { userId: 42, role: "player", exp: now + 3600 };
  for (const header of [{ alg: "none", typ: "JWT" }, { alg: "HS512", typ: "JWT" }]) {
    assert.equal(await verifyToken(await signClaims(claims, header), TEST_JWT_SECRET), null);
  }
  for (const nbf of [now + 3600, "0", null]) {
    assert.equal(await verifyToken(await signClaims({ ...claims, nbf }), TEST_JWT_SECRET), null);
  }
});

test("JWT rejects tampered and malformed input without logging it", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const token = await generateToken({ userId: 42, role: "player" }, TEST_JWT_SECRET);
  const [header, , signature] = token.split(".");
  const changed = Buffer.from(JSON.stringify({ userId: 1, role: "admin", exp: 9999999999 })).toString("base64url");
  for (const invalid of [null, "", "a.b.c", `${header}.${changed}.${signature}`, "x".repeat(16385)]) {
    assert.equal(await verifyToken(invalid, TEST_JWT_SECRET), null);
  }
  assert.equal(log.mock.callCount(), 0);
});
