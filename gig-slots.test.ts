import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { openClipSlot } from "./gig-slots.ts";

describe("video slots", () => {
  it("gives the second clip its own slot while the first is occupied", () => {
    assert.equal(openClipSlot([]), 0);
    assert.equal(openClipSlot([0]), 1);
    assert.equal(openClipSlot([1]), 0);
    assert.equal(openClipSlot([0, 1]), -1);
  });
});
