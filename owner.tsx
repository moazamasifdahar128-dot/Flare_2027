import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Phone } from "@/components/shola/shell";
import { TopBack } from "@/components/flare/page";
import { boardFounder, boardPayee, boardQueue } from "@/lib/shola/board";
import { founderBooks, founderReceiving, gigBoostAct, gigBoostQueue, gigBoostReject, manualAct, manualQueue, ownerCash, ownerSay, reportAct } from "@/lib/shola/gigs";
import { sendTeamNote } from "@/lib/shola/system-notes";
import { verifyAct, verifyQueue } from "@/lib/shola/profile-desk";
import { ownerAct, ownerDesk, ownerFind } from "@/lib/shola/server";
import { shopDesk } from "@/lib/shola/shops";
import { TICK_USD, pkrForUsd } from "@/lib/shola/money";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <p className="text-xl font-semibold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function OwnerRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/admin", replace: true });
  }, [navigate]);
  return null;
}

export const Route = createFileRoute("/owner")({
  beforeLoad: () => {
    throw redirect({ to: "/admin", replace: true });
  },
  component: OwnerRedirect,
});

export function Owner() {
  const navigate = useNavigate();
  const left = useRef(false);
  const [phase, setPhase] = useState<"load" | "ready" | "closed">("load");
  const [desk, setDesk] = useState<Awaited<ReturnType<typeof ownerDesk>> | null>(null);
  const [country, setCountry] = useState("");
  const [hours, setHours] = useState(2);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [cap, setCap] = useState("100");
  const [boost, setBoost] = useState("");
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Awaited<ReturnType<typeof ownerFind>>>([]);
  const [queue, setQueue] = useState<Awaited<ReturnType<typeof boardQueue>> | null>(null);
  const [checks, setChecks] = useState<Awaited<ReturnType<typeof verifyQueue>> | null>(null);
  const [gigBoosts, setGigBoosts] = useState<Awaited<ReturnType<typeof gigBoostQueue>>>([]);
  const [manuals, setManuals] = useState<Awaited<ReturnType<typeof manualQueue>>>([]);
  const [cash, setCash] = useState({ usd: 0, pkr: 0 });
  const [receiving, setReceiving] = useState<Awaited<ReturnType<typeof founderReceiving>> | null>(null);
  const [books, setBooks] = useState<Awaited<ReturnType<typeof founderBooks>> | null>(null);
  const [bookTab, setBookTab] = useState("home");
  const [noteBody, setNoteBody] = useState("");
  const [teamTitle, setTeamTitle] = useState("");
  const [teamBody, setTeamBody] = useState("");
  const [teamUser, setTeamUser] = useState("");
  const [teamSent, setTeamSent] = useState("");
  const [market, setMarket] = useState<Awaited<ReturnType<typeof shopDesk>>>(null);
  const [payeePk, setPayeePk] = useState("");
  const [payeeWorld, setPayeeWorld] = useState("");
  const [payTitle, setPayTitle] = useState("");
  const [payJazz, setPayJazz] = useState("");
  const [payEasy, setPayEasy] = useState("");
  const [payBank, setPayBank] = useState("");
  const [payWise, setPayWise] = useState("");
  const [payPayoneer, setPayPayoneer] = useState("");
  const [payUsdt, setPayUsdt] = useState("");

  function destination() {
    try {
      const saved = sessionStorage.getItem("flare_founder_from") || "";
      if (saved.startsWith("/") && !saved.startsWith("/admin") && !saved.startsWith("/owner")) return saved;
    } catch {
      /* ignore */
    }
    return "/";
  }

  function leave() {
    if (left.current) return;
    left.current = true;
    try { sessionStorage.removeItem("flare_founder_from"); } catch { /* ignore */ }
    const target = destination();
    if (target.startsWith("/u/")) {
      const username = decodeURIComponent(target.split("/")[2] || "");
      if (username) {
        navigate({ to: "/u/$username", params: { username }, replace: true });
        return;
      }
    }
    navigate({ to: "/", replace: true });
  }

  const leaveRef = useRef(leave);
  leaveRef.current = leave;

  useEffect(() => {
    let armed = false;
    const arm = window.setTimeout(() => {
      armed = true;
    }, 400);
    function onPop() {
      if (!armed) return;
      const path = window.location.pathname;
      if (path === "/admin" || path === "/owner") leaveRef.current();
    }
    window.addEventListener("popstate", onPop);
    return () => {
      window.clearTimeout(arm);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  function load() {
    ownerDesk().then((row) => {
      setDesk(row);
      setPhase(row ? "ready" : "closed");
    }).catch(() => {
      setDesk(null);
      setPhase("closed");
    });
    boardQueue().then((row) => {
      setQueue(row);
      setPayeePk(row.payeePk);
      setPayeeWorld(row.payeeWorld);
    }).catch(() => setQueue(null));
    boardPayee().then((row) => {
      setPayTitle(row.title);
      setPayJazz(row.jazzcash);
      setPayEasy(row.easypaisa);
      setPayBank(row.bank);
      setPayWise(row.wise);
      setPayPayoneer(row.payoneer);
      setPayUsdt(row.usdt);
    }).catch(() => undefined);
    verifyQueue().then(setChecks).catch(() => setChecks(null));
    gigBoostQueue().then(setGigBoosts).catch(() => setGigBoosts([]));
    manualQueue().then(setManuals).catch(() => setManuals([]));
    ownerCash().then(setCash).catch(() => setCash({ usd: 0, pkr: 0 }));
    founderBooks().then(setBooks).catch(() => setBooks(null));
    founderReceiving().then(setReceiving).catch(() => setReceiving(null));
    shopDesk().then(setMarket).catch(() => setMarket(null));
  }
  useEffect(load, []);

  if (phase !== "ready" || !desk) {
    return (
      <Phone bare>
        <div className="px-4 pt-4">
          <TopBack onClick={leave} />
          <p className="mt-4 text-sm text-muted">{phase === "load" ? "Opening Founder Room…" : "This room is only for the founder."}</p>
        </div>
      </Phone>
    );
  }

  return (
    <Phone bare>
      <div className="space-y-4 px-4 pt-4 pb-16">
        <TopBack onClick={leave} />
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-xs text-white/45">Only the founder can open this room. Counts are live records, not estimates.</p>
        {books && (
          <>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {[
                ["home", "Overview"],
                ["wa", "Unlocks"],
                ["boost", "Boosts"],
                ["tick", "Blue tick"],
                ["deals", "Deals"],
                ["reports", "Reports"],
                ["cash", "Withdrawals"],
              ].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setBookTab(id)} className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold ${bookTab === id ? "bg-white text-black" : "bg-surface"}`}>{label}</button>
              ))}
            </div>
            {bookTab === "home" && (
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Users" value={books.users} />
                <Stat label="Gigs" value={books.gigs} />
                <Stat label="Boards" value={books.requests} />
                <Stat label="Active boosts" value={books.activeBoosts} />
                <Stat label="Revenue $" value={books.revenue} />
                <Stat label="Withdrawals $" value={books.withdrawn} />
              </div>
            )}
            {bookTab === "home" && <p className="text-xs text-white/50">Revenue is confirmed WhatsApp unlocks ${books.waUsd.toFixed(2)}, boosts ${books.boostUsd.toFixed(2)}, blue tick receipts ${books.tickUsd.toFixed(2)} at ${TICK_USD.toFixed(2)} / {pkrForUsd(TICK_USD)} PKR each, and 15% deal fees ${books.fee}. Nothing is estimated.</p>}
            {bookTab === "wa" && books.unlocks.map((row) => (
              <p key={row.id} className="rounded-2xl bg-surface p-3 text-sm">@{row.buyer} unlocked @{row.seller} · {row.title} · ${(row.cents / 100).toFixed(2)} · {row.status}</p>
            ))}
            {bookTab === "boost" && books.boosts.map((row) => (
              <div key={row.id} className="rounded-2xl bg-surface p-3 text-sm">
                <p className="font-semibold">{row.payer_name || row.name} · @{row.username}</p>
                <p>{row.title} · {row.kind} · {row.amount_label} · {row.status}</p>
                <p className="text-muted">{row.method} · {row.reference}</p>
                {row.shot ? <img src={row.shot} alt="" className="mt-2 max-h-40 w-full rounded-xl object-cover" /> : null}
                {row.status === "pending" ? (
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="h-9 rounded-full bg-primary px-3 text-ink" onClick={() => gigBoostAct({ data: { id: row.id } }).then(load)}>Approve</button>
                    <button type="button" className="h-9 rounded-full bg-white/10 px-3" onClick={() => gigBoostReject({ data: { id: row.id } }).then(load)}>Reject</button>
                  </div>
                ) : null}
              </div>
            ))}
            {bookTab === "boost" && (queue?.payments ?? []).filter((row) => row.kind.startsWith("boost")).map((row) => (
              <div key={row.id} className="rounded-2xl bg-surface p-3 text-sm">
                <p className="font-semibold">{row.payer_name || "Board"} · @{row.username}</p>
                <p>{row.title} · {row.kind} · {row.amount_label}</p>
                <p className="text-muted">{row.method} · {row.reference}</p>
                {row.shot ? <img src={row.shot} alt="" className="mt-2 max-h-40 w-full rounded-xl object-cover" /> : null}
                <div className="mt-2 flex gap-2">
                  <button type="button" className="h-9 rounded-full bg-primary px-3 text-ink" onClick={() => boardFounder({ data: { action: "approve", id: row.id } }).then(load)}>Approve</button>
                  <button type="button" className="h-9 rounded-full bg-white/10 px-3" onClick={() => boardFounder({ data: { action: "reject", id: row.id } }).then(load)}>Reject</button>
                </div>
              </div>
            ))}
            {bookTab === "tick" && books.badges.map((row) => (
              <p key={row.username} className="rounded-2xl bg-surface p-3 text-sm">@{row.username} · {row.views.toLocaleString()} views · {row.status} · ${TICK_USD.toFixed(2)} / {pkrForUsd(TICK_USD)} PKR</p>
            ))}
            {bookTab === "deals" && books.deals.map((row) => (
              <p key={row.id} className="rounded-2xl bg-surface p-3 text-sm">{row.title} · @{row.buyer} to @{row.seller} · ${row.amount} · fee ${row.fee} · seller ${row.payout} · {row.status}</p>
            ))}
            {bookTab === "reports" && books.reports.map((row) => (
              <div key={row.id} className="rounded-2xl bg-surface p-3 text-sm">
                <p className="font-semibold">{row.title || "Listing"} · {row.box}</p>
                <p className="text-muted">@{row.reporter} reported @{row.owner || "owner"} · {row.reason} · {row.n} open</p>
                <p className="mt-1">{row.note || "No extra detail"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.box === "gig" ? (
                    <Link to="/gigs/$id" params={{ id: row.post_id }} className="grid h-9 place-items-center rounded-full bg-white/10 px-3 text-xs">View Listing</Link>
                  ) : (
                    <Link to="/board/$id" params={{ id: row.post_id }} className="grid h-9 place-items-center rounded-full bg-white/10 px-3 text-xs">View Listing</Link>
                  )}
                  <button type="button" className="h-9 rounded-full bg-white/10 px-3 text-xs" onClick={() => reportAct({ data: { id: row.id, action: "hide" } }).then(load)}>Hide Listing</button>
                  <button type="button" className="h-9 rounded-full bg-red-700 px-3 text-xs text-white" onClick={() => reportAct({ data: { id: row.id, action: "delete" } }).then(load)}>Delete Listing</button>
                  <button type="button" className="h-9 rounded-full bg-red-700 px-3 text-xs text-white" onClick={() => reportAct({ data: { id: row.id, action: "ban" } }).then(load)}>Ban User</button>
                  <button type="button" className="h-9 rounded-full bg-white/10 px-3 text-xs" onClick={() => reportAct({ data: { id: row.id, action: "dismiss" } }).then(load)}>Dismiss</button>
                </div>
              </div>
            ))}
            {bookTab === "cash" && books.cash.map((row) => (
              <p key={row.id} className="rounded-2xl bg-surface p-3 text-sm">@{row.username} · ${row.amount} · {row.method || "account"} · {row.account_mask || "••••"} · {row.status}</p>
            ))}
          </>
        )}
        {market && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Users" value={market.counts.users} />
              <Stat label="Shops" value={market.counts.shops} />
              <Stat label="Listings" value={market.counts.listings} />
              <Stat label="Pending orders" value={market.counts.orders} />
            </div>
            <div className="rounded-2xl bg-surface p-3">
              <p className="text-sm font-semibold">Recent activity</p>
              {market.activity.length === 0 && <p className="mt-2 text-sm text-muted">Nothing recorded yet.</p>}
              {market.activity.map((row, index) => (
                <p key={`${row.kind}-${index}`} className="mt-2 text-sm text-muted">{row.kind} · {row.title}</p>
              ))}
            </div>
          </>
        )}
        <h2 className="text-lg font-semibold">Flare earnings</h2>
        <p className="rounded-2xl bg-surface p-3 text-sm">${cash.usd.toFixed(2)} (~{cash.pkr.toLocaleString()} PKR) released. Unlocks and boosts are the full fee. In-app deals count only the 15% cut.</p>
        <h2 className="text-lg font-semibold">Broadcast</h2>
        <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); ownerSay({ data: noteBody }).then(() => { setNoteBody(""); load(); }); }}>
          <input value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Short notice, no phone or link" className="h-12 w-full rounded-2xl bg-surface px-4 text-sm" />
          <button className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-ink">Send notice</button>
        </form>
        <h2 className="text-lg font-semibold">Send system notification</h2>
        <form className="space-y-2" onSubmit={(event) => {
          event.preventDefault();
          sendTeamNote({ data: { title: teamTitle, body: teamBody, username: teamUser } })
            .then((row) => { setTeamTitle(""); setTeamBody(""); setTeamSent(`Sent to ${row.sent} account${row.sent === 1 ? "" : "s"}.`); })
            .catch(() => setTeamSent("That note was not sent."));
        }}>
          <input value={teamTitle} onChange={(e) => setTeamTitle(e.target.value)} placeholder="Title" className="h-12 w-full rounded-2xl bg-surface px-4 text-sm" />
          <textarea value={teamBody} onChange={(e) => setTeamBody(e.target.value)} rows={3} placeholder="Message. No phone or link." className="w-full rounded-2xl bg-surface px-4 py-3 text-sm" />
          <input value={teamUser} onChange={(e) => setTeamUser(e.target.value)} placeholder="Username, or leave empty for all accounts" className="h-12 w-full rounded-2xl bg-surface px-4 text-sm" />
          <button className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-ink">Send to system notifications</button>
          {teamSent && <p className="text-sm text-muted">{teamSent}</p>}
        </form>
        <h2 className="text-lg font-semibold">Manual orders</h2>
        {manuals.map((row) => (
          <div key={row.id} className="rounded-2xl bg-surface p-3 text-sm">
            <p className="font-semibold">@{row.username} · {row.deal_type} · ${(row.amount_usd_cents / 100).toFixed(2)} (~{row.amount_pkr} PKR)</p>
            <p className="text-muted">{row.payment_method} · {row.transaction_id} · {row.status}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["paid", "delivered", "released", "disputed"].map((status) => (
                <button key={status} type="button" className="h-9 rounded-full bg-primary px-3 text-ink" onClick={() => manualAct({ data: { id: row.id, status } }).then(load)}>{status}</button>
              ))}
            </div>
          </div>
        ))}
        <h2 className="text-lg font-semibold">Gig boosts</h2>
        {gigBoosts.map((row) => (
          <div key={row.id} className="rounded-2xl bg-surface p-3 text-sm">
            <p className="font-semibold">@{row.username} · {row.kind} · {row.amount_label}</p>
            <p className="text-muted">{row.method} · {row.reference}</p>
            <button type="button" className="mt-2 h-9 rounded-full bg-primary px-3 text-ink" onClick={() => gigBoostAct({ data: { id: row.id } }).then(load)}>Approve</button>
          </div>
        ))}
        <h2 className="text-lg font-semibold">Blue tick</h2>
        {(checks?.reviews ?? []).map((row) => (
          <div key={row.user_id} className="rounded-2xl bg-surface p-3 text-sm">
            <p className="font-semibold">@{row.username} · {row.display_name}</p>
            <p className="text-muted">{row.views.toLocaleString()} views · {row.status}{row.reference ? ` · ${row.method} · ${row.reference}` : ""}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {row.status === "review" && <button type="button" className="h-9 rounded-full bg-primary px-3 text-ink" onClick={() => verifyAct({ data: { action: "approve", id: row.user_id } }).then(load)}>Approve fee</button>}
              {row.status === "review" && <button type="button" className="h-9 rounded-full bg-bg px-3" onClick={() => verifyAct({ data: { action: "reject", id: row.user_id } }).then(load)}>Reject</button>}
              {row.status === "paid_wait" && <button type="button" className="h-9 rounded-full bg-primary px-3 text-ink" onClick={() => verifyAct({ data: { action: "badge", id: row.user_id } }).then(load)}>Confirm and badge</button>}
            </div>
          </div>
        ))}
        <h2 className="text-lg font-semibold">In-app deals, 15%</h2>
        {(checks?.deals ?? []).map((row) => (
          <div key={row.id} className="rounded-2xl bg-surface p-3 text-sm">
            <p>@{row.username} · {row.amount} {row.currency}</p>
            <p className="text-muted">{row.reference}</p>
            <button type="button" className="mt-2 h-9 rounded-full bg-primary px-3 text-ink" onClick={() => verifyAct({ data: { action: "release", id: row.id } }).then(load)}>Release 85%</button>
          </div>
        ))}
        <h2 className="text-lg font-semibold">Withdrawals</h2>
        {(checks?.payouts ?? []).map((row) => (
          <div key={row.id} className="rounded-2xl bg-surface p-3 text-sm">
            <p>@{row.username} · ${row.amount} · {row.method || "account"} · {row.account_mask || "••••"}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="h-9 rounded-full bg-primary px-3 text-ink" onClick={() => verifyAct({ data: { action: "paid", id: row.id } }).then(load)}>Mark paid</button>
              <button type="button" className="h-9 rounded-full bg-bg px-3" onClick={() => verifyAct({ data: { action: "decline", id: row.id } }).then(load)}>Decline</button>
            </div>
          </div>
        ))}
        <h2 className="text-lg font-semibold">Founder Payment Accounts</h2>
        <p className="text-xs text-white/45">Only this room can see the receiving account. Users see “Pay to Flare Official Account” and never the number.</p>
        <div className="rounded-2xl bg-surface p-3 text-sm">
          {receiving?.attached ? (
            <>
              <p className="font-semibold text-emerald-300">Receiving account attached</p>
              <p className="mt-1">Payment account: {receiving.account || "Set"}</p>
              {receiving.easypaisa ? <p>Easypaisa: {receiving.easypaisa}</p> : null}
              {receiving.jazzcash ? <p>JazzCash: {receiving.jazzcash}</p> : null}
              {receiving.bank ? <p>Bank: {receiving.bank}</p> : null}
              {receiving.wise ? <p>Wise: {receiving.wise}</p> : null}
              {receiving.payoneer ? <p>Payoneer: {receiving.payoneer}</p> : null}
            </>
          ) : (
            <p>Boost is off. Set Cloudflare env FOUNDER_PAYMENT_ACCOUNT before anyone can pay. FOUNDER_EASYPAISA_NUMBER stays in this room only.</p>
          )}
        </div>
        <label className="block text-xs text-muted">Account title<input value={payTitle} onChange={(e) => setPayTitle(e.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-surface px-4" /></label>
        <label className="block text-xs text-muted">JazzCash<input value={payJazz} onChange={(e) => setPayJazz(e.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-surface px-4" /></label>
        <label className="block text-xs text-muted">Easypaisa<input value={payEasy} onChange={(e) => setPayEasy(e.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-surface px-4" /></label>
        <label className="block text-xs text-muted">Bank account<input value={payBank} onChange={(e) => setPayBank(e.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-surface px-4" /></label>
        <label className="block text-xs text-muted">Wise<input value={payWise} onChange={(e) => setPayWise(e.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-surface px-4" /></label>
        <label className="block text-xs text-muted">Payoneer<input value={payPayoneer} onChange={(e) => setPayPayoneer(e.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-surface px-4" /></label>
        <label className="block text-xs text-muted">USDT<input value={payUsdt} onChange={(e) => setPayUsdt(e.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-surface px-4" /></label>
        <button type="button" className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-ink" onClick={() => boardFounder({ data: { action: "payee", payeePk, payeeWorld, title: payTitle, jazzcash: payJazz, easypaisa: payEasy, bank: payBank, wise: payWise, payoneer: payPayoneer, usdt: payUsdt } }).then(load)}>
          Save accounts
        </button>
        {(queue?.payments ?? []).map((row) => (
          <div key={row.id} className="rounded-2xl bg-surface p-3 text-sm">
            <p className="font-semibold">{row.title}</p>
            <p className="text-muted">@{row.username} · {row.kind} · {row.method} · {row.amount_label}</p>
            <p className="mt-1">Ref {row.reference}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="h-9 rounded-full bg-primary px-3 text-ink" onClick={() => boardFounder({ data: { action: "approve", id: row.id } }).then(load)}>Approve</button>
              <button type="button" className="h-9 rounded-full bg-bg px-3" onClick={() => boardFounder({ data: { action: "reject", id: row.id } }).then(load)}>Reject</button>
            </div>
          </div>
        ))}
        {(queue?.deals ?? []).map((row) => (
          <div key={row.id} className="rounded-2xl bg-surface p-3 text-sm">
            <p className="font-semibold">{row.title}</p>
            <p className="text-muted">{row.status} · {row.amount} {row.currency} · seller {row.split.payout} · fee {row.split.fee}</p>
            <p className="mt-1">Ref {row.reference || "—"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {row.status === "pending" && <button type="button" className="h-9 rounded-full bg-primary px-3 text-ink" onClick={() => boardFounder({ data: { action: "hold", id: row.id } }).then(load)}>Money received</button>}
              {row.status === "delivered" && <button type="button" className="h-9 rounded-full bg-primary px-3 text-ink" onClick={() => boardFounder({ data: { action: "release", id: row.id } }).then(load)}>Release</button>}
              <button type="button" className="h-9 rounded-full bg-red-700 px-3 text-white" onClick={() => boardFounder({ data: { action: "refund", id: row.id } }).then(load)}>Refund</button>
            </div>
          </div>
        ))}
        <label className="block text-xs text-muted">
          Upload cap, megabytes
          <input value={cap} onChange={(e) => setCap(e.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-surface px-4" />
        </label>
        <button type="button" className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-ink" onClick={() => ownerAct({ data: { kind: "upload", value: cap } }).then(load)}>
          Save cap
        </button>
        <label className="block text-xs text-muted">
          Country code
          <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} className="mt-1 h-12 w-full rounded-2xl bg-surface px-4" />
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            [24, "24h"],
            [720, "1 month"],
            [2160, "3 months"],
            [0, "Permanent"],
          ].map(([n, label]) => (
            <button key={n} type="button" onClick={() => setHours(Number(n))} className={`h-10 rounded-full px-4 text-sm ${hours === n ? "bg-primary text-ink" : "bg-surface"}`}>
              {label}
            </button>
          ))}
        </div>
        <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Flare is temporarily unavailable in your region." className="h-12 w-full rounded-2xl bg-surface px-4" />
        <button type="button" className="h-11 rounded-full bg-surface px-4 text-sm" onClick={() => ownerAct({ data: { kind: "geo", country, hours, message } }).then(load)}>
          Pause country
        </button>
        {desk.blocks.map((block) => (
          <button key={block.country} type="button" className="block text-sm text-danger" onClick={() => ownerAct({ data: { kind: "clear", country: block.country } }).then(load)}>
            Lift {block.country}
          </button>
        ))}
        <label className="block text-xs text-muted">
          Post id to boost on For You
          <input value={boost} onChange={(e) => setBoost(e.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-surface px-4" />
        </label>
        <button type="button" className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-ink" onClick={() => ownerAct({ data: { kind: "boost", id: boost } }).then(load)}>
          Boost reach
        </button>
        <button type="button" className="h-11 rounded-full bg-surface px-4 text-sm" onClick={() => ownerAct({ data: { kind: "pin", id: boost } }).then(load)}>
          Pin or unpin
        </button>
        <button type="button" className="h-11 rounded-full bg-red-700 px-4 text-sm text-white" onClick={() => ownerAct({ data: { kind: "strike", id: boost } }).then(load)}>
          Copyright strike
        </button>
        <button type="button" className="h-11 rounded-full bg-surface px-4 text-sm" onClick={() => ownerAct({ data: { kind: "clearstrike", id: boost } }).then(load)}>
          Remove strike
        </button>
        <h2 className="text-lg font-semibold">People</h2>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Username" className="h-12 w-full rounded-2xl bg-surface px-4" />
        <button type="button" className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-ink" onClick={() => ownerFind({ data: query }).then(setPeople).catch(() => setPeople([]))}>
          Search
        </button>
        {people.map((person) => (
          <div key={person.username} className="rounded-2xl bg-surface p-3 text-sm">
            <p>@{person.username} · {person.display_name}</p>
            <p className="text-muted">Strikes {person.strikes}{person.verified ? " · tick" : ""}{person.monetized ? " · monetized" : ""}{person.banned_forever ? " · banned" : ""}{person.review_flag ? " · flagged" : ""}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="h-9 rounded-full bg-bg px-3" onClick={() => ownerAct({ data: { kind: "tick", id: person.username } }).then(load)}>Blue tick</button>
              <button type="button" className="h-9 rounded-full bg-bg px-3" onClick={() => ownerAct({ data: { kind: "money", id: person.username } }).then(load)}>Monetize</button>
              <button type="button" className="h-9 rounded-full bg-bg px-3" onClick={() => ownerAct({ data: { kind: "year", id: person.username } }).then(load)}>1 year</button>
              <button type="button" className="h-9 rounded-full bg-red-700 px-3 text-white" onClick={() => ownerAct({ data: { kind: "purge", id: person.username } }).then(load)}>Purge</button>
            </div>
          </div>
        ))}
        <h2 className="text-lg font-semibold">Flagged browsers</h2>
        {desk.flagged.length === 0 && <p className="text-sm text-muted">No returning banned browser has posted twice.</p>}
        {desk.flagged.map((row) => (
          <div key={row.username} className="flex items-center justify-between text-sm">
            <span>@{row.username} · strikes {row.strikes}</span>
            <button type="button" className="h-9 rounded-full bg-red-700 px-3 text-white" onClick={() => ownerAct({ data: { kind: "purge", id: row.username } }).then(load)}>Purge</button>
          </div>
        ))}
        <h2 className="text-lg font-semibold">Removed in 30 days</h2>
        {desk.removed.length === 0 && <p className="text-sm text-muted">No removed videos in this window.</p>}
        {desk.removed.map((row) => (
          <p key={row.post_id + row.removed_at} className="text-sm text-muted">
            {row.title || row.post_id}{row.copyrighted ? " · L" : ""}
          </p>
        ))}
        <h2 className="text-lg font-semibold">Monetization and cash-out review</h2>
        {desk.payouts.map((row) => (
          <div key={row.id} className="rounded-2xl bg-surface p-3 text-sm">
            <p>@{row.username} · {row.method} · ${row.amount_usd}</p>
            <p className="text-muted">{row.detail}</p>
            <p className="text-muted">AI-marked posts {row.ai} · YouTube posts {row.youtube} · Copyright marks in 30 days {row.copies} · Strikes {row.strikes}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="h-9 rounded-full bg-primary px-3 text-ink" onClick={() => ownerAct({ data: { kind: "pay_yes", id: row.id } }).then(load)}>Approve</button>
              <button type="button" className="h-9 rounded-full bg-bg px-3" onClick={() => ownerAct({ data: { kind: "pay_no", id: row.id } }).then(load)}>Reject</button>
            </div>
          </div>
        ))}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="A note for everyone" className="w-full rounded-2xl bg-surface px-4 py-3" />
        <button type="button" className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-ink" onClick={() => ownerAct({ data: { kind: "note", message: note } }).then(() => { setNote(""); load(); })}>
          Publish note
        </button>
        <p className="text-center text-[11px] text-muted">© 2026 Flare. All Rights Reserved.</p>
      </div>
    </Phone>
  );
}
