import { useEffect, useState } from "react";
import { boostPayGate, requestGigBoost } from "@/lib/shola/gigs";
import { requestJobBoost } from "@/lib/shola/board";
import { boostUsd, pkrForUsd } from "@/lib/shola/money";
import { BOOST_OFF_COPY, ERR_CARD, ERR_CARD_LOW, ERR_NAME, ERR_PIN, ERR_PIN_WRONG, boostAmounts, cardError, holderError, pinError } from "@/lib/shola/pay-proof";
import { boostLeft } from "@/lib/shola/time-ago";

export const BOOSTS = [
  { id: "day" as const, title: "24 Hours", line: "Pinned 1 day" },
  { id: "week" as const, title: "1 Week", line: "Pinned 7 days", popular: true },
  { id: "month" as const, title: "1 Month", line: "Pinned 30 days" },
];

export const PAY_METHODS = [
  ["easypaisa", "Easypaisa"],
  ["jazzcash", "JazzCash"],
  ["card", "Visa / MasterCard"],
] as const;

export type PayMethod = (typeof PAY_METHODS)[number][0];

export function boostOn(until?: string | null, now = Date.now()) {
  return Boolean(boostLeft(until, now));
}

export function BoostMark({ until }: { until?: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);
  const left = boostLeft(until, now);
  if (!left) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
      <span className="boost-rocket" aria-hidden="true">🚀🔥</span>
      Boosted
      <span className="font-normal text-white/55">{left}</span>
    </span>
  );
}

function FieldError({ text }: { text: string }) {
  if (!text) return null;
  return <p className="text-[12px] leading-4 text-[#FF453A]">{text}</p>;
}

function payFail(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("BOOST_OFF")) return BOOST_OFF_COPY;
  if (message.includes("BOOST_NAME")) return ERR_NAME;
  if (message.includes("PIN_BAD")) return ERR_PIN;
  if (message.includes("PIN_WRONG")) return ERR_PIN_WRONG;
  if (message.includes("PIN_LOW") || message.includes("BOOST_LOW")) return "Insufficient balance in your account";
  if (message.includes("CARD_LOW")) return ERR_CARD_LOW;
  if (message.includes("CARD_BAD")) return ERR_CARD;
  return "Payment was not completed. Nothing was charged.";
}

export function DirectPay({
  usd,
  pkr,
  onPay,
}: {
  usd: number;
  pkr: number;
  onPay: (input: { method: PayMethod; payer: string; pin: string; last4: string }) => Promise<void>;
}) {
  const [method, setMethod] = useState<PayMethod>("easypaisa");
  const [open, setOpen] = useState<PayMethod[] | null>(null);
  const [name, setName] = useState("");
  const [step, setStep] = useState<"form" | "pin" | "card">("form");
  const [pin, setPin] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState("");
  const shown = Number.isInteger(usd) ? String(usd) : usd.toFixed(2);
  const amount = `$${shown} / ${pkr.toLocaleString("en-US")} PKR`;
  const nameErr = name ? holderError(name) : "";

  useEffect(() => {
    boostPayGate()
      .then((row) => {
        const list = (row.methods ?? []).filter((id): id is PayMethod => id === "easypaisa" || id === "jazzcash" || id === "card");
        setOpen(list);
        setMethod((current) => (list.includes(current) ? current : list[0] ?? "easypaisa"));
      })
      .catch(() => setOpen([]));
  }, []);

  function start() {
    if (!open?.length) {
      setFail(BOOST_OFF_COPY);
      return;
    }
    setFail(nameErr);
    if (nameErr || busy) return;
    setPin("");
    setStep(method === "card" ? "card" : "pin");
  }

  function confirmPin() {
    const problem = pinError(pin, pkr);
    setFail(problem);
    if (problem || busy) return;
    setBusy(true);
    onPay({ method, payer: name, pin, last4: "" }).catch((error) => {
      setFail(payFail(error));
      setBusy(false);
    });
  }

  function confirmCard() {
    const problem = cardError({ number, expiry, cvv, name: cardName });
    setFail(problem);
    if (problem || busy) return;
    setBusy(true);
    onPay({ method: "card", payer: name || cardName, pin: "", last4: number.replace(/\D/g, "").slice(-4) }).catch((error) => {
      setFail(payFail(error));
      setBusy(false);
    });
  }

  if (open === null) return <p className="mt-3 text-xs text-white/45">Checking payment methods…</p>;
  if (open.length === 0) return <p className="mt-3 text-xs leading-5 text-[#FF453A]">{BOOST_OFF_COPY}</p>;

  return (
    <div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PAY_METHODS.filter((item) => open.includes(item[0])).map((item) => (
          <button key={item[0]} type="button" onClick={() => { setMethod(item[0]); setFail(""); }} className={`h-8 rounded-full px-3 text-xs font-semibold ${method === item[0] ? "bg-white text-black" : "bg-black text-white"}`}>
            {item[1]}
          </button>
        ))}
      </div>
      <label className="mt-3 block text-xs text-white/55">
        Account holder name, optional
        <input value={name} onChange={(event) => setName(event.target.value.slice(0, 60))} autoComplete="name" className="mt-1 h-11 w-full rounded-xl bg-black px-3 text-sm text-white outline-none" />
      </label>
      <FieldError text={nameErr} />
      <label className="mt-3 block text-xs text-white/55">
        Amount
        <input readOnly value={amount} className="mt-1 h-11 w-full rounded-xl bg-black px-3 text-sm text-white/80 outline-none" />
      </label>
      <p className="mt-3 text-xs leading-5 text-white/50">Pay to Flare Official Account. The number stays hidden. It pins only after confirmation.</p>
      <p className="mt-1 text-[11px] leading-4 text-white/40">Test mode. Only the methods the founder turned on are shown. Nothing is charged.</p>
      <FieldError text={step === "form" ? fail : ""} />
      <button type="button" disabled={busy} className="mt-4 h-11 w-full rounded-xl bg-white text-sm font-semibold text-black disabled:opacity-40" onClick={start}>
        {busy ? "Processing" : "Pay Now"}
      </button>
      {step === "pin" ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 px-5" role="dialog" aria-modal="true">
          <div className="w-full max-w-[360px] rounded-2xl bg-[#16161E] p-5">
            <p className="text-base font-semibold">{method === "jazzcash" ? "Enter Your JazzCash MPIN" : "Enter Your Easypaisa PIN"}</p>
            <p className="mt-1 text-xs leading-5 text-white/50">5 digits. A wrong PIN or an empty wallet stays on this screen. Test mode does not send this PIN.</p>
            <input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 5))} type="password" inputMode="numeric" autoComplete="off" className="mt-3 h-11 w-full rounded-xl bg-black px-3 text-sm outline-none" />
            <FieldError text={fail} />
            <div className="mt-4 flex gap-2">
              <button type="button" className="h-11 flex-1 rounded-full bg-white/10 text-sm" onClick={() => { setStep("form"); setFail(""); setBusy(false); }}>Cancel</button>
              <button type="button" disabled={busy} className="h-11 flex-1 rounded-full bg-white text-sm font-semibold text-black disabled:opacity-40" onClick={confirmPin}>{busy ? "Processing" : `Confirm Payment ${amount}`}</button>
            </div>
          </div>
        </div>
      ) : null}
      {step === "card" ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 px-5" role="dialog" aria-modal="true">
          <div className="w-full max-w-[360px] rounded-2xl bg-[#16161E] p-5">
            <p className="text-base font-semibold">Visa / MasterCard</p>
            <p className="mt-1 text-xs leading-5 text-white/50">Test card 4242 4242 4242 4242 succeeds. 4000 0000 0000 0002 is declined for funds. The card number is not saved.</p>
            <input value={number} onChange={(event) => setNumber(event.target.value.replace(/\D/g, "").slice(0, 16))} inputMode="numeric" autoComplete="off" placeholder="Card number" className="mt-3 h-11 w-full rounded-xl bg-black px-3 text-sm outline-none" />
            <div className="mt-2 flex gap-2">
              <input value={expiry} onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
                setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
              }} inputMode="numeric" autoComplete="off" placeholder="MM/YY" className="h-11 w-1/2 rounded-xl bg-black px-3 text-sm outline-none" />
              <input value={cvv} onChange={(event) => setCvv(event.target.value.replace(/\D/g, "").slice(0, 3))} type="password" inputMode="numeric" autoComplete="off" placeholder="CVV" className="h-11 w-1/2 rounded-xl bg-black px-3 text-sm outline-none" />
            </div>
            <input value={cardName} onChange={(event) => setCardName(event.target.value.slice(0, 60))} autoComplete="off" placeholder="Card holder name" className="mt-2 h-11 w-full rounded-xl bg-black px-3 text-sm outline-none" />
            <FieldError text={fail} />
            <div className="mt-4 flex gap-2">
              <button type="button" className="h-11 flex-1 rounded-full bg-white/10 text-sm" onClick={() => { setStep("form"); setFail(""); setBusy(false); }}>Cancel</button>
              <button type="button" disabled={busy} className="h-11 flex-1 rounded-full bg-white text-sm font-semibold text-black disabled:opacity-40" onClick={confirmCard}>{busy ? "Processing" : `Confirm Payment ${amount}`}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function usePaymentsOpen() {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    boostPayGate().then((row) => setOpen(row.attached)).catch(() => setOpen(false));
  }, []);
  return open;
}

export function BoostPaySheet({
  listingKind,
  id,
  title = "Your listing",
  onClose,
  onSent,
  onFail,
}: {
  listingKind: "gig" | "request";
  id: string;
  title?: string;
  onClose: () => void;
  onSent: (review?: boolean) => void;
  onFail: (message: string) => void;
}) {
  const [kind, setKind] = useState<"day" | "week" | "month">("day");
  const amounts = boostAmounts(kind);
  const plan = BOOSTS.find((item) => item.id === kind);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="max-h-[88dvh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-[#12121a] p-4 pb-8" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <p className="text-base font-semibold">Boost your listing</p>
        <p className="mt-1 text-sm text-white/80">{title}</p>
        <p className="mt-1 text-xs leading-5 text-white/50">{plan?.title}. Pay to Flare Official Account. It pins only after confirmation.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {BOOSTS.map((item) => {
            const usd = boostUsd(item.id);
            return (
              <button key={item.id} type="button" onClick={() => setKind(item.id)} className={`rounded-xl px-2 py-2 text-left ${kind === item.id ? "bg-white text-black" : "bg-black text-white/80"}`}>
                <span className="block text-[11px] font-semibold">{item.title}</span>
                <span className="block text-sm font-semibold">${usd}</span>
                <span className="block text-[10px] opacity-70">{pkrForUsd(usd).toLocaleString("en-US")} PKR</span>
                {item.popular ? <span className="mt-1 inline-block rounded-full bg-amber-300 px-1.5 text-[9px] font-semibold text-black">Most Popular</span> : null}
              </button>
            );
          })}
        </div>
        <DirectPay
          usd={amounts.usd}
          pkr={amounts.pkr}
          onPay={async (input) => {
            const run = listingKind === "gig"
              ? requestGigBoost({ data: { id, kind, method: input.method, payer: input.payer, pin: input.pin, last4: input.last4 } })
              : requestJobBoost({ data: { id, kind, method: input.method, payer: input.payer, pin: input.pin, last4: input.last4 } });
            try {
              const row = await run;
              onSent(row.review);
            } catch (error) {
              onFail(error instanceof Error ? error.message : "Payment was not completed.");
              throw error;
            }
          }}
        />
        <button type="button" className="mt-2 h-10 w-full text-xs text-white/45" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
