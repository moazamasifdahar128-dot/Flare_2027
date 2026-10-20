import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopBack } from "@/components/flare/page";
import { useEffect, useState } from "react";
import { BoostMark, boostOn } from "@/components/shola/boost";
import { ListingFooter } from "@/components/shola/listing-foot";
import { Phone } from "@/components/shola/shell";
import { deleteRequest, jobLike, jobSave, requestOne } from "@/lib/shola/board";
import { escrowOpen } from "@/lib/shola/escrow";
import { recordListingView } from "@/lib/shola/profile-desk";

export const Route = createFileRoute("/board/$id")({ component: RequestPage });

function RequestPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<Awaited<ReturnType<typeof requestOne>>>(null);
  const [phase, setPhase] = useState<"load" | "done">("load");

  useEffect(() => {
    setPhase("load");
    requestOne({ data: id }).then(setRow).catch(() => setRow(null)).finally(() => setPhase("done"));
  }, [id]);

  useEffect(() => {
    const view = window.setTimeout(() => {
      recordListingView({ data: { kind: "board", id } }).catch(() => undefined);
    }, 5000);
    return () => window.clearTimeout(view);
  }, [id]);

  return (
    <Phone>
      <div className="h-full overflow-y-auto px-4 pt-3 pb-10">
        <TopBack />
        {!row && phase === "load" ? <div className="mt-4 h-40 animate-pulse rounded-2xl bg-white/10" /> : null}
        {!row && phase === "done" ? <p className="mt-8 text-sm text-white/60">This request is not available.</p> : null}
        {row ? (
          <>
            <div className="mt-3 flex items-center gap-2">
              <Link to="/u/$username" params={{ username: row.username }} className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#16161E] text-sm">
                {row.avatar ? <img src={row.avatar} alt="" className="size-full object-cover" /> : row.displayName.slice(0, 1)}
              </Link>
              <div>
                <p className="font-medium">{row.displayName}</p>
                <p className="text-xs text-white/45">@{row.username}</p>
              </div>
            </div>
            <h1 className="mt-4 text-xl font-semibold">{row.title}</h1>
            {boostOn(row.boostUntil) ? <div className="mt-2"><BoostMark until={row.boostUntil} /></div> : null}
            <p className="mt-2 text-sm leading-6 text-white/75">{row.body}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
              <span className="rounded-full bg-[#16161E] px-2 py-1">{row.category}</span>
              <span className="rounded-full bg-[#16161E] px-2 py-1">{row.currency === "USD" ? `$${row.price}` : `${row.price} ${row.currency}`}</span>
              {row.deadline ? <span className="rounded-full bg-[#16161E] px-2 py-1">{row.deadline}</span> : null}
            </div>
            {row.mine ? (
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/50">
                <p>Boards remain active until deleted.</p>
                <span className="flex shrink-0 gap-3">
                  <button
                    type="button"
                    className="font-semibold text-red-300"
                    onClick={() => {
                      if (!window.confirm("Delete this board? It is removed from every saved list.")) return;
                      deleteRequest({ data: row.id }).then(() => navigate({ to: "/board", search: { kind: "", category: "", posted: "" } }));
                    }}
                  >
                    Delete
                  </button>
                  <Link to="/board/new" search={{ edit: row.id }} className="font-semibold text-sky-300">Edit</Link>
                </span>
              </div>
            ) : null}
            {!row.mine ? (
              <div className="mt-4 flex gap-2">
                <Link to="/chat/$userId/$gigId" params={{ userId: row.ownerId, gigId: row.id }} search={{ box: "job" }} className="grid h-11 flex-1 place-items-center rounded-full border border-sky-400/70 text-sm font-semibold text-sky-200">Message</Link>
                <button type="button" className="h-11 flex-1 rounded-full bg-[#16161E] text-sm font-semibold" onClick={() => escrowOpen({ data: row.id }).then((deal) => navigate({ to: "/escrow/$id", params: { id: deal.id } })).catch(() => undefined)}>Escrow</button>
              </div>
            ) : null}
            <p className="mt-3 text-xs leading-5 text-white/45">Requests are text only. Message limit is 3 until a reply, then the chat stays open. WhatsApp unlock ($3) stays on gigs, where a number is stored.</p>
            <ListingFooter
              kind="request"
              id={row.id}
              createdAt={row.createdAt}
              likes={row.likes}
              liked={row.liked}
              saved={row.saved}
              mine={row.mine}
              title={row.title}
              onLike={async () => {
                const next = await jobLike({ data: row.id });
                setRow((current) => (current ? { ...current, likes: next.likes, liked: next.liked } : current));
                return next.liked;
              }}
              onSave={async () => {
                const next = await jobSave({ data: row.id });
                setRow((current) => (current ? { ...current, saved: next.saved } : current));
              }}
            />
          </>
        ) : null}
      </div>
    </Phone>
  );
}
