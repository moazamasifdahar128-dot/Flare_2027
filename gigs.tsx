import { Link } from "@tanstack/react-router";
import { Play, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BoostMark, boostOn } from "@/components/shola/boost";
import { ListingFooter } from "@/components/shola/listing-foot";
import { WhatsAppChip } from "@/components/shola/wa-chip";
import { useCreateGate } from "@/components/shola/limit-modal";
import { Badges } from "@/components/shola/shell";
import { playableMedia } from "@/lib/shola/gig-upload";
import { gigDetailMedia } from "@/lib/shola/gig-slides";
import { usdText } from "@/lib/shola/money";
import { gigBoard, gigLike, gigSave } from "@/lib/shola/gigs";

export type GigCard = Awaited<ReturnType<typeof gigBoard>>[number];
export type GigSlide = { src: string; video: boolean; poster?: string };

const CATS = ["All", "AI Video", "Editing", "Duet", "Logo", "Animation"] as const;

function pinchDistance(touches: { item: (index: number) => { clientX: number; clientY: number } | null }) {
  const a = touches.item(0);
  const b = touches.item(1);
  if (!a || !b) return 0;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function clock(total: number) {
  const sec = Math.max(0, Math.round(total));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function SlideVideo({ src, active }: { src: string; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || active) return;
    video.pause();
  }, [active]);
  return (
    <video
      ref={ref}
      src={playableMedia(src)}
      controls
      playsInline
      preload="metadata"
      style={{ width: "100%", height: "auto", maxHeight: "70vh", objectFit: "contain", background: "black" }}
    />
  );
}

export function MediaStrip({ items, frame = "h-56", badge = false, seconds = 0, playable = false, locked = false, eager = true }: { items: GigSlide[]; frame?: string; badge?: boolean; seconds?: number; playable?: boolean; locked?: boolean; eager?: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const pinch = useRef<{ start: number; scale: number } | null>(null);
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const mediaKey = items.map((item) => `${item.video ? "v" : "p"}:${item.src.length}:${item.src.slice(-32)}`).join("|");
  useEffect(() => {
    setIndex(0);
    setScale(1);
  }, [mediaKey]);
  if (!items.length) return <div className={`grid ${frame} place-items-center bg-black text-xs text-white/40`}>No photo</div>;

  function onScroll() {
    const node = scroller.current;
    if (!node || !node.clientWidth) return;
    const next = Math.max(0, Math.min(items.length - 1, Math.round(node.scrollLeft / node.clientWidth)));
    if (next !== index) {
      setIndex(next);
      setScale(1);
    }
  }

  return (
    <div>
      <div
        ref={scroller}
        onScroll={onScroll}
        className={`flex snap-x snap-mandatory no-scrollbar bg-black ${scale > 1 ? "overflow-hidden" : "overflow-x-auto"}`}
        onTouchStart={(event) => {
          if (items[index]?.video) return;
          if (event.touches.length === 2) pinch.current = { start: pinchDistance(event.touches), scale };
        }}
        onTouchMove={(event) => {
          if (items[index]?.video || event.touches.length !== 2 || !pinch.current?.start) return;
          const next = pinch.current.scale * (pinchDistance(event.touches) / pinch.current.start);
          setScale(Math.max(1, Math.min(4, next)));
        }}
        onTouchEnd={() => {
          pinch.current = null;
        }}
      >
        {items.map((item, itemIndex) => {
          const length = !item.video && badge && itemIndex === 0 ? seconds : 0;
          const showBadge = !item.video && badge && itemIndex === 0;
          const slideKey = `${itemIndex}:${item.video ? "video" : "image"}:${item.src}`;
          return (
            <div key={slideKey} className={`relative flex w-full shrink-0 snap-center items-center justify-center overflow-hidden bg-black ${frame}`}>
              {item.video && playable ? (
                <SlideVideo src={item.src} active={index === itemIndex} />
              ) : item.video ? (
                <div className="absolute inset-0 bg-black" />
              ) : item.src ? (
                <img
                  src={item.src}
                  alt=""
                  draggable={false}
                  decoding="async"
                  loading={eager && itemIndex === 0 ? "eager" : "lazy"}
                  style={{ transform: `scale(${index === itemIndex ? scale : 1})` }}
                  className={`absolute inset-0 h-full w-full origin-center object-contain ${locked ? "scale-105 blur-md" : ""}`}
                />
              ) : (
                <div className="absolute inset-0 bg-[#1c1c27]" />
              )}
              {showBadge && (
                <span className={`pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/70 text-white ${length ? "h-8 rounded-full px-2" : "grid size-8 place-items-center rounded-full"}`}>
                  <Play className="size-4 fill-white" />
                  {length ? <span className="text-xs font-semibold tabular-nums">{clock(length)}</span> : null}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {items.length > 1 && (
        <div className="pointer-events-none mt-2 flex justify-center gap-1.5" aria-hidden="true">
          {items.map((_, itemIndex) => (
            <span key={itemIndex} className={`size-1.5 rounded-full ${index === itemIndex ? "bg-white" : "bg-white/30"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export function GigTile({ row, onRemove }: { row: GigCard; onRemove?: () => void }) {
  const cover = row.slides[0] || row.thumb;
  return (
    <div className="overflow-hidden rounded-xl bg-[#16161E]">
      <Link to="/gigs/$id" params={{ id: row.id }} className="block">
        <div className="relative aspect-[4/5] bg-black">
          {cover ? <img src={cover} alt="" decoding="async" loading="lazy" className="size-full object-contain" /> : <div className="grid size-full place-items-center text-xs text-white/40">No photo</div>}
          {row.hasVideo && (
            <span className="pointer-events-none absolute bottom-2 left-2 grid size-8 place-items-center rounded-full bg-black/70 text-white">
              <Play className="size-4 fill-white" />
            </span>
          )}
        </div>
        <p className="line-clamp-2 p-2 text-xs font-semibold text-white">{row.title}</p>
        <p className="px-2 text-[11px] text-white/45">@{row.username} <Badges verified={row.verified} /></p>
        <p className="px-2 pb-2 text-xs text-white/70">{usdText(row.priceUsd)} · {row.days}</p>
        {row.mine && row.adminHold ? <p className="px-2 pb-2 text-[10px] font-semibold leading-4 text-amber-200">Hidden by Admin - Under Review</p> : null}
      </Link>
      {!row.mine && (
        <div className="flex gap-2 px-2 pb-3">
          <Link to="/chat/$userId/$gigId" params={{ userId: row.ownerId, gigId: row.id }} search={{ box: "gig" }} className="grid h-9 flex-1 place-items-center rounded-full border border-sky-400/70 text-xs font-semibold text-sky-200">Message</Link>
          {(row.waListed || row.waOpen) ? <WhatsAppChip gigId={row.id} open={row.waOpen} number={row.whatsapp} listed={row.waListed} compact /> : null}
        </div>
      )}
      {onRemove && (
        <button type="button" className="w-full pb-2 text-xs text-white/60" onClick={onRemove}>Unsave</button>
      )}
    </div>
  );
}

export function GigsPanel({ standalone = false }: { standalone?: boolean }) {
  const { openGig, modal } = useCreateGate();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<(typeof CATS)[number]>("All");
  const [sort, setSort] = useState<"new" | "hot">("new");
  const [rows, setRows] = useState<GigCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [end, setEnd] = useState(false);

  function load(next = q, cat = category, offset = 0) {
    if (offset === 0) {
      setLoading(true);
      setEnd(false);
    } else setMore(true);
    gigBoard({ data: { q: next, category: cat, offset } })
      .then((list) => {
        setRows((cur) => {
          if (offset === 0) return list;
          const seen = new Set(cur.map((item) => item.id));
          return [...cur, ...list.filter((item) => !seen.has(item.id))];
        });
        setEnd(list.length < 20);
      })
      .catch(() => {
        if (offset === 0) setRows([]);
      })
      .finally(() => {
        setLoading(false);
        setMore(false);
      });
  }

  useEffect(() => {
    const id = window.setTimeout(() => load(q, category), q ? 200 : 0);
    return () => window.clearTimeout(id);
  }, [q, category]);

  const [flash, setFlash] = useState("");
  useEffect(() => {
    try {
      const text = sessionStorage.getItem("flare_toast");
      if (!text) return;
      sessionStorage.removeItem("flare_toast");
      setFlash(text);
      const id = window.setTimeout(() => setFlash(""), 2400);
      return () => window.clearTimeout(id);
    } catch {
      return undefined;
    }
  }, []);

  return (
    <div
      className={`h-full overflow-y-auto bg-black px-4 pb-8 ${standalone ? "pt-4" : "pt-28"}`}
      onScroll={(event) => {
        const node = event.currentTarget;
        if (loading || more || end) return;
        if (node.scrollHeight - node.scrollTop - node.clientHeight > 520) return;
        load(q, category, rows.length);
      }}
    >
      <h1 className="text-2xl font-semibold">Gigs</h1>
      {flash ? <p className="mt-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-black">{flash}</p> : null}
      <p className="mb-3 text-xs text-white/50">Find the right freelancer for your work.</p>
      <div className="flex items-center gap-2 rounded-xl bg-[#16161E] px-3">
        <Search className="size-4 text-white/50" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Gigs (e.g. Duet, Shoutout, Editing)..."
          className="h-11 w-full bg-transparent text-base text-white outline-none placeholder:text-white/40"
        />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {CATS.map((item) => (
          <button key={item} type="button" onClick={() => setCategory(item)} className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold ${category === item ? "bg-white text-black" : "bg-[#16161E] text-white/80"}`}>
            {item}
          </button>
        ))}
        <button type="button" onClick={() => setSort("new")} className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold ${sort === "new" ? "bg-white text-black" : "bg-[#16161E] text-white/80"}`}>Newest</button>
        <button type="button" onClick={() => setSort("hot")} className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold ${sort === "hot" ? "bg-white text-black" : "bg-[#16161E] text-white/80"}`}>Popular</button>
      </div>
      <button type="button" onClick={() => void openGig()} className="mt-3 inline-flex h-10 items-center rounded-lg bg-gradient-to-r from-cyan-400 to-pink-500 px-4 text-sm font-semibold text-black">
        Offer a gig
      </button>
      {loading && (
        <div className="mt-4 animate-pulse space-y-4">
          <div className="h-64 rounded-2xl bg-white/10" />
          <div className="h-64 rounded-2xl bg-white/10" />
        </div>
      )}
      {!loading && rows.length === 0 && (
        <p className="mt-8 text-center text-sm text-white/70">{q.trim() || category !== "All" ? "No gigs match that search." : "No gigs yet. Offer the first one."}</p>
      )}
      <div className="mt-4 space-y-4">
        {(sort === "hot" ? [...rows].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)) : rows).map((row, index) => {
          const photos = row.slides.length ? row.slides : row.thumb ? [row.thumb] : [];
          const media: GigSlide[] = gigDetailMedia(photos, []).map((item) => ({ src: item.url, video: item.type === "video" }));
          return (
            <article key={row.id} className={`overflow-hidden rounded-2xl bg-[#16161E] ${boostOn(row.boostUntil) ? "boost-card" : ""}`}>
              <MediaStrip items={media} frame="h-[70dvh]" badge={row.hasVideo} eager={index === 0} />
              <div className="flex items-center gap-2 px-3 pt-3">
                <span className={`relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-black text-xs text-white ${row.founder ? "founder-mini" : ""}`}>
                  {row.avatar ? <img src={row.avatar} alt="" decoding="async" loading="lazy" className="size-full object-cover" /> : row.displayName.slice(0, 1)}
                  {row.online && <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-emerald-400 ring-2 ring-[#16161E]" />}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-sm font-medium text-white">
                    <span className="truncate">{row.displayName}</span>
                    <Badges verified={row.verified} founder={row.founder} />
                  </p>
                  <p className="text-[11px] text-white/50">@{row.username} · {row.online ? "Online" : "Offline"}</p>
                </div>
              </div>
              <Link to="/gigs/$id" params={{ id: row.id }} className="block px-3 pt-2 text-base font-semibold leading-6 text-white">
                {row.title}
              </Link>
              {boostOn(row.boostUntil) ? <div className="px-3 pt-2"><BoostMark until={row.boostUntil} /></div> : null}
              <div className="mt-2 flex items-center justify-between px-3">
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-semibold text-white">{usdText(row.priceUsd)}</span>
                <span className="text-xs text-white/70">{row.days}{row.views != null ? ` · ${row.views} views` : ""}</span>
              </div>
              {!row.mine && (
                <div className="mt-2 flex gap-2 px-3">
                  <Link to="/chat/$userId/$gigId" params={{ userId: row.ownerId, gigId: row.id }} search={{ box: "gig" }} className="grid h-10 flex-1 place-items-center rounded-full border border-sky-400/70 text-sm font-semibold text-sky-200">Message</Link>
                  {(row.waListed || row.waOpen) ? <WhatsAppChip gigId={row.id} open={row.waOpen} number={row.whatsapp} listed={row.waListed} /> : null}
                </div>
              )}
              <ListingFooter
                kind="gig"
                id={row.id}
                createdAt={row.createdAt}
                likes={row.likes}
                liked={row.liked}
                saved={row.saved}
                mine={row.mine}
                title={row.title}
                onLike={async () => {
                  const next = await gigLike({ data: row.id });
                  setRows((list) => list.map((item) => (item.id === row.id ? { ...item, likes: next.likes, liked: next.liked } : item)));
                  return Boolean(next.liked);
                }}
                onSave={async () => {
                  const next = await gigSave({ data: row.id });
                  setRows((list) => list.map((item) => (item.id === row.id ? { ...item, saved: next.saved } : item)));
                }}
              />
            </article>
          );
        })}
      </div>
      {more && (
        <div className="mt-4 animate-pulse space-y-4" role="status" aria-label="Loading more gigs">
          <div className="h-40 rounded-2xl bg-white/10" />
        </div>
      )}
      {modal}
    </div>
  );
}
