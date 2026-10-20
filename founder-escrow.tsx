import { useEffect, useState } from "react";
import { hostLabel } from "@/lib/shola/escrow-links";
import { escrowQueue, escrowRelease } from "@/lib/shola/escrow";
import { openOriginal } from "@/components/shola/escrow-warning";

export function FounderEscrowPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof escrowQueue>>>([]);
  const [note, setNote] = useState("");

  function load() {
    escrowQueue().then(setRows).catch(() => setRows([]));
  }
  useEffect(load, []);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Escrow orders</h2>
      <p className="text-xs leading-5 text-white/45">Release only after the buyer accepts. The seller wallet is the released amount minus 15%.</p>
      {rows.map((row) => (
        <article key={row.id} className="rounded-2xl bg-[#16161E] p-3 text-sm">
          <p className="font-semibold">{row.title}</p>
          <p className="mt-1 text-white/70">@{row.buyer} bought from @{row.seller}</p>
          <p className="mt-1">${row.amount} · fee ${row.fee} · seller ${row.payout} · {row.status}{row.kind ? ` · ${row.kind}` : ""}</p>
          {row.status === "accepted" ? <p className="mt-1 text-xs font-semibold text-emerald-300">Ready to release payment</p> : null}
          <div className="mt-2 space-y-1">
            {row.links.map((url) => (
              <button key={url} type="button" className="block text-left text-sky-300 underline" onClick={() => openOriginal(url)}>{hostLabel(url)}</button>
            ))}
            {row.demo ? <button type="button" className="block text-left text-sky-300 underline" onClick={() => openOriginal(row.demo)}>Live demo</button> : null}
          </div>
          <div className="mt-3 flex gap-2">
            {["asked", "pending", "paid_wait"].includes(row.status) ? (
              <button type="button" className="h-9 rounded-full bg-white/10 px-3 text-xs" onClick={() => escrowRelease({ data: { id: row.id, action: "hold" } }).then(() => { setNote("Payment marked held."); load(); }).catch(() => setNote("Could not hold that order."))}>Mark funds held</button>
            ) : null}
            {row.status === "accepted" ? (
              <button type="button" className="h-9 rounded-full bg-white px-3 text-xs font-semibold text-black" onClick={() => escrowRelease({ data: { id: row.id, action: "release" } }).then((split) => { setNote(`Released. Seller ${split.payout}, Flare ${split.fee}.`); load(); }).catch(() => setNote("Release is only after the buyer accepts."))}>Release payment</button>
            ) : null}
          </div>
        </article>
      ))}
      {rows.length === 0 ? <p className="text-sm text-white/45">No open escrow orders.</p> : null}
      {note ? <p className="text-sm text-white/70">{note}</p> : null}
    </div>
  );
}
