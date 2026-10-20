import assert from "node:assert/strict";
import { test } from "node:test";
import { formatTimeAgo, shouldHideForReports } from "./time-ago.ts";

const base = Date.parse("2026-10-12T12:00:00Z");

test("new listings read Just now, then seconds", () => {
  assert.equal(formatTimeAgo(new Date(base - 3_000).toISOString(), base), "Just now");
  assert.equal(formatTimeAgo(new Date(base - 5_000).toISOString(), base), "5s ago");
  assert.equal(formatTimeAgo(new Date(base - 30_000).toISOString(), base), "30s ago");
});

test("minutes, hours, days, weeks, and months", () => {
  assert.equal(formatTimeAgo(new Date(base - 60_000).toISOString(), base), "1m ago");
  assert.equal(formatTimeAgo(new Date(base - 59 * 60_000).toISOString(), base), "59m ago");
  assert.equal(formatTimeAgo(new Date(base - 3_600_000).toISOString(), base), "1h ago");
  assert.equal(formatTimeAgo(new Date(base - 23 * 3_600_000).toISOString(), base), "23h ago");
  assert.equal(formatTimeAgo(new Date(base - 86_400_000).toISOString(), base), "1d ago");
  assert.equal(formatTimeAgo(new Date(base - 6 * 86_400_000).toISOString(), base), "6d ago");
  assert.equal(formatTimeAgo(new Date(base - 7 * 86_400_000).toISOString(), base), "1w ago");
  assert.equal(formatTimeAgo(new Date(base - 21 * 86_400_000).toISOString(), base), "3w ago");
  assert.equal(formatTimeAgo(new Date(base - 30 * 86_400_000).toISOString(), base), "1mo ago");
  assert.equal(formatTimeAgo(new Date(base - 60 * 86_400_000).toISOString(), base), "2mo ago");
  assert.equal(formatTimeAgo(new Date(base - 370 * 86_400_000).toISOString(), base), "1y ago");
});

test("five distinct reports hide a listing", () => {
  assert.equal(shouldHideForReports(4), false);
  assert.equal(shouldHideForReports(5), true);
});
