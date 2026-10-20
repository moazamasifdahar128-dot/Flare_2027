import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Send, Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TopBack } from "@/components/flare/page";
import { Phone, errText } from "@/components/shola/shell";
import { chatAct, chatSeen, chatSend, chatThread } from "@/lib/shola/chat";
import { CHAT_PRIVACY, blockContactLeak } from "@/lib/shola/chat-privacy";
import { useI18n } from "@/lib/shola/i18n";

export const Route = createFileRoute("/chat/$userId/$gigId")({
  validateSearch: (search: Record<string, unknown>) => ({
    box: search.box === "job" ? "job" as const : "gig" as const,
  }),
  component: ChatPage,
});

const EMOJI = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🙂", "😉", "😍", "😘", "😜", "🤗", "🤔", "😎", "😭", "😡", "👍", "👎", "🙏", "👏", "🔥", "❤️", "💯", "⭐", "✅", "🎉", "🤝", "👋"];

type Thread = NonNullable<Awaited<ReturnType<typeof chatThread>>>;

function clock(value: string) {
  const time = new Date(value);
  if (!Number.isFinite(time.getTime())) return "";
  return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Ticks({ status }: { status: string }) {
  const seen = status === "seen";
  const color = seen ? "text-[#53BDEB]" : "text-white/55";
  return <span className={`text-[11px] leading-none ${color}`}>{status === "sent" ? "✓" : "✓✓"}</span>;
}

function ChatPage() {
  const { userId, gigId } = Route.useParams();
  const { box } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [thread, setThread] = useState<Thread | null>(null);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState("");
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const logged = useRef("");
  const stick = useRef(true);

  function load(before = "") {
    return chatThread({ data: { userId, gigId, box, before } })
      .then(async (row) => {
        if (!row) {
          setMissing(true);
          setThread(null);
          return;
        }
        setMissing(false);
        let next = row;
        if (!document.hidden && row.conversationId) {
          await chatSeen({ data: { conversationId: row.conversationId, all: true } }).catch(() => undefined);
          next = { ...row, messages: row.messages.map((item) => item.mine || item.status === "seen" ? item : { ...item, status: "seen" }) };
        }
        setThread((current) => {
          if (!before || !current) return next;
          const seen = new Set(next.messages.map((item) => item.id));
          return { ...next, messages: [...next.messages, ...current.messages.filter((item) => !seen.has(item.id))] };
        });
      })
      .catch(() => setMissing(true));
  }

  useEffect(() => {
    stick.current = true;
    void load();
  }, [userId, gigId, box]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      void load();
    }, 5000);
    return () => window.clearInterval(id);
  }, [userId, gigId, box]);

  useEffect(() => {
    const root = scroller.current;
    if (!root || !stick.current) return;
    root.scrollTop = root.scrollHeight;
  }, [thread?.messages.length]);

  useEffect(() => {
    const root = scroller.current;
    if (!root || !thread?.conversationId) return;
    const io = new IntersectionObserver((entries) => {
      const ids = entries.filter((entry) => entry.isIntersecting).map((entry) => (entry.target as HTMLElement).dataset.mid || "").filter(Boolean);
      if (!ids.length) return;
      chatSeen({ data: { conversationId: thread.conversationId, ids } }).catch(() => undefined);
    }, { root, threshold: 0.6 });
    root.querySelectorAll("[data-mid]").forEach((node) => io.observe(node));
    return () => io.disconnect();
  }, [thread?.conversationId, (thread?.messages ?? []).map((item) => item.id).join("|")]);

  const blocked = blockContactLeak(draft);
  const pending = thread?.status === "pending" || thread?.status === "new";
  const buyerLocked = Boolean(thread && thread.role === "buyer" && thread.status !== "accepted" && thread.sent >= thread.cap);
  const sellerLocked = Boolean(thread && thread.role === "seller" && thread.status !== "accepted");
  const locked = buyerLocked || sellerLocked || missing || !thread;
  const capNote = "You can send 3 messages only. Wait for seller to accept for unlimited chat.";

  useEffect(() => {
    if (!blocked || locked || !draft.trim()) return;
    const id = window.setTimeout(() => {
      if (logged.current === draft) return;
      logged.current = draft;
      chatSend({ data: { userId, gigId, box, body: draft } }).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(id);
  }, [blocked, draft, locked, userId, gigId, box]);

  function send() {
    if (!thread || busy) return;
    if (blocked) {
      if (logged.current !== draft) {
        logged.current = draft;
        chatSend({ data: { userId, gigId, box, body: draft } }).catch(() => undefined);
      }
      return;
    }
    if (locked || !draft.trim()) return;
    setBusy(true);
    stick.current = true;
    chatSend({ data: { userId, gigId, box, body: draft } })
      .then((row) => {
        setDraft("");
        setPicker(false);
        logged.current = "";
        if (row.message) {
          setThread((current) => current ? { ...current, conversationId: row.conversationId, status: current.status === "new" ? "pending" : current.status, sent: current.role === "buyer" && current.status !== "accepted" ? current.sent + 1 : current.sent, messages: [...current.messages, row.message!] } : current);
        }
        return load();
      })
      .catch((error) => setNote(errText(error, t)))
      .finally(() => setBusy(false));
  }

  function act(accept: boolean) {
    if (!thread?.conversationId) return;
    chatAct({ data: { id: thread.conversationId, accept } })
      .then(() => {
        if (!accept) {
          void navigate({ to: "/inbox" });
          return;
        }
        return load();
      })
      .catch((error) => setNote(errText(error, t)));
  }

  return (
    <Phone>
      <div className="flex h-full min-h-[70dvh] flex-col bg-black text-white">
        <div className="px-3 pt-3">
          <TopBack />
          {thread && (
            <div className="mt-2 mb-3 text-center">
              <span className={`relative mx-auto grid size-20 place-items-center overflow-hidden rounded-full bg-[#1c1c1e] text-xl font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.45)] ${thread.peer.founder ? "founder-mini" : ""}`}>
                {thread.peer.avatar ? <img src={thread.peer.avatar} alt="" className="size-full object-cover" /> : thread.peer.name.slice(0, 1).toUpperCase()}
                <i className={`absolute right-1 bottom-1 size-3.5 rounded-full ring-2 ring-black ${thread.peer.online ? "bg-[#34c759]" : "bg-[#8e8e93]"}`} />
              </span>
              <p className="mt-2 flex items-center justify-center gap-1 text-base font-semibold">{thread.peer.name}{thread.peer.founder ? <span title="Founder">👑</span> : null}</p>
              <p className="text-xs text-white/55">@{thread.peer.username} · {thread.peer.online ? "Online" : "Offline"}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-white/40">{thread.title}</p>
            </div>
          )}
        </div>
        <div
          ref={scroller}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3"
          onScroll={(event) => {
            const node = event.currentTarget;
            stick.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
          }}
        >
          {missing && <p className="py-10 text-center text-sm text-white/50">This chat is not available.</p>}
          {thread?.role === "seller" && thread.status === "new" && <p className="py-8 text-center text-sm text-white/45">No request yet.</p>}
          {thread?.hasMore && (
            <button type="button" className="mx-auto block text-xs text-sky-300" onClick={() => { stick.current = false; void load(thread.messages[0]?.at || ""); }}>Older messages</button>
          )}
          {thread?.messages.map((item) => (
            <div key={item.id} data-mid={item.mine ? undefined : item.id} className={`flex ${item.mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-5 ${item.mine ? "rounded-br-sm bg-[#1E90FF] text-white" : "rounded-bl-sm bg-white text-black"}`}>
                <p className="whitespace-pre-wrap break-words">{item.text}</p>
                <p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${item.mine ? "text-white/80" : "text-black/45"}`}>
                  <span>{clock(item.at)}</span>
                  {item.mine ? <Ticks status={item.status} /> : null}
                </p>
              </div>
            </div>
          ))}
        </div>
        {thread?.role === "seller" && thread.status === "pending" && (
          <div className="flex gap-2 px-3 pb-2">
            <button type="button" className="h-10 flex-1 rounded-full bg-[#1E90FF] text-sm font-semibold" onClick={() => act(true)}>Accept</button>
            <button type="button" className="h-10 flex-1 rounded-full bg-white/10 text-sm font-semibold" onClick={() => act(false)}>Reject</button>
          </div>
        )}
        <div className="border-t border-white/10 px-3 pt-2 pb-3">
          {buyerLocked && <p className="mb-2 text-xs leading-5 text-[#FF3B30]">{capNote}</p>}
          {sellerLocked && thread?.status === "pending" && <p className="mb-2 text-xs text-white/50">Accept the request to reply.</p>}
          {thread && thread.role === "buyer" && pending && !buyerLocked && <p className="mb-2 text-[11px] text-white/40">Request · {thread.sent}/{thread.cap}</p>}
          {blocked && <p className="mb-2 text-xs leading-5 text-[#FF3B30]">{CHAT_PRIVACY}</p>}
          {note && <p className="mb-2 text-xs text-[#FF3B30]">{note}</p>}
          {picker && (
            <div className="mb-2 grid grid-cols-10 gap-1 rounded-2xl bg-[#1c1c1e] p-2">
              {EMOJI.map((item) => (
                <button key={item} type="button" className="grid h-8 place-items-center text-lg" onClick={() => setDraft((value) => `${value}${item}`.slice(0, 500))}>{item}</button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <button type="button" aria-label="Emoji" className="grid size-10 shrink-0 place-items-center text-white/70" onClick={() => setPicker((value) => !value)}>
              <Smile className="size-5" />
            </button>
            <input
              value={draft}
              disabled={locked}
              onChange={(event) => { setDraft(event.target.value.slice(0, 500)); setNote(""); }}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); send(); } }}
              placeholder={locked ? "Waiting" : "Message"}
              className={`h-11 min-w-0 flex-1 rounded-full bg-[#1c1c1e] px-4 text-sm outline-none disabled:opacity-50 ${blocked ? "leak-shake border border-[#FF3B30]" : "border border-transparent"}`}
            />
            <button type="button" aria-label="Send" disabled={locked || busy || blocked || !draft.trim()} className="grid size-10 shrink-0 place-items-center disabled:opacity-40" onClick={send}>
              <Send className={`size-5 ${draft.trim() && !blocked && !locked ? "text-[#1E90FF]" : "text-white/30"}`} />
            </button>
          </div>
        </div>
      </div>
    </Phone>
  );
}
