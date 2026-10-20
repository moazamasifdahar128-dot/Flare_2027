import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, errText } from "@/components/shola/shell";
import { TopBack } from "@/components/flare/page";
import { DirectPay } from "@/components/shola/boost";
import { useI18n, noteText } from "@/lib/shola/i18n";
import { applyBadge, payBadge, profileDesk } from "@/lib/shola/profile-desk";
import { gigsByName } from "@/lib/shola/gigs";
import { jobsByName } from "@/lib/shola/board";
import { notes, myHandle } from "@/lib/shola/server";
import { pkrForUsd, TICK_USD } from "@/lib/shola/money";

export const Route = createFileRoute("/studio")({ component: Studio });

function money(amount: number, currency: string) {
  return currency === "USD" ? `$${amount}` : `${amount} PKR`;
}

function Studio() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [desk, setDesk] = useState<Awaited<ReturnType<typeof profileDesk>>>(null);
  const [alerts, setAlerts] = useState<Awaited<ReturnType<typeof notes>>["items"]>([]);
  const [note, setNote] = useState("");
  const [gigs, setGigs] = useState<Awaited<ReturnType<typeof gigsByName>>>([]);
  const [jobs, setJobs] = useState<Awaited<ReturnType<typeof jobsByName>>>([]);

  function load(username: string) {
    profileDesk({ data: username }).then(setDesk).catch(() => setDesk(null));
    gigsByName({ data: username }).then(setGigs).catch(() => setGigs([]));
    jobsByName({ data: username }).then(setJobs).catch(() => setJobs([]));
    notes().then((row) => setAlerts(row.items.filter((item) => !item.kind.startsWith("follow")).slice(0, 6))).catch(() => setAlerts([]));
  }

  useEffect(() => {
    myHandle().then((row) => load(row.username)).catch(() => undefined);
  }, []);

  if (!desk?.isSelf) {
    return <Phone bare><p className="p-8 text-sm text-white/60">{desk ? "Flare Studio is private." : "Opening studio…"}</p></Phone>;
  }

  const width = Math.min(100, Math.round((desk.views / Math.max(1, desk.goal)) * 100));

  return (
    <Phone bare>
      <div className="space-y-4 px-4 pt-4 pb-16">
        <div className="flex items-center gap-3">
          <TopBack />
          <h1 className="text-2xl font-semibold">Flare Studio</h1>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-3xl bg-[#16161E] p-4">
            <p className="text-xs text-white/45">Total Likes</p>
            <p className="mt-1 text-2xl font-semibold">{desk.likes.toLocaleString()}</p>
          </div>
          <div className="rounded-3xl bg-[#16161E] p-4">
            <p className="text-xs text-white/45">Total Gig Views</p>
            <p className="mt-1 text-2xl font-semibold">{desk.views.toLocaleString()}</p>
          </div>
          <div className="rounded-3xl bg-[#16161E] p-4">
            <p className="text-xs text-white/45">Total Board Views</p>
            <p className="mt-1 text-2xl font-semibold">{(desk.boardViews ?? 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="rounded-3xl bg-[#16161E] p-4">
          <div className="flex items-center justify-between text-sm">
            <span>Gig Views</span>
            <span className="text-white/60">{desk.views.toLocaleString()} / {desk.goal.toLocaleString()}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black">
            <div className="h-full rounded-full bg-[#3A8DFF] transition-[width] duration-500" style={{ width: `${width}%` }} />
          </div>
          <p className="mt-2 text-xs leading-5 text-white/40">Only Gig views count for Blue Tick. Job Board views are ignored. A gig view counts once a day, after 5 seconds.</p>
        </div>
        <div className="rounded-3xl bg-[#16161E] p-4">
          <div className="flex items-center justify-between text-sm">
            <span>My Boards</span>
            <span className="rounded-full bg-black px-3 py-1 text-xs text-white/70">Active Slots: {desk.activeRequests}/{desk.requestMax}</span>
          </div>
          <p className="mt-2 text-xs text-white/40">Listings remain active until deleted. Wallet & payout options are managed below.</p>
        </div>
        <div className="rounded-3xl bg-[#16161E] p-4">
          <p className="text-sm font-semibold">Boost a listing</p>
          <p className="mt-1 text-xs leading-5 text-white/45">$2 for 24 hours, $6 for 7 days, $20 for 30 days. Only you see Boost. Boost your listing for higher visibility. Submit payment receipt for instant admin activation.</p>
          {gigs.map((row) => (
            <Link key={row.id} to="/gigs/$id" params={{ id: row.id }} className="mt-2 block text-sm text-sky-300">{row.title}</Link>
          ))}
          {jobs.map((row) => (
            <Link key={row.id} to="/board/$id" params={{ id: row.id }} className="mt-2 block text-sm text-sky-300">{row.title}</Link>
          ))}
          {gigs.length + jobs.length === 0 ? <p className="mt-2 text-sm text-white/45">No listings yet.</p> : null}
        </div>
        <div className="rounded-3xl bg-[#16161E] p-4">
          <p className="text-sm font-semibold">Released earnings</p>
          {desk.earnings.length === 0 ? <p className="mt-1 text-sm text-white/45">Nothing released yet.</p> : desk.earnings.map((row) => (
            <p key={row.currency} className="mt-2 text-sm">{money(row.amount, row.currency)}</p>
          ))}
          <Link to="/wallet" className="mt-3 inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-black">Open Wallet</Link>
        </div>
        <div className="rounded-3xl bg-[#16161E] p-4">
          <p className="text-sm font-semibold">Withdrawals</p>
          {desk.withdrawals.length === 0 ? <p className="mt-1 text-sm text-white/45">No requests yet.</p> : desk.withdrawals.map((row, index) => (
            <p key={`${row.currency}-${index}`} className="mt-1 text-sm text-white/70">{money(row.amount, row.currency)} · {row.status}</p>
          ))}
        </div>
        {desk.canApply && (
          <button type="button" className="h-11 w-full rounded-full bg-[#fe2c55] text-sm font-semibold" onClick={() => applyBadge().then(() => { setNote("Apply for Blue Tick $2.50. Pay below."); load(desk.username); }).catch((err) => setNote(errText(err, t)))}>
            Apply for Blue Tick $2.50
          </button>
        )}
        {(desk.verify === "pay" || desk.verify === "review" || desk.verify === "approved") && (
          <div className="rounded-3xl bg-[#16161E] p-4">
            <p className="text-sm font-semibold">Blue Tick $2.50</p>
            <p className="text-xs text-white/50">Needs 5,000 gig views. Pay to Flare Official Account. $2.50 = {pkrForUsd(TICK_USD)} PKR. It stays until you delete a gig and total views fall below 2,000.</p>
            <DirectPay usd={TICK_USD} pkr={pkrForUsd(TICK_USD)} onPay={async (input) => {
              const paid = await payBadge({ data: { method: input.method, payer: input.payer, pin: input.pin, last4: input.last4 } });
              const text = "Payment Successful! $2.50 paid to Flare Official Account. Test mode: no real wallet or card was charged.";
              if (paid.review) {
                sessionStorage.setItem("flare_pay_note", text);
                void navigate({ to: "/founder/requests" });
                return;
              }
              setNote(text);
              load(desk.username);
            }} />
          </div>
        )}
        {desk.verify === "paid_wait" && <p className="text-sm text-white/70">Payment received. The badge turns on after confirmation.</p>}
        {desk.tick === "faded" && <p className="text-sm text-white/70">Blue Tick stays on your profile. It is removed only if you delete a gig and total views fall below 2,000.</p>}
        {note ? <p className="text-sm text-white/75">{note}</p> : null}
        {alerts.map((item) => (
          <p key={item.id} className="text-sm leading-5 text-white/80">{noteText(item.kind, item.displayName, item.title)}</p>
        ))}
      </div>
    </Phone>
  );
}
