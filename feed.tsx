import { Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, Flag, Heart, MessageCircle, Search, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar, Badges, Mark, errText } from "@/components/shola/shell";
import { GIFTS } from "@/lib/shola/gifts";
import { useI18n } from "@/lib/shola/i18n";
import {
  addComment,
  countView,
  watchStop,
  feed,
  listComments,
  pinComment,
  pollCounts,
  postMedia,
  recordShare,
  removeComment,
  report,
  storyTray,
  toggleLike,
  toggleSave,
  tapLive,
  sendGift,
  votePoll,
} from "@/lib/shola/server";

type Card = Awaited<ReturnType<typeof feed>>[number];
type Tray = Awaited<ReturnType<typeof storyTray>>;
const feedSnaps = new Map<string, { posts: Card[]; stories: Tray }>();

function compact(n: number) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function Feed({ focus = "" }: { focus?: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const first = feedSnaps.get(`foryou:${focus}`);
  const [mode, setMode] = useState<"foryou" | "following">("foryou");
  const [posts, setPosts] = useState<Card[]>(first?.posts ?? []);
  const [stories, setStories] = useState<Tray>(first?.stories ?? []);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(!first);
  const scroller = useRef<HTMLDivElement>(null);
  const ticket = useRef(0);
  const storyNames = new Set(stories.map((s) => s.username));

  function load(next = mode) {
    const key = `${next}:${focus}`;
    const mine = ++ticket.current;
    const hit = feedSnaps.get(key);
    if (hit) {
      setPosts(hit.posts);
      setStories(hit.stories);
      setLoading(false);
    } else setLoading(true);
    Promise.all([feed({ data: { mode: next, id: focus } }), storyTray()])
      .then(([rows, tray]) => {
        if (mine !== ticket.current) return;
        feedSnaps.set(key, { posts: rows, stories: tray });
        setPosts(rows);
        setStories(tray);
      })
      .catch(() => {
        if (mine !== ticket.current) return;
        if (!feedSnaps.has(key)) setPosts([]);
      })
      .finally(() => {
        if (mine === ticket.current) setLoading(false);
      });
  }

  useEffect(() => {
    load(mode);
  }, [mode, focus]);

  const tab = (id: typeof mode, label: string) => (
    <button type="button" onClick={() => setMode(id)} className={`relative pb-1 ${mode === id ? "font-semibold text-white" : "text-white/70"}`}>
      {label}
      {mode === id && <span className="absolute inset-x-0 -bottom-0.5 mx-auto h-0.5 w-5 rounded-full bg-white" />}
    </button>
  );

  return (
    <div className="relative h-[calc(100dvh-4.25rem)] bg-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3">
        <div className="pointer-events-auto grid grid-cols-3 items-center">
          <span />
          <Link to="/" aria-label="Flare" className="justify-self-center text-white">
            <Mark className="size-8" />
          </Link>
          <Link to="/search" aria-label={t.search} className="justify-self-end text-white">
            <Search className="size-6" />
          </Link>
        </div>
        <div className="pointer-events-auto mt-3 flex items-center justify-center gap-5 text-sm text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
          {tab("foryou", t.forYou)}
        </div>
      </div>
      {loading && <div className="grid h-full place-items-center text-sm text-white/70">…</div>}
      {!loading && posts.length === 0 && (
        <div className="grid h-full place-items-center px-8 text-center">
          <p className="text-lg leading-7 text-white">{t.empty}</p>
        </div>
      )}
      <div ref={scroller} className="h-full snap-y snap-mandatory overflow-y-auto no-scrollbar">
        {posts.map((post) => (
          <Slide
            key={post.id}
            post={post}
            muted={muted}
            setMuted={setMuted}
            hasStory={storyNames.has(post.username)}
            onNext={(id) => {
              const node = scroller.current?.querySelector(`[data-id="${id}"]`);
              if (node) node.scrollIntoView({ behavior: "auto", block: "start" });
              else navigate({ to: "/v/$id", params: { id } });
            }}
            source={mode === "following" ? "following" : "foryou"}
          />
        ))}
      </div>
    </div>
  );
}

function Slide({
  post,
  muted,
  setMuted,
  hasStory,
  onNext,
  source,
}: {
  post: Card;
  muted: boolean;
  setMuted: (v: boolean) => void;
  hasStory: boolean;
  onNext: (id: string) => void;
  source: string;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [saved, setSaved] = useState(post.saved);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState("");
  const [face, setFace] = useState<"love" | "sad" | "joy" | "">(post.liked ? "love" : "");
  const [locked, setLocked] = useState(false);
  const [active, setActive] = useState(false);
  const touch = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let opened = 0;
    const send = () => {
      if (!opened || post.kind !== "video") return;
      const seconds = (Date.now() - opened) / 1000;
      const video = node.querySelector("video") as HTMLVideoElement | null;
      const duration = video && Number.isFinite(video.duration) ? video.duration : 0;
      watchStop({ data: { id: post.id, seconds, duration, source } }).catch(() => undefined);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        const on = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0.7);
        setActive(on);
        if (on) {
          if (!opened) {
            opened = Date.now();
            countView({ data: { id: post.id, seconds: 0, source } }).catch(() => undefined);
          }
          return;
        }
        if (opened) {
          send();
          opened = 0;
        }
      },
      { threshold: [0.7] },
    );
    const pulse = window.setInterval(() => {
      if (opened) send();
    }, 15000);
    io.observe(node);
    return () => {
      send();
      window.clearInterval(pulse);
      io.disconnect();
    };
  }, [post.id, post.kind, post.ratio, source]);

  function cycle() {
    if (locked) return;
    toggleLike({ data: post.id }).then((row) => {
      setLiked(row.liked);
      setLikes((n) => n + (row.liked && !liked ? 1 : !row.liked && liked ? -1 : 0));
      if (row.mood === "sad") setFace("sad");
      else if (row.mood === "joy" || row.mood === "lock") {
        setFace("joy");
        setLocked(true);
      } else setFace("love");
    }).catch(() => undefined);
  }

  function openProfile() {
    navigate({ to: "/u/$username", params: { username: post.username } });
  }

  async function share() {
    const url = `${location.origin}/v/${post.id}`;
    if (navigator.share) await navigator.share({ title: post.title || post.displayName, url }).catch(() => undefined);
    else await navigator.clipboard.writeText(url);
    recordShare({ data: post.id }).catch(() => undefined);
  }

  return (
    <article
      ref={ref}
      data-id={post.id}
      className="relative h-full snap-start overflow-hidden bg-black"
      onTouchStart={(e) => {
        touch.current = { x: e.changedTouches[0]?.clientX ?? 0, y: e.changedTouches[0]?.clientY ?? 0 };
      }}
      onTouchEnd={(e) => {
        const dx = (e.changedTouches[0]?.clientX ?? 0) - touch.current.x;
        const dy = (e.changedTouches[0]?.clientY ?? 0) - touch.current.y;
        if (dx > 70 && Math.abs(dx) > Math.abs(dy)) openProfile();
      }}
    >
      {import.meta.env.VITE_ADS === "1" && (
        <div className="pointer-events-none absolute inset-x-4 top-16 z-10 rounded-xl bg-black/50 px-3 py-2 text-[11px] text-fg">Sponsored</div>
      )}
      <Stage post={post} muted={muted} active={active} onFinished={() => post.nextId && onNext(post.nextId)} />
      {post.kind === "live" && <LivePad postId={post.id} />}
      <ClipMarks overlay={post.overlay} />
      {post.aiMade && (
        <span className="absolute start-4 top-24 z-10 rounded-full bg-black/60 px-3 py-1 text-xs">AI Generated</span>
      )}
      {post.copyrighted && (
        <span className="absolute start-4 top-36 z-10 rounded-full bg-red-700 px-2 py-1 text-xs font-semibold text-white">Copyright Strike</span>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 pe-20 pt-16">
        <Link to="/u/$username" params={{ username: post.username }} className="pointer-events-auto inline-flex items-center gap-1 text-[15px] font-semibold text-white">
          @{post.username}
          <Badges verified={post.verified} starred={post.starred} founder={post.founder} />
        </Link>
        <Caption text={[post.title, post.body].filter(Boolean).join(" ")} />
        {post.todayLine && <p className="mt-1 text-xs text-primary">{post.todayLine}</p>}
        {post.branded && <p className="mt-1 text-xs text-white/70">Promotional</p>}
        {post.place && <p className="mt-1 text-xs text-white/80">{post.place}</p>}
        {post.linkUrl && (
            <a href={post.linkUrl} target="_blank" rel="noreferrer" className="pointer-events-auto mt-1 block truncate text-xs text-primary" onClick={(e) => e.stopPropagation()}>
              {post.linkUrl.replace(/^https:\/\//, "")}
            </a>
        )}
        {post.sound && (
          <Link to="/sound" search={{ q: post.sound }} className="pointer-events-auto mt-2 inline-flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
            <span className="grid size-8 place-items-center rounded-full border border-primary text-[10px]">♪</span>
            {post.sound}
          </Link>
        )}
        {post.nextId && (
          <button type="button" className="pointer-events-auto mt-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black" onClick={(event) => { event.stopPropagation(); onNext(post.nextId); }}>
            Watch Part 2
          </button>
        )}
        {post.kind === "youtube" && (
          <p className="mt-2 text-xs leading-5 text-muted">Views on this YouTube video stay on YouTube. They count as zero toward Flare rewards.</p>
        )}
        {post.kind === "tiktok" && post.externalId && (
          <a href={`https://www.tiktok.com/video/${post.externalId}`} className="pointer-events-auto mt-2 inline-block text-sm text-primary" target="_blank" rel="noreferrer">
            {t.openTiktok}
          </a>
        )}
        {post.quoteTitle && <p className="mt-2 rounded-xl bg-black/50 px-3 py-2 text-xs text-muted">{post.quoteTitle}</p>}
      </div>
      <div className="absolute end-3 bottom-6 z-10 grid justify-items-center gap-3">
        <Link to="/u/$username" params={{ username: post.username }} className="relative mb-1" onClick={(e) => e.stopPropagation()}>
          <span className={`grid rounded-full bg-amber-400 ${hasStory ? "p-[3px]" : "p-[2px]"}`}>
            <Avatar src={post.avatar} name={post.displayName} glow={post.founder} />
          </span>
        </Link>
        <Rail label={post.hideLikes ? "" : compact(likes)} onClick={() => cycle()}>
          <span className="grid size-8 place-items-center text-2xl leading-none">
            {face === "sad" ? "😢" : face === "joy" ? "😍" : <Heart className={`size-8 ${liked || face === "love" ? "fill-rose-500 text-rose-500" : "text-white"}`} />}
          </span>
        </Rail>
        <Rail label={compact(post.comments)} onClick={() => setOpen(true)}>
          <MessageCircle className="size-8 text-white" />
        </Rail>
        <Rail
          label=""
          onClick={() => {
            setSaved(!saved);
            toggleSave({ data: post.id }).catch(() => undefined);
          }}
        >
          <Bookmark className={`size-8 text-white ${saved ? "fill-white" : ""}`} />
        </Rail>
        <Rail label="" onClick={share}>
          <Share2 className="size-8 text-white" />
        </Rail>
        <Link
          to="/sound"
          search={{ q: post.sound }}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 grid size-11 place-items-center"
          aria-label={post.sound || "Audio"}
        >
          <span className="grid size-11 animate-spin place-items-center rounded-full bg-[#1c1c1c] ring-2 ring-white/80" style={{ animationDuration: "4s" }}>
            <span className="grid size-5 place-items-center overflow-hidden rounded-full bg-zinc-800">
              {post.thumb || post.avatar ? <img src={post.thumb || post.avatar} alt="" className="size-full object-cover" /> : <span className="text-[10px] text-white">♪</span>}
            </span>
          </span>
        </Link>
        <button type="button" aria-label={t.report} className="text-white/80" onClick={(e) => { e.stopPropagation(); setMenu(true); }}>
          <Flag className="size-4" />
        </button>
      </div>
      {open && <Comments postId={post.id} mine={post.mine} onClose={() => setOpen(false)} />}
      {menu && (
        <div className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl bg-surface p-4">
          <p className="mb-3 text-sm font-semibold">{t.report}</p>
          {(["copyright", "nsfw", "spam", "abuse"] as const).map((reason) => (
            <button
              key={reason}
              type="button"
              className="block h-11 w-full text-start text-sm"
              onClick={(e) => {
                e.stopPropagation();
                report({ data: { postId: post.id, reason } })
                  .then(() => setNote(t.reported))
                  .catch(() => undefined);
                setMenu(false);
              }}
            >
              {t[reason]}
            </button>
          ))}
          {post.allowDownload && post.kind === "video" && (
            <button
              type="button"
              className="block h-11 w-full text-start text-sm"
              onClick={(e) => {
                e.stopPropagation();
                postMedia({ data: post.id }).then((row) => {
                  if (!row?.media) return;
                  const a = document.createElement("a");
                  a.href = row.media;
                  a.download = "flare-video.mp4";
                  a.click();
                }).catch(() => undefined);
                setMenu(false);
              }}
            >
              Save video
            </button>
          )}
          <button type="button" className="block h-11 w-full text-start text-sm" onClick={(e) => { e.stopPropagation(); setMuted(!muted); setMenu(false); }}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button type="button" className="mt-2 text-sm text-muted" onClick={(e) => { e.stopPropagation(); setMenu(false); }}>
            {t.reject}
          </button>
        </div>
      )}
    </article>
  );
}

function ClipMarks({ overlay }: { overlay: string }) {
  let text = "";
  let sticker = "";
  try {
    const parsed = JSON.parse(overlay || "{}") as { text?: string; sticker?: string };
    text = String(parsed.text || "").slice(0, 80);
    sticker = String(parsed.sticker || "").slice(0, 8);
  } catch {
    text = "";
  }
  if (!text && !sticker) return null;
  return (
    <>
      {sticker && <p className="pointer-events-none absolute start-1/2 top-1/3 z-10 -translate-x-1/2 text-5xl">{sticker}</p>}
      {text && <p className="pointer-events-none absolute inset-x-8 top-[42%] z-10 text-center text-xl font-semibold text-white drop-shadow">{text}</p>}
    </>
  );
}

function Caption({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const long = text.length > 48 || text.includes("\n");
  const line = text.replace(/\s+/g, " ");
  return (
    <div className="mt-1 text-sm leading-5 text-white">
      <p className={open ? "whitespace-pre-wrap" : "truncate"}>{open ? text : line}</p>
      {long && (
        <button type="button" className="pointer-events-auto font-semibold text-white/80" onClick={() => setOpen((v) => !v)}>
          {open ? "Less" : "... More"}
        </button>
      )}
    </div>
  );
}

function Rail({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} className="grid justify-items-center text-fg">
      {children}
      {label && <span className="text-[11px]">{label}</span>}
    </button>
  );
}

function LivePad({ postId }: { postId: string }) {
  const { t } = useI18n();
  const [n, setN] = useState(0);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState("");

  function tap() {
    tapLive({ data: postId })
      .then((row) => {
        setN(row.n);
        setNote(row.capped ? "Maximum live stream likes reached for this session" : "");
      })
      .catch((err) => setNote(errText(err, t)));
  }

  return (
    <>
      <div className="absolute end-3 top-28 z-20 grid justify-items-center gap-2">
        <button type="button" onClick={tap} className="grid size-12 place-items-center rounded-full bg-rose-600 text-white shadow-[0_0_18px_rgba(244,63,94,0.65)]">♥</button>
        <span className="text-xs text-white">{n}</span>
        <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-black/60 px-3 py-1 text-xs text-white">Gifts</button>
      </div>
      {note && <p className="absolute inset-x-6 top-24 z-20 text-center text-xs text-white">{note}</p>}
      {flash && <p className="pointer-events-none absolute inset-x-0 top-1/3 z-20 text-center text-lg font-semibold text-amber-200">{flash}</p>}
      {open && (
        <div className="absolute inset-x-0 bottom-0 z-30 max-h-[60%] overflow-y-auto rounded-t-3xl bg-[#16161E] p-4">
          <button type="button" className="mb-3 text-sm text-muted" onClick={() => setOpen(false)}>Close</button>
          <div className="grid grid-cols-2 gap-2">
            {GIFTS.map((gift) => (
              <button
                key={gift.id}
                type="button"
                className="rounded-2xl bg-bg p-3 text-start"
                onClick={() => {
                  sendGift({ data: { postId, kind: gift.id } })
                    .then(() => {
                      setFlash(gift.name);
                      window.setTimeout(() => setFlash(""), 800);
                    })
                    .catch((err) => setNote(errText(err, t)));
                }}
              >
                <p className="font-medium">{gift.name}</p>
                <p className="text-xs text-muted">{gift.coins} coins</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Stage({ post, muted, active, onFinished }: { post: Card; muted: boolean; active: boolean; onFinished: () => void }) {
  const [media, setMedia] = useState<{ media: string; extra: string; kind: string; externalId: string } | null>(null);
  const [photo, setPhoto] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hold, setHold] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const moved = useRef(false);
  const downAt = useRef(0);
  useEffect(() => {
    moved.current = false;
    setPaused(false);
    setHold(false);
  }, [post.id]);
  function goNext() {
    if (!post.nextId || moved.current) return;
    moved.current = true;
    onFinished();
  }
  useEffect(() => {
    if (post.kind === "text" || post.kind === "poll") return;
    postMedia({ data: post.id }).then(setMedia).catch(() => undefined);
  }, [post.id, post.kind]);
  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    if (active && !paused && !hold) node.play().catch(() => undefined);
    else node.pause();
  }, [active, media, paused, hold]);

  let body: React.ReactNode = <div className="h-full w-full bg-black" />;
  if (post.kind === "live") {
    body = (
      <div className="grid h-full place-items-center bg-gradient-to-b from-[#2a0d18] to-black">
        <p className="text-sm font-semibold tracking-[0.3em] text-rose-400">LIVE</p>
      </div>
    );
  } else if (post.kind === "text" || post.kind === "poll") {
    body = (
      <div className="grid h-full place-items-center bg-surface px-8 text-center">
        <p className="text-2xl font-semibold leading-9">{post.title || post.body}</p>
        {post.kind === "poll" && <Poll postId={post.id} options={post.pollOptions} />}
      </div>
    );
  } else if (post.kind === "youtube" && active && post.externalId) {
    body = (
      <iframe
        className="h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${post.externalId}?autoplay=1&rel=0&playsinline=1`}
        title={post.title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  } else if (post.kind === "tiktok" && active && post.externalId) {
    body = <iframe className="h-full w-full" src={`https://www.tiktok.com/embed/v2/${post.externalId}`} title={post.title} allow="autoplay; encrypted-media" />;
  } else if (post.kind === "video" && media?.media) {
    body = (
      <video
        ref={videoRef}
        src={media.media}
        poster={post.thumb || undefined}
        className="h-full w-full bg-black object-cover"
        autoPlay={active}
        loop={!post.nextId}
        playsInline
        muted={muted}
        preload="auto"
        controlsList={post.allowDownload ? undefined : "nodownload"}
        onLoadedMetadata={(e) => {
          if (post.trimStart > 0) e.currentTarget.currentTime = post.trimStart;
          e.currentTarget.volume = post.volume || 0;
        }}
        onTimeUpdate={(e) => {
          if (post.trimEnd > post.trimStart && e.currentTarget.currentTime >= post.trimEnd) {
            if (post.nextId) {
              e.currentTarget.pause();
              goNext();
              return;
            }
            e.currentTarget.currentTime = post.trimStart;
          }
        }}
        style={{ filter: post.filter === "warm" ? "sepia(0.35) saturate(1.2)" : post.filter === "cool" ? "saturate(0.85) hue-rotate(18deg)" : post.filter === "mono" ? "grayscale(1)" : post.filter === "vivid" ? "saturate(1.55) contrast(1.05)" : undefined }}
        onContextMenu={(e) => { if (!post.allowDownload) e.preventDefault(); }}
        onEnded={() => { countView({ data: { id: post.id, replay: true } }); goNext(); }}
      />
    );
  } else if (post.kind === "photos" && media) {
    let extra: string[] = [];
    try {
      extra = JSON.parse(media.extra);
    } catch {
      extra = [];
    }
    const frames = [media.media, ...extra].filter(Boolean);
    const src = frames[photo] || post.thumb;
    body = (
      <button type="button" className="h-full w-full" onClick={() => setPhoto((n) => (n + 1) % Math.max(frames.length, 1))}>
        {src && <img src={src} alt="" className="h-full w-full object-cover bg-black" />}
      </button>
    );
  } else {
    const poster = post.thumb || (post.kind === "youtube" && post.externalId ? `https://i.ytimg.com/vi/${post.externalId}/hqdefault.jpg` : "");
    body = poster ? <img src={poster} alt="" className="h-full w-full object-cover bg-black" /> : <div className="h-full w-full bg-black" />;
  }
  return (
    <div
      className="absolute inset-0 bg-black"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button,a,iframe")) return;
        downAt.current = Date.now();
        setHold(true);
      }}
      onPointerUp={(e) => {
        if ((e.target as HTMLElement).closest("button,a,iframe")) return;
        const long = Date.now() - downAt.current > 220;
        setHold(false);
        if (!long && post.kind === "video") setPaused((v) => !v);
      }}
      onPointerCancel={() => setHold(false)}
    >
      {body}
      {(paused || hold) && post.kind === "video" && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full bg-black/40 text-3xl text-white">▶</span>
        </span>
      )}
    </div>
  );
}


function Poll({ postId, options }: { postId: string; options: string[] }) {
  const [rows, setRows] = useState<{ option_idx: number; n: number }[]>([]);
  const [mine, setMine] = useState(-1);
  useEffect(() => {
    pollCounts({ data: postId }).then((r) => {
      setRows(r.rows);
      setMine(r.mine);
    }).catch(() => undefined);
  }, [postId]);
  const total = rows.reduce((s, r) => s + r.n, 0) || 1;
  return (
    <div className="mt-6 w-full max-w-xs space-y-2">
      {options.map((opt, i) => {
        const n = rows.find((r) => r.option_idx === i)?.n ?? 0;
        return (
          <button
            key={opt}
            type="button"
            onClick={() =>
              votePoll({ data: { postId, option: i } }).then((next) => {
                setRows(next);
                setMine(i);
              })
            }
            className={`w-full overflow-hidden rounded-xl text-start ring-1 ring-line ${mine === i ? "bg-primary text-ink" : "bg-bg"}`}
          >
            <span className="flex items-center justify-between px-3 py-3 text-sm">
              <span>{opt}</span>
              <span>{Math.round((n / total) * 100)}%</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Comments({ postId, mine, onClose }: { postId: string; mine: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [items, setItems] = useState<Awaited<ReturnType<typeof listComments>>>([]);
  const [body, setBody] = useState("");
  const [parent, setParent] = useState("");

  function load() {
    listComments({ data: postId }).then(setItems).catch(() => undefined);
  }
  useEffect(load, [postId]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-bg/40">
      <button type="button" className="flex-1" onClick={onClose} aria-label={t.comments} />
      <div className="max-h-[72%] rounded-t-3xl bg-surface px-4 pt-3 pb-4">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <h3 className="mb-3 font-semibold">{t.comments}</h3>
        <div className="max-h-72 space-y-3 overflow-y-auto no-scrollbar">
          {items.map((c) => (
            <div key={c.id} className={c.parentId ? "ms-6" : ""}>
              <div className="flex items-start gap-2">
                <Avatar src={c.avatar} name={c.displayName} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{c.displayName}</span> <Badges verified={c.verified} starred={c.starred} />
                  </p>
                  <p className="text-sm leading-6">{c.body}</p>
                  <div className="mt-1 flex gap-3 text-xs text-muted">
                    <button type="button" onClick={() => setParent(c.id)}>{t.reply}</button>
                    {mine && (
                      <button type="button" onClick={() => pinComment({ data: { postId, commentId: c.id } }).then(load)}>
                        {t.pin}
                      </button>
                    )}
                    {c.canDelete && (
                      <button type="button" onClick={() => removeComment({ data: c.id }).then(load)}>
                        {t.remove}
                      </button>
                    )}
                    {c.pinned && <span className="text-primary">{t.pin}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!body.trim()) return;
            addComment({ data: { postId, body, parentId: parent } }).then(() => {
              setBody("");
              setParent("");
              load();
            });
          }}
        >
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.type} className="h-11 flex-1 rounded-full bg-bg px-4 text-sm outline-none ring-1 ring-line" />
          <button className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-ink">{t.send}</button>
        </form>
      </div>
    </div>
  );
}
