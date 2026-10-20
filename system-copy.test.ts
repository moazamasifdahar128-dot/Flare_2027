import assert from "node:assert/strict";
import test from "node:test";
import { WELCOME, dayLabel, tickRemovedLow, viewsAlert } from "./system-copy.ts";

test("welcome stays the short three-part note", () => {
  assert.match(WELCOME, /^👋 Welcome to Flare!/);
  assert.match(WELCOME, /Offer a Service/);
  assert.match(WELCOME, /Start exploring!/);
  assert.equal(WELCOME.includes("bullet"), false);
});

test("day labels stay calendar dates", () => {
  assert.equal(dayLabel("2026-10-15T00:00:00.000Z"), "15 October 2026");
});

test("view notes keep the tick until a gig delete", () => {
  assert.match(viewsAlert(4500), /4,500/);
  assert.match(viewsAlert(4500), /never auto-removes/);
  assert.equal(viewsAlert(4500).includes("10,000"), false);
  assert.match(tickRemovedLow(1999), /1,999/);
  assert.match(tickRemovedLow(1999), /under 2,000/);
  assert.match(tickRemovedLow(1999), /\$2\.50/);
});
