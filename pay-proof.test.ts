import assert from "node:assert/strict";
import test from "node:test";
import {
  ERR_CARD,
  ERR_CARD_LOW,
  ERR_LOW,
  ERR_MISSING,
  ERR_NAME,
  ERR_NUMBER,
  ERR_PIN,
  ERR_PIN_WRONG,
  assertBoostProof,
  balanceError,
  cardError,
  founderAccountAttached,
  holderError,
  normalizePayMethod,
  pinError,
  routeHint,
  senderNumberError,
} from "./pay-proof.ts";

test("founder account gate is empty-string safe", () => {
  assert.equal(founderAccountAttached(""), false);
  assert.equal(founderAccountAttached("   "), false);
  assert.equal(founderAccountAttached("payee-1"), true);
});

test("name and wallet rules", () => {
  assert.equal(holderError("Al"), ERR_NAME);
  assert.equal(holderError("Ali"), "");
  assert.equal(senderNumberError("12345"), ERR_NUMBER);
  assert.equal(senderNumberError("0300123456"), ERR_NUMBER);
  assert.equal(senderNumberError("03111111111"), ERR_MISSING);
  assert.equal(senderNumberError("03000000000"), ERR_MISSING);
  assert.equal(senderNumberError("03030303030"), ERR_MISSING);
  assert.equal(senderNumberError("03001234567"), "");
});

test("empty wallet simulation does not pass a boost", () => {
  assert.equal(balanceError("03001234000".slice(0, 11), 580), "");
  assert.equal(balanceError("03019870000", 580), ERR_LOW);
  assert.equal(balanceError("03001234567", 5800), "");
});

test("direct pay uses a test PIN or card, not a screenshot", () => {
  assert.equal(holderError(""), "");
  assert.equal(pinError("1234", 580), ERR_PIN);
  assert.equal(pinError("00000", 580), ERR_PIN_WRONG);
  assert.match(pinError("11111", 580), /Insufficient balance/);
  assert.equal(pinError("13579", 580), "");
  assert.equal(cardError({ number: "4242424242424242", expiry: "12/30", cvv: "123", name: "Ali Khan" }), "");
  assert.equal(cardError({ number: "4000000000000002", expiry: "12/30", cvv: "123", name: "Ali Khan" }), ERR_CARD_LOW);
  assert.equal(cardError({ number: "1234", expiry: "12/30", cvv: "123", name: "Ali Khan" }), ERR_CARD);
  assert.throws(() => assertBoostProof({ payer: "", method: "easypaisa", pin: "13579", kind: "day", founderAccount: "" }), /BOOST_OFF/);
  assert.throws(() => assertBoostProof({ payer: "A", method: "easypaisa", pin: "13579", kind: "day", founderAccount: "hidden" }), /BOOST_NAME/);
  const open = assertBoostProof({ payer: "", method: "easypaisa", pin: "13579", kind: "day", founderAccount: "hidden" });
  assert.equal(open.pkr, 580);
  assert.equal(open.shot, "");
  assert.throws(() => assertBoostProof({ payer: "", method: "easypaisa", pin: "12", kind: "day", founderAccount: "hidden" }), /PIN_BAD/);
  assert.throws(() => assertBoostProof({ payer: "", method: "card", last4: "0002", kind: "day", founderAccount: "hidden" }), /CARD_LOW/);
  const row = assertBoostProof({ payer: "Ali Khan", method: "card", last4: "4242", kind: "day", founderAccount: "hidden-number" });
  assert.equal(row.amount, "580 PKR");
  assert.equal(JSON.stringify(row).includes("hidden-number"), false);
  assert.equal(normalizePayMethod("sadapay"), "easypaisa");
  assert.equal(normalizePayMethod("JazzCash"), "jazzcash");
  assert.equal(normalizePayMethod("visa"), "card");
  const wrong = () => assertBoostProof({ payer: "", method: "easypaisa", pin: "00000", kind: "day", founderAccount: "attached", openMethods: ["easypaisa"] });
  assert.throws(wrong, /PIN_WRONG/);
  assert.throws(() => assertBoostProof({ payer: "", method: "easypaisa", pin: "11111", kind: "day", founderAccount: "attached", openMethods: ["easypaisa"] }), /PIN_LOW/);
  assert.throws(() => assertBoostProof({ payer: "", method: "jazzcash", pin: "13579", kind: "day", founderAccount: "attached", openMethods: ["easypaisa", "card"] }), /BOOST_OFF/);
  const visa = assertBoostProof({ payer: "", method: "card", last4: "4242", kind: "day", founderAccount: "attached", openMethods: ["easypaisa", "card"] });
  assert.equal(visa.method, "card");
  assert.equal(visa.shot, "");
  const easyHint = routeHint("easypaisa", "03436588407");
  assert.match(easyHint, /^Routed to Founder Easypaisa 0343x+$/);
  assert.equal(easyHint.includes("03436588407"), false);
  const cardHint = routeHint("card", "moazam@wise.com");
  assert.match(cardHint, /^Routed to Founder Payoneer\/Wise /);
  assert.equal(cardHint.includes("moazam@"), false);
  assert.equal(routeHint("card", ""), "Routed to Founder Payoneer/Wise");
});
