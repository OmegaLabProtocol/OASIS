import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_REPORT_BODY_BYTES,
  isValidReportPayload,
  resolveReportAccess,
  validateReportBody,
} from "./access.ts";

/**
 * Focused Phase-1 tests for the report endpoint's access control and input
 * validation. These exercise the pure logic that the route handler delegates to
 * (session resolution itself is thin cookie-reading glue around these checks).
 *
 * Run with: `npm test` (Node's built-in test runner, no extra dependencies).
 */

function validPayload() {
  return {
    metrics: { symbol: "ETH", oriScore: 82 },
    raw: { symbol: "ETH" },
    components: { liquidityStability: 80 },
  };
}

// --- Access control -------------------------------------------------------

test("unauthenticated request is denied", () => {
  assert.equal(
    resolveReportAccess({ isAdmin: false, hasBeta: false, hasInvestor: false }),
    false
  );
});

test("expired / invalid session (all flags false) is denied", () => {
  // getBetaSession / getInvestorSession / getCurrentAdmin all return null for
  // expired or tampered cookies, which maps to all-false flags.
  assert.equal(
    resolveReportAccess({ isAdmin: false, hasBeta: false, hasInvestor: false }),
    false
  );
});

test("valid beta session is allowed", () => {
  assert.equal(
    resolveReportAccess({ isAdmin: false, hasBeta: true, hasInvestor: false }),
    true
  );
});

test("valid investor-preview session is allowed", () => {
  assert.equal(
    resolveReportAccess({ isAdmin: false, hasBeta: false, hasInvestor: true }),
    true
  );
});

test("authorized admin is allowed", () => {
  assert.equal(
    resolveReportAccess({ isAdmin: true, hasBeta: false, hasInvestor: false }),
    true
  );
});

// --- Body validation ------------------------------------------------------

test("valid payload passes validation", () => {
  const result = validateReportBody(JSON.stringify(validPayload()));
  assert.equal(result.ok, true);
});

test("malformed JSON is rejected with 400", () => {
  const result = validateReportBody("{ not json");
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.status, 400);
});

test("payload missing numeric oriScore is rejected with 400", () => {
  const bad = validPayload();
  // @ts-expect-error intentionally invalid for the test
  bad.metrics.oriScore = null;
  const result = validateReportBody(JSON.stringify(bad));
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.status, 400);
});

test("payload missing required fields is rejected", () => {
  assert.equal(isValidReportPayload({}), false);
  assert.equal(isValidReportPayload(null), false);
  assert.equal(isValidReportPayload({ metrics: { symbol: "X" } }), false);
});

test("oversized body is rejected with 413", () => {
  const huge = validPayload() as Record<string, unknown>;
  huge.filler = "x".repeat(MAX_REPORT_BODY_BYTES + 100);
  const result = validateReportBody(JSON.stringify(huge));
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.status, 413);
});

test("symbol exceeding max length is rejected", () => {
  const bad = validPayload();
  bad.metrics.symbol = "A".repeat(65);
  assert.equal(isValidReportPayload(bad), false);
});
