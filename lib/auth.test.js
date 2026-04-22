import test from "node:test";
import assert from "node:assert/strict";
import {
  createPasswordHash,
  verifyPasswordHash,
  createSessionToken,
  verifySessionToken,
} from "./auth.js";

test("password hash verifies the correct password", () => {
  const hash = createPasswordHash("cat-lover-123");

  assert.equal(verifyPasswordHash("cat-lover-123", hash), true);
  assert.equal(verifyPasswordHash("wrong-password", hash), false);
});

test("session token verifies and preserves payload fields", () => {
  const token = createSessionToken(
    { userId: "user-123", email: "admin@example.com", isAdmin: true, isApproved: true },
    "test-secret",
    60
  );

  const payload = verifySessionToken(token, "test-secret");

  assert.ok(payload);
  assert.equal(payload.userId, "user-123");
  assert.equal(payload.email, "admin@example.com");
  assert.equal(payload.isAdmin, true);
  assert.equal(payload.isApproved, true);
});

test("session token rejects an expired payload", () => {
  const token = createSessionToken(
    { userId: "user-123", email: "admin@example.com", isAdmin: true, isApproved: true },
    "test-secret",
    -1
  );

  assert.equal(verifySessionToken(token, "test-secret"), null);
});
