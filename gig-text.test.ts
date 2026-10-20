import assert from "node:assert/strict";
import { test } from "node:test";
import { containsContactInfo, fakeBadge, leakHits, trimWords, whatsappOk, wordCount } from "./gig-text.ts";

test("ordinary writing passes and real numbers or links do not", () => {
  assert.equal(containsContactInfo("MESSAGE 10 - PROFESSIONAL UX FIX"), false);
  assert.equal(containsContactInfo("582535"), false);
  assert.equal(containsContactInfo("I will make YouTube thumbnail"), false);
  assert.equal(containsContactInfo("I am Facebook ads expert"), false);
  assert.equal(containsContactInfo("WhatsApp button feature"), false);
  assert.equal(containsContactInfo("03001234567"), true);
  assert.equal(containsContactInfo("+49 151 12345678"), true);
  assert.equal(containsContactInfo("https://youtube.com/xyz"), true);
  assert.equal(containsContactInfo("WhatsApp 03001234567"), true);
  const marked = leakHits("WhatsApp 03001234567").map((hit) => hit.value);
  assert.ok(marked.some((item) => item.includes("03001234567")));
  assert.equal(marked.some((item) => /whatsapp/i.test(item)), false);
});

test("the seller number field accepts any country from 7 to 15 digits", () => {
  assert.equal(whatsappOk("03001234567"), true);
  assert.equal(whatsappOk("+49 151 12345678"), true);
  assert.equal(whatsappOk("+44 7700 900000"), true);
  assert.equal(whatsappOk("+1 2025550123"), true);
  assert.equal(whatsappOk("582535"), false);
});

test("word trim stops at the cap", () => {
  const words = Array.from({ length: 405 }, (_, i) => `w${i}`).join(" ");
  assert.equal(wordCount(trimWords(words, 400)), 400);
  assert.equal("x".repeat(100).slice(0, 80).length, 80);
});

test("a pasted tick cannot become a username", () => {
  assert.equal(fakeBadge("Ali✅"), true);
  assert.equal(fakeBadge("Zain✔️"), true);
  assert.equal(fakeBadge("blue tick"), true);
  assert.equal(fakeBadge("verified"), true);
  assert.equal(fakeBadge("zain_dahar"), false);
});
