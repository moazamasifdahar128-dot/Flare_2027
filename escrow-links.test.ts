import assert from "node:assert/strict";
import { test } from "node:test";
import { sellerSplit } from "./board-rules.ts";
import { deliveryLinkOk, demoLinkOk, lockHours } from "./escrow-links.ts";

test("escrow accepts the original file hosts and rejects anything else", () => {
  assert.equal(deliveryLinkOk("https://drive.google.com/file/d/xyz"), true);
  assert.equal(deliveryLinkOk("https://www.dropbox.com/s/abc"), true);
  assert.equal(deliveryLinkOk("https://wetransfer.com/downloads/1"), true);
  assert.equal(deliveryLinkOk("https://github.com/flare/app"), true);
  assert.equal(deliveryLinkOk("https://docs.google.com/document/d/1"), true);
  assert.equal(deliveryLinkOk("http://drive.google.com/file/d/xyz"), false);
  assert.equal(deliveryLinkOk("https://evil.com/drive.google.com"), false);
  assert.equal(demoLinkOk(""), true);
  assert.equal(demoLinkOk("https://myproject.vercel.app"), true);
  assert.equal(demoLinkOk("http://myproject.vercel.app"), false);
});

test("video locks in 24 hours, code in 48, and a $50 deal keeps 15 percent", () => {
  assert.equal(lockHours("video"), 24);
  assert.equal(lockHours("code"), 48);
  assert.deepEqual(sellerSplit(50), { fee: 7, payout: 43, rate: 15 });
});
