import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ownerAct, ownerDesk, ownerFind } from "@/lib/shola/server";
import { broadcastLog, sendTeamNote } from "@/lib/shola/system-notes";
import { ownerSay } from "@/lib/shola/gigs";
import { verifyAct, verifyQueue } from "@/lib/shola/profile-desk";

function Back({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <Link to="/founder/controls" className="grid size-10 place-items-center rounded-full bg-black text-lg ring-1 ring-white/20">←</Link>
      <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-xs leading-5 text-white/50">{hint}</p>
    </div>
  );
}

export function MaintenancePage() {
  const [on, setOn] = useState(false);
  const [note, setNote] = useState("");

  function load() {
    ownerDesk().then((row) => setOn(row?.rules.find((item) => item.key === "maintenance")?.value === "on")).catch(() => setNote("Could not load maintenance."));
  }
  useEffect(load, []);

  return (
    <div className="space-y-4 px-4 pt-4 pb-10">
      <Back title="Maintenance Mode" hint="New gigs and boards are paused for everyone except founder. Chat and payments stay open." />
      <section className="rounded-3xl bg-[#16161E] p-4">
        <p className="text-sm font-semibold">Status: {on ? "ON" : "OFF"}</p>
        <button type="button" className={`mt-4 h-14 w-full rounded-2xl text-sm font-semibold ${on ? "bg-white/10" : "bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 text-black"}`} onClick={() => ownerAct({ data: { kind: "maintenance", value: on ? "off" : "on" } }).then(() => { setNote(on ? "Maintenance is off." : "Maintenance is on."); load(); }).catch(() => setNote("Could not change maintenance."))}>
          {on ? "Turn Maintenance OFF" : "Turn Maintenance ON"}
        </button>
      </section>
      {note ? <p className="text-sm text-white/70">{note}</p> : null}
    </div>
  );
}

const REASONS = ["Spam", "Fake", "Abusive", "Copyright"] as const;
const SPANS = [
  { hours: 24, label: "24h" },
  { hours: 168, label: "7 days" },
  { hours: 0, label: "Permanent" },
] as const;

export function BanUserPage() {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Awaited<ReturnType<typeof ownerFind>>>([]);
  const [picked, setPicked] = useState("");
  const [reason, setReason] = useState<(typeof REASONS)[number]>("Spam");
  const [hours, setHours] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (query.trim().length < 2) {
      setPeople([]);
      return;
    }
    const id = window.setTimeout(() => {
      ownerFind({ data: query.trim() }).then(setPeople).catch(() => setPeople([]));
    }, 150);
    return () => window.clearTimeout(id);
  }, [query]);

  function ban() {
    if (!picked) {
      setNote("Search and select a user first.");
      return;
    }
    ownerAct({ data: { kind: "restrict", id: picked, hours, message: reason } })
      .then(() => { setNote(`@${picked} banned (${reason}).`); setQuery(""); setPeople([]); setPicked(""); })
      .catch(() => setNote("That user was not banned."));
  }

  return (
    <div className="space-y-4 px-4 pt-4 pb-10">
      <Back title="Ban User" hint="Search a username, pick a reason and a duration, then ban. The founder cannot be banned." />
      <input value={query} onChange={(e) => setQuery(e.target.value.replace(/^@/, "").slice(0, 32))} placeholder="Search username" className="h-12 w-full rounded-2xl bg-[#16161E] px-3 text-sm outline-none ring-1 ring-white/10" />
      <div className="space-y-2">
        {people.map((person) => (
          <button key={person.username} type="button" className={`flex w-full items-center gap-2 rounded-2xl p-3 text-left ${picked === person.username ? "bg-[#16161E] ring-1 ring-amber-300" : "bg-[#16161E]"}`} onClick={() => setPicked(person.username)}>
            <p className="min-w-0 flex-1 text-sm">@{person.username}<span className="block text-xs text-white/45">{person.display_name}</span></p>
            <span className="text-xs text-amber-200">{picked === person.username ? "Selected" : "Select"}</span>
          </button>
        ))}
        {query.trim().length >= 2 && people.length === 0 ? <p className="text-sm text-white/45">No matching user.</p> : null}
      </div>
      <label className="block text-xs text-white/45">
        Ban reason
        <select value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])} className="mt-2 h-12 w-full rounded-2xl bg-[#16161E] px-3 text-sm text-white outline-none ring-1 ring-white/10">
          {REASONS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <div>
        <p className="text-xs text-white/45">Duration</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SPANS.map((item) => (
            <button key={item.label} type="button" className={`h-9 rounded-full px-3 text-xs font-semibold ${hours === item.hours ? "bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 text-black" : "bg-[#16161E] ring-1 ring-white/10"}`} onClick={() => setHours(item.hours)}>{item.label}</button>
          ))}
        </div>
      </div>
      <button type="button" disabled={!picked} className="h-12 w-full rounded-2xl bg-red-700 text-sm font-semibold text-white disabled:opacity-40" onClick={ban}>Ban User</button>
      {note ? <p className="text-sm text-white/70">{note}</p> : null}
    </div>
  );
}

export function BroadcastPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof broadcastLog>>>([]);

  function load() {
    broadcastLog().then(setRows).catch(() => setRows([]));
  }
  useEffect(load, []);

  function send() {
    const href = link.trim();
    if (href && !/^https:\/\//i.test(href)) {
      setNote("The link must start with https://");
      return;
    }
    sendTeamNote({ data: { title, body: href ? `${body} ${href}` : body, username: "" } })
      .then(() => { setNote("Broadcast sent."); setTitle(""); setBody(""); setLink(""); load(); })
      .catch(() => setNote("Broadcast was not sent."));
  }

  return (
    <div className="space-y-4 px-4 pt-4 pb-10">
      <Back title="Broadcast & Notices" hint="A broadcast lands in every inbox. A short notice is the one-line banner." />
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="h-12 w-full rounded-2xl bg-[#16161E] px-3 text-sm outline-none" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Message" className="w-full rounded-2xl bg-[#16161E] px-3 py-3 text-sm outline-none" />
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Optional link, https only" className="h-12 w-full rounded-2xl bg-[#16161E] px-3 text-sm outline-none" />
      <button type="button" className="h-12 w-full rounded-2xl bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 text-sm font-semibold text-black" onClick={send}>Broadcast now</button>
      <button type="button" className="h-11 w-full rounded-2xl bg-white/10 text-sm" onClick={() => ownerSay({ data: body }).then(() => setNote("Notice posted.")).catch(() => setNote("Notice was not posted."))}>Send notice</button>
      <section className="space-y-2">
        <p className="text-sm font-semibold">Last 5 broadcasts</p>
        {rows.map((row) => (
          <article key={row.at + row.body.slice(0, 24)} className="rounded-2xl bg-[#16161E] p-3 text-sm whitespace-pre-wrap">
            {row.body}
            <span className="mt-2 block text-[11px] text-white/35">{String(row.at).slice(0, 16).replace("T", " ")}</span>
          </article>
        ))}
        {rows.length === 0 ? <p className="text-sm text-white/45">No broadcasts yet.</p> : null}
      </section>
      {note ? <p className="text-sm text-white/70">{note}</p> : null}
    </div>
  );
}

export function CashoutPage() {
  const [on, setOn] = useState(true);
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof verifyQueue>>["payouts"]>([]);
  const [tx, setTx] = useState<Record<string, string>>({});

  function load() {
    ownerDesk().then((row) => setOn(row?.rules.find((item) => item.key === "cash_open")?.value !== "off")).catch(() => setNote("Could not load cash-out."));
    verifyQueue().then((desk) => setRows(desk.payouts ?? [])).catch(() => setRows([]));
  }
  useEffect(load, []);

  return (
    <div className="space-y-4 px-4 pt-4 pb-10">
      <Back title="Cash-out Control" hint={on ? "Cash-out is enabled." : "Cash-out is disabled."} />
      <section className="rounded-3xl bg-[#16161E] p-4">
        <p className="text-sm font-semibold">Status: {on ? "Enabled" : "Disabled"}</p>
        <button type="button" className="mt-4 h-14 w-full rounded-2xl bg-white text-sm font-semibold text-black" onClick={() => ownerAct({ data: { kind: "cash_gate", value: on ? "off" : "on" } }).then(() => { setNote(on ? "Cash-out disabled." : "Cash-out enabled."); load(); }).catch(() => setNote("Could not change cash-out."))}>
          {on ? "Disable cash-out" : "Enable cash-out"}
        </button>
      </section>
      <section className="space-y-2">
        <p className="text-sm font-semibold">Withdrawal requests</p>
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl bg-[#16161E] p-3 text-sm">
            <p className="font-semibold">@{row.username}{row.display_name ? ` · ${row.display_name}` : ""} · ${row.amount}</p>
            <p className="mt-1 text-white/70">{row.method || "account"} · {row.account_title || "No title"} · {row.account || row.account_mask || "••••"}</p>
            {row.email ? <p className="text-xs text-white/45">{row.email}</p> : null}
            <p className="text-[11px] text-white/35">{String(row.at || "").slice(0, 16).replace("T", " ")}</p>
            <input value={tx[row.id] ?? ""} onChange={(event) => setTx((cur) => ({ ...cur, [row.id]: event.target.value.slice(0, 40) }))} placeholder="TxID after you send the money" className="mt-2 h-10 w-full rounded-xl bg-black px-3 text-xs outline-none" />
            <div className="mt-2 flex gap-2">
              <button type="button" className="h-9 rounded-full bg-white px-3 text-xs font-semibold text-black" onClick={() => verifyAct({ data: { action: "paid", id: row.id, tx: (tx[row.id] || "").trim() } }).then(() => { setNote("Marked paid. The user was notified."); load(); }).catch(() => setNote("Could not approve that withdrawal."))}>Approve</button>
              <button type="button" className="h-9 rounded-full bg-white/10 px-3 text-xs" onClick={() => verifyAct({ data: { action: "decline", id: row.id } }).then(() => { setNote("Declined. The amount is back in their wallet."); load(); }).catch(() => setNote("Could not decline that withdrawal."))}>Reject</button>
            </div>
          </article>
        ))}
        {rows.length === 0 ? <p className="text-sm text-white/45">No pending withdrawals.</p> : null}
      </section>
      {note ? <p className="text-sm text-white/70">{note}</p> : null}
    </div>
  );
}
