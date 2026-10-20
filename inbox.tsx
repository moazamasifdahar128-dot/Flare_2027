import { Link, createFileRoute } from "@tanstack/react-router";
import { Camera, MoreHorizontal, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Phone, errText } from "@/components/shola/shell";
import { TopBack } from "@/components/flare/page";
import { playChime } from "@/lib/shola/chime";
import { chatAct, chatDesk } from "@/lib/shola/chat";
import { inboxDesk, threadAct } from "@/lib/shola/gigs";
import { useI18n } from "@/lib/shola/i18n";
import { systemFeed, systemRead } from "@/lib/shola/system-notes";

export const Route = createFileRoute("/inbox")({
  component: InboxPage,
});

type Desk = Awaited<ReturnType<typeof inboxDesk>>;
type ChatDesk = Awaited<ReturnType<typeof chatDesk>>;

function badge(n: number) {
  if (n <= 0) return "";
  return n > 99 ? "99+" : String(n);
}

function when(value: string) {
  const time = new Date(value).getTime();
  if (!time) return "";
  const mins = Math.max(1, Math.floor((Date.now() - time) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

type Mail = Awaited<ReturnType<typeof systemFeed>>[number];

const LANES = [
  { id: "alerts", title: "System Alerts", hint: "Expiry, listings, welcome", tone: "navy", mark: "🔔" },
  { id: "wa", title: "WhatsApp Unlocks", hint: "$3 receipts", tone: "green", mark: "💬" },
  { id: "boost", title: "Boost Receipts", hint: "$2 · $6 · $20", tone: "purple", mark: "🚀" },
  { id: "tick", title: "Blue Tick Verification", hint: "$2.50 badge", tone: "blue", mark: "✅" },
  { id: "escrow", title: "Flare Escrow Deals", hint: "15% fee", tone: "gold", mark: "💰" },
] as const;

type LaneId = (typeof LANES)[number]["id"];

function laneOf(kind: string): LaneId {
  if (kind.startsWith("boost")) return "boost";
  if (kind.startsWith("wa")) return "wa";
  if (kind.startsWith("tick") || kind.startsWith("views") || kind.startsWith("verify")) return "tick";
  if (kind.startsWith("deal")) return "escrow";
  return "alerts";
}

function InboxPage() {
  const { t } = useI18n();
  const [desk, setDesk] = useState<Desk | null>(null);
  const [chat, setChat] = useState<ChatDesk | null>(null);
  const [mail, setMail] = useState<Mail[]>([]);
  const [tab, setTab] = useState<"" | "requests" | "unread" | LaneId>("");
  const [q, setQ] = useState("");
  const [find, setFind] = useState(false);
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState("");
  const [sortName, setSortName] = useState(false);

  function load() {
    inboxDesk().then(setDesk).catch(() => setDesk(null));
    chatDesk().then(setChat).catch(() => setChat(null));
    systemFeed().then(setMail).catch(() => setMail([]));
  }

  useEffect(load, []);

  useEffect(() => {
    const id = window.setInterval(load, 20000);
    return () => window.clearInterval(id);
  }, []);

  const chimeSkips = useRef(2);
  useEffect(() => {
    const id = mail[0]?.id || "";
    const prev = sessionStorage.getItem("flare_mail_id") || "";
    if (chimeSkips.current > 0) {
      chimeSkips.current -= 1;
      if (id) sessionStorage.setItem("flare_mail_id", id);
      return;
    }
    if (id && id !== prev) {
      playChime();
      sessionStorage.setItem("flare_mail_id", id);
    }
  }, [mail]);

  const requests = desk?.requests ?? [];
  const chats = [...(desk?.chats ?? [])].sort((a, b) => sortName ? a.name.localeCompare(b.name) : b.at.localeCompare(a.at));
  const flareRequests = chat?.requests ?? [];
  const flareChats = [...(chat?.chats ?? [])].sort((a, b) => sortName ? a.name.localeCompare(b.name) : b.at.localeCompare(a.at));
  const query = q.trim().toLowerCase();
  const shownChats = chats.filter((row) => !query || row.name.toLowerCase().includes(query) || row.title.toLowerCase().includes(query));
  const shownRequests = requests.filter((row) => !query || row.name.toLowerCase().includes(query) || row.title.toLowerCase().includes(query));
  const shownFlareRequests = flareRequests.filter((row) => !query || row.name.toLowerCase().includes(query) || row.title.toLowerCase().includes(query));
  const shownFlareChats = flareChats.filter((row) => !query || row.name.toLowerCase().includes(query) || row.title.toLowerCase().includes(query));
  const unreadChats = shownFlareChats.filter((row) => row.unread > 0);
  const requestCount = (chat?.requestCount ?? 0) + requests.length;
  const unreadCount = chat?.unreadCount ?? 0;
  const laneMail = (id: LaneId) => mail.filter((item) => laneOf(item.kind) === id);
  const openLaneId = LANES.some((lane) => lane.id === tab) ? (tab as LaneId) : "";

  function act(row: { box: string; id: string; username: string }, accept: boolean) {
    if (row.box !== "gig" && row.box !== "job") return;
    threadAct({ data: { kind: row.box === "job" ? "job" : "gig", id: row.id, username: row.username, accept } })
      .then(() => { setNote(accept ? "Accepted. The chat is open." : "Request removed."); load(); })
      .catch((err) => setNote(errText(err, t)));
  }

  function decide(id: string, accept: boolean) {
    chatAct({ data: { id, accept } })
      .then(() => { setNote(accept ? "Accepted. The chat is open." : "Request rejected"); load(); })
      .catch((err) => setNote(errText(err, t)));
  }

  function openLane(id: LaneId) {
    setTab(id);
    systemRead().then(load).catch(() => undefined);
  }

  return (
    <Phone>
      <div className="bg-black pb-8 text-white">
        <header className="flex h-14 items-center justify-between px-3">
          <span className="w-16" />
          <h1 className="flex items-center gap-2 text-[17px] font-bold tracking-tight">Inbox <span className="size-2.5 rounded-full bg-[#34c759] shadow-[0_0_8px_#34c759]" /></h1>
          <div className="flex w-16 items-center justify-end">
            <button type="button" aria-label="Search" className="grid size-10 place-items-center" onClick={() => setFind((v) => !v)}><Search className="size-5" /></button>
            <button type="button" aria-label="Menu" className="grid size-10 place-items-center" onClick={() => setMenu((v) => !v)}><MoreHorizontal className="size-5" /></button>
          </div>
        </header>
        {find && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="mx-4 mb-2 h-10 w-[calc(100%-2rem)] rounded-full bg-[#1c1c1e] px-4 text-sm outline-none" />}
        {menu && (
          <div className="mx-4 mb-2 rounded-2xl bg-[#1c1c1e] p-2 text-sm">
            <Link to="/settings" className="block rounded-xl px-3 py-2">Blocked users</Link>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 pb-3">
          <button type="button" onClick={() => setTab(tab === "requests" ? "" : "requests")} className={`relative h-8 shrink-0 rounded-full px-3.5 text-sm font-semibold ${tab === "requests" ? "bg-[#3A8DFF] text-white" : "bg-[#2c2c2e] text-white/85"}`}>
            Requests
            {badge(requestCount) ? <span className="absolute -top-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF3B30] px-1 text-[9px] font-bold text-white">{badge(requestCount)}</span> : null}
          </button>
          <button type="button" onClick={() => setTab(tab === "unread" ? "" : "unread")} className={`relative h-8 shrink-0 rounded-full px-3.5 text-sm font-semibold ${tab === "unread" ? "bg-[#3A8DFF] text-white" : "bg-[#2c2c2e] text-white/85"}`}>
            Unread
            {badge(unreadCount) ? <span className="absolute -top-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF3B30] px-1 text-[9px] font-bold text-white">{badge(unreadCount)}</span> : null}
          </button>
          <button type="button" aria-label="Sort" className="ms-auto grid size-8 shrink-0 place-items-center rounded-full bg-[#2c2c2e]" onClick={() => setSortName((v) => !v)}><SlidersHorizontal className="size-4" /></button>
        </div>

        {tab !== "requests" && tab !== "unread" && !openLaneId && (
          <div>
            {LANES.map((lane) => {
              const rows = laneMail(lane.id);
              const unread = rows.filter((item) => !item.read).length;
              const last = rows[0];
              return (
                <button key={lane.id} type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => openLane(lane.id)}>
                  <PinMark tone={lane.tone} mark={lane.mark} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{lane.title}</span>
                    <span className="block truncate text-sm text-white/55">{last ? last.body.split("\n")[0] : lane.hint}</span>
                  </span>
                  {unread > 0 ? <span className="size-2.5 shrink-0 rounded-full bg-[#3A8DFF]" /> : null}
                  {badge(unread) ? <span className="rounded-full bg-[#FF3B30] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">{badge(unread)}</span> : null}
                </button>
              );
            })}
          </div>
        )}

        {openLaneId && (
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <TopBack onClick={() => setTab("")} />
              <h2 className="text-lg font-semibold">{LANES.find((lane) => lane.id === openLaneId)?.title}</h2>
            </div>
            <p className="mt-1 text-xs text-white/45">Read only. You cannot reply here.</p>
            <div className="mt-3 space-y-2">
              {laneMail(openLaneId).map((item) => (
                <article key={item.id} className="rounded-2xl bg-[#16161E] px-3 py-3 text-sm leading-6 whitespace-pre-wrap">
                  {!item.read ? <span className="mr-2 inline-block size-2 rounded-full bg-[#3A8DFF] align-middle" /> : null}
                  {item.body}
                  <span className="mt-2 block text-xs text-white/40">{when(item.at)}</span>
                </article>
              ))}
              {laneMail(openLaneId).length === 0 && <p className="py-8 text-center text-sm text-white/45">No notes in this thread yet.</p>}
            </div>
          </div>
        )}

        {tab === "requests" ? (
          <div className="space-y-2 px-4 pt-3">
            {shownFlareRequests.map((row) => (
              <article key={row.id} className="rounded-2xl bg-[#16161E] p-3">
                <Link to="/chat/$userId/$gigId" params={{ userId: row.userId, gigId: row.gigId }} search={{ box: row.box }} className="flex items-center gap-3">
                  <Face src={row.avatar} name={row.name} founder={row.founder} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate font-semibold">{row.name}{row.founder ? <span title="Founder">👑</span> : null}{row.verified && <i className="inline-block size-3.5 shrink-0 rounded-full bg-[#3A8DFF]" aria-label="Blue tick" />}</p>
                    <p className="truncate text-xs text-white/50">{row.title}</p>
                    <p className="text-[11px] text-white/40">{when(row.at)}</p>
                  </div>
                  {row.previews.length > 0 ? <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/80">{row.previews.length} {row.previews.length === 1 ? "message" : "messages"}</span> : null}
                </Link>
                <div className="mt-2 space-y-1">
                  {(row.previews.length ? row.previews : ["New request"]).map((line, index) => (
                    <p key={`${row.id}-${index}`} className="truncate rounded-xl bg-black/40 px-2 py-1 text-sm text-white/75">{line}</p>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="h-9 flex-1 rounded-full bg-[#3A8DFF] text-sm font-semibold" onClick={() => decide(row.id, true)}>Accept</button>
                  <button type="button" className="h-9 flex-1 rounded-full bg-white/10 text-sm font-semibold" onClick={() => decide(row.id, false)}>Reject</button>
                </div>
              </article>
            ))}
            {shownRequests.map((row) => (
              <article key={`${row.box}-${row.id}-${row.username}`} className="rounded-2xl bg-[#16161E] p-3">
                <div className="flex items-center gap-3">
                  <Face src={row.avatar} name={row.name} founder={row.founder} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate font-semibold">{row.name}{row.founder ? <span title="Founder">👑</span> : null}{row.verified && <i className="inline-block size-3.5 shrink-0 rounded-full bg-[#3A8DFF]" aria-label="Blue tick" />}</p>
                    <p className="truncate text-xs text-white/50">{row.title}</p>
                    <p className="truncate text-sm text-white/70">{row.preview || "New request"}{row.at ? ` · ${when(row.at)}` : ""}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="h-9 flex-1 rounded-full bg-[#3A8DFF] text-sm font-semibold" onClick={() => act(row, true)}>Accept</button>
                  <button type="button" className="h-9 flex-1 rounded-full bg-white/10 text-sm font-semibold" onClick={() => act(row, false)}>Decline</button>
                </div>
              </article>
            ))}
            {shownFlareRequests.length === 0 && shownRequests.length === 0 && <p className="py-8 text-center text-sm text-white/45">No requests yet. When someone messages you, it appears here.</p>}
          </div>
        ) : tab === "unread" ? (
          <div className="space-y-2 px-4 pt-3">
            {unreadChats.map((row) => (
              <Link key={row.id} to="/chat/$userId/$gigId" params={{ userId: row.userId, gigId: row.gigId }} search={{ box: row.box }} className="flex items-center gap-3 rounded-2xl bg-[#16161E] p-3">
                <Face src={row.avatar} name={row.name} founder={row.founder} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate font-semibold">{row.name}{row.founder ? <span title="Founder">👑</span> : null}{row.verified && <i className="inline-block size-3.5 shrink-0 rounded-full bg-[#3A8DFF]" aria-label="Blue tick" />}</span>
                  <span className="block truncate text-xs text-white/50">{row.title}</span>
                  <span className="block truncate text-sm text-white/70">{row.preview || "New message"}{row.at ? ` · ${when(row.at)}` : ""}</span>
                </span>
                {badge(row.unread) ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#FF3B30] px-1 text-[10px] font-bold text-white">{badge(row.unread)}</span> : null}
              </Link>
            ))}
            {unreadChats.length === 0 && <p className="py-8 text-center text-sm text-white/45">No unread messages.</p>}
          </div>
        ) : tab === "" ? (
          <div>
            <p className="px-4 pt-3 text-xs font-semibold tracking-wide text-white/40">Messages</p>
            {shownFlareChats.map((row) => (
              <Link key={row.id} to="/chat/$userId/$gigId" params={{ userId: row.userId, gigId: row.gigId }} search={{ box: row.box }} className="flex items-center gap-3 px-4 py-3">
                <Face src={row.avatar} name={row.name} founder={row.founder} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate font-semibold">{row.name}{row.founder ? <span title="Founder">👑</span> : null}{row.verified && <i className="inline-block size-3.5 shrink-0 rounded-full bg-[#3A8DFF]" aria-label="Blue tick" />}</span>
                  <span className="block truncate text-xs text-white/40">{row.title}</span>
                  <span className="block truncate text-sm text-white/50">{row.preview || "Sent"}{row.at ? ` · ${when(row.at)}` : ""}</span>
                </span>
                {badge(row.unread) ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#FF3B30] px-1 text-[10px] font-bold text-white">{badge(row.unread)}</span> : null}
              </Link>
            ))}
            {shownChats.map((row) => (
              <Link key={`${row.box}-${row.id}-${row.username}`} to="/inquiries/$id" params={{ id: row.id }} search={{ with: row.username, box: row.box }} className="flex items-center gap-3 px-4 py-3">
                <Face src={row.avatar} name={row.name} founder={row.founder} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate font-semibold">{row.name}{row.founder ? <span title="Founder">👑</span> : null}{row.verified && <i className="inline-block size-3.5 shrink-0 rounded-full bg-[#3A8DFF]" aria-label="Blue tick" />}</span>
                  <span className="block truncate text-sm text-white/50">{row.preview || "Sent"}{row.at ? ` · ${when(row.at)}` : ""}</span>
                </span>
                <Camera className="size-5 shrink-0 text-white/35" />
              </Link>
            ))}
            {shownFlareChats.length === 0 && shownChats.length === 0 && <p className="py-8 text-center text-sm text-white/45">No open chats yet. Accept a request to start one.</p>}
          </div>
        ) : null}
        {note && <p className="px-4 pt-3 text-sm text-[#fe2c55]">{note}</p>}
      </div>
    </Phone>
  );
}

function PinMark({ tone, mark }: { tone: "navy" | "green" | "purple" | "blue" | "gold"; mark: string }) {
  const skin = {
    navy: "bg-gradient-to-br from-[#9aa6e8] via-[#1a237e] to-[#070b22] shadow-[0_8px_16px_rgba(26,35,126,0.5)]",
    green: "bg-gradient-to-br from-[#b8f5c8] via-[#1fa855] to-[#064d28] shadow-[0_8px_16px_rgba(31,168,85,0.45)]",
    purple: "bg-gradient-to-br from-[#e4d4ff] via-[#7a3cff] to-[#2a0d66] shadow-[0_8px_16px_rgba(122,60,255,0.45)]",
    blue: "bg-gradient-to-br from-[#c7e4ff] via-[#3A8DFF] to-[#0a2a55] shadow-[0_8px_16px_rgba(58,141,255,0.45)]",
    gold: "bg-gradient-to-br from-[#fff1b8] via-[#e2b027] to-[#6a4a08] shadow-[0_8px_16px_rgba(226,176,39,0.45)]",
  }[tone];
  return (
    <span className={`relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full text-lg ${skin}`}>
      <span className="pointer-events-none absolute inset-x-1 top-0.5 h-5 rounded-full bg-white/35 blur-[1px]" />
      <span className="relative drop-shadow">{mark}</span>
    </span>
  );
}

function Face({ src, name, founder = false }: { src: string; name: string; founder?: boolean }) {
  return (
    <span className={`grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#2a2a2a] text-sm font-semibold ${founder ? "founder-mini" : ""}`}>
      {src ? <img src={src} alt="" className="size-full object-cover" /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
}
