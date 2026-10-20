import assert from "node:assert/strict";
import test from "node:test";
import { TICK_USD, pkrForUsd } from "./money.ts";
import { nextTick, tickOpacity } from "./tick.ts";

test("a granted tick stays even when views fall", () => {
  assert.equal(nextTick("active", 9000, 0), "active");
  assert.equal(nextTick("active", 5000, 0), "active");
  assert.equal(nextTick("active", 4500, 2), "active");
  assert.equal(nextTick("active", 4500, 31), "active");
  assert.equal(nextTick("active", 1999, 0), "active");
  assert.equal(nextTick("faded", 1999, 40), "active");
  assert.equal(nextTick("none", 9000, 0), "none");
  assert.equal(tickOpacity(9000), 1);
  assert.equal(tickOpacity(5000), 1);
  assert.equal(tickOpacity(4500), 0.9);
  assert.equal(tickOpacity(2500), 0.5);
  assert.equal(tickOpacity(1000), 0.2);
  assert.equal(TICK_USD, 2.5);
  assert.equal(pkrForUsd(TICK_USD), 725);
});
