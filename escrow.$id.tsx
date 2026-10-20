import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone } from "@/components/shola/shell";
import { TopBack } from "@/components/flare/page";
import { DeliveryLinks, EscrowDeliveryForm } from "@/components/shola/escrow-delivery";
import { EscrowWarning } from "@/components/shola/escrow-warning";
import { escrowAccept, escrowOne } from "@/lib/shola/escrow";

export const Route = createFileRoute("/escrow/$id")({ component: EscrowOrder });

function EscrowOrder() {
  const { id } = Route.useParams();
  const [row, setRow] = useState<Awaited<ReturnType<typeof escrowOne>>>(null);
  const [note, setNote] = useState("");

  function load() {
    escrowOne({ data: id }).then(setRow).catch(() => setRow(null));
  }
  useEffect(load, [id]);

  return (
    <Phone bare>
      <div className="px-4 pt-4 pb-16">
        <TopBack />
        {!row ? <p className="mt-6 text-sm text-white/50">This order is not available.</p> : (
          <>
            <h1 className="mt-3 text-2xl font-semibold">{row.title}</h1>
            <p className="mt-1 text-sm text-white/55">@{row.buyer} → @{row.seller} · ${row.amount} · fee ${row.fee} · seller ${row.payout}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-white/40">{row.status}</p>
            {row.delivery ? (
              <>
                <div className="mt-4">
                  <EscrowWarning expiresAt={row.delivery.expiresAt} kind={row.delivery.kind} locked={row.delivery.locked} />
                </div>
                <p className="mt-3 text-sm leading-6 text-white/75">{row.delivery.message}</p>
                {row.delivery.locked && row.role === "buyer" ? null : <DeliveryLinks links={row.delivery.links} demo={row.delivery.demo} />}
              </>
            ) : null}
            {row.role === "seller" && row.status === "held" ? <EscrowDeliveryForm dealId={row.id} onDone={() => { setNote("Delivery sent. The buyer can open the original link."); load(); }} /> : null}
            {row.role === "seller" && !row.delivery && row.status !== "held" ? <p className="mt-4 text-sm text-white/50">Delivery opens after the founder marks the payment held.</p> : null}
            {row.role === "buyer" && row.status === "delivered" ? (
              <button type="button" className="mt-4 h-12 w-full rounded-full bg-white text-sm font-semibold text-black" onClick={() => escrowAccept({ data: row.id }).then(() => { setNote("Accepted. The founder can release the payment."); load(); }).catch(() => setNote("Accept did not go through."))}>Accept and complete</button>
            ) : null}
            {note ? <p className="mt-3 text-sm text-white/70">{note}</p> : null}
          </>
        )}
      </div>
    </Phone>
  );
}
