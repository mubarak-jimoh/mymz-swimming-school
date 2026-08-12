import test from "node:test";
import assert from "node:assert/strict";
import { turnstileConfiguration, validTurnstileToken } from "../lib/security/turnstile-core.ts";

test("Turnstile explicitly bypasses missing keys only outside production", () => {
  assert.deepEqual(turnstileConfiguration("development", "", ""), { configured: false, allowMissing: true });
  assert.deepEqual(turnstileConfiguration("production", "", ""), { configured: false, allowMissing: false });
  assert.deepEqual(turnstileConfiguration("production", "site", "secret"), { configured: true, allowMissing: false });
});

test("Turnstile configured mode requires a bounded non-empty token", () => {
  assert.equal(validTurnstileToken("token"), true);
  assert.equal(validTurnstileToken(""), false);
  assert.equal(validTurnstileToken("x".repeat(2049)), false);
});
