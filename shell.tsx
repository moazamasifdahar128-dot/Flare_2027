import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Briefcase, ClipboardList, MessageCircle, Plus, User } from "lucide-react";
import { useEffect, useRef, useState, createContext, useContext, type ReactNode } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useI18n } from "@/lib/shola/i18n";
import { beat, ensureMe, founderOffer, geoGate, myHandle, notes, siteStatus } from "@/lib/shola/server";
import { inboxBadge } from "@/lib/shola/gigs";
import { useCreateGate } from "@/components/shola/limit-modal";

function playPop() {
  if (document.visibilityState === "hidden") return;
  const audio = new Audio("/flare_pop.mp3");
  audio.preload = "auto";
  audio.volume = 0.45;
  void audio.play().catch(() => undefined);
}

let shellSignedIn = false;
let shellBooted = "";
let shellHandle = "";
let bareHolds = 0;
const bareListen = new Set<() => void>();
const ShellCtx = createContext(false);

function pokeBare() {
  bareListen.forEach((fn) => fn());
}

function storedHandle() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("flare_handle") || "";
  } catch {
    return "";
  }
}

function signedHint() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("flare_signed") === "1";
  } catch {
    return false;
  }
}

function rememberSigned(on: boolean) {
  try {
    if (on) localStorage.setItem("flare_signed", "1");
    else localStorage.removeItem("flare_signed");
  } catch {
    /* private mode */
  }
}
let loggedSpeed = false;

function rememberHandle(next: string) {
  shellHandle = next;
  try {
    localStorage.setItem("flare_handle", next);
  } catch {
    /* private mode */
  }
}

export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M32 4c1 8 8 12 12 20 1.6 3.2 1.4 6.4-.2 9 3.2-2 6.2-6 7.2-11 4 4.4 9 10 9 18 0 12.4-11.2 20-28 20S4 52.4 4 40c0-10 6.4-16.6 12.4-23.2 3.2 5 4.8 7 6.4 10.2.6-8 2.6-14.4 9.2-23z"
      />
    </svg>
  );
}

export function Phone({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  const nested = useContext(ShellCtx);
  const navigate = useNavigate();
  const [covered, setCovered] = useState(bareHolds > 0);
  const session = useCurrentUserState();
  if (session.user) shellSignedIn = true;
  const user = session.user;
  const { t } = useI18n();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [unread, setUnread] = useState(0);
  const [handle, setHandle] = useState(shellHandle || storedHandle);
  const [paused, setPaused] = useState("");
  const [ipPaused, setIpPaused] = useState("");
  const [sheet, setSheet] = useState(false);
  const { openGig, openBoard, modal: limitModal } = useCreateGate();
  const [signing, setSigning] = useState(false);
  const [sessionSlow, setSessionSlow] = useState(true);
  const seen = useRef(0);
  const heard = useRef<number | null>(null);

  useEffect(() => {
    if (nested || loggedSpeed) return;
    loggedSpeed = true;
    const report = () => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const scripts = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const bytes = scripts.filter((row) => row.initiatorType === "script").reduce((sum, row) => sum + (row.transferSize || 0), 0);
      const ms = nav ? Math.round(nav.domContentLoadedEventEnd) : Math.round(performance.now());
      console.log(`[flare] ready ${ms}ms, script transfer ${Math.round(bytes / 1024)}kb`);
    };
    if (document.readyState === "complete") report();
    else window.addEventListener("load", report, { once: true });
  }, [nested]);

  useEffect(() => {
    setSheet(false);
  }, [path]);

  useEffect(() => {
    try {
      setSigning(sessionStorage.getItem("flare_oauth") === "1");
    } catch {
      setSigning(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      shellSignedIn = true;
      rememberSigned(true);
    }
  }, [user]);

  useEffect(() => {
    if (!session.isPending || session.user) {
      setSessionSlow(false);
      return;
    }
    if (!signedHint()) {
      setSessionSlow(true);
      return;
    }
    const id = window.setTimeout(() => setSessionSlow(true), 300);
    return () => window.clearTimeout(id);
  }, [session.isPending, session.user]);

  useEffect(() => {
    if (!session.user) return;
    try {
      sessionStorage.removeItem("flare_oauth");
    } catch {
      /* ignore */
    }
    setSigning(false);
  }, [session.user]);

  useEffect(() => {
    const sync = () => setCovered(bareHolds > 0);
    bareListen.add(sync);
    return () => {
      bareListen.delete(sync);
    };
  }, []);

  useEffect(() => {
    if (!nested || !bare) return;
    bareHolds += 1;
    pokeBare();
    return () => {
      bareHolds -= 1;
      pokeBare();
    };
  }, [nested, bare]);

  useEffect(() => {
    const onHandle = (event: Event) => {
      const name = (event as CustomEvent<string>).detail;
      if (typeof name !== "string" || !name.trim()) return;
      rememberHandle(name);
      setHandle(name.trim());
    };
    window.addEventListener("flare-handle", onHandle);
    return () => window.removeEventListener("flare-handle", onHandle);
  }, []);

  useEffect(() => {
    if (nested || !user) return;
    if (shellBooted !== user.id) {
      shellBooted = user.id;
      ensureMe({ data: { name: user.displayName ?? "", image: user.profileImageUrl ?? "" } })
        .then(() => myHandle())
        .then((row) => {
          if (row?.username) {
            rememberHandle(row.username);
            setHandle(row.username);
          }
          return founderOffer();
        })
        .then(() => undefined)
        .catch(() => undefined);
    }
    const poll = () => {
      notes()
        .then((n) => {
          if (heard.current !== null && n.inquiryUnread > heard.current) playPop();
          heard.current = n.inquiryUnread;
        })
        .catch(() => undefined);
      inboxBadge()
        .then((row) => {
          seen.current = row.total;
          setUnread((current) => (current === row.total ? current : row.total));
        })
        .catch(() => undefined);
    };
    const id = window.setInterval(() => {
      beat().catch(() => undefined);
    }, 30000);
    const nid = window.setInterval(poll, 20000);
    const boot = window.setTimeout(poll, 2000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(nid);
      window.clearTimeout(boot);
    };
  }, [user?.id, nested]);

  useEffect(() => {
    if (nested || !user) return;
    let stop = false;
    const check = () => {
      siteStatus()
        .then((row) => { if (!stop) setPaused(row.ok ? "" : (row.message || "Flare is paused in your country.")); })
        .catch(() => undefined);
    };
    check();
    const id = window.setInterval(check, 120_000);
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user?.id, nested]);

  useEffect(() => {
    if (user) {
      setIpPaused("");
      return;
    }
    let stop = false;
    const check = () => {
      geoGate()
        .then((row) => { if (!stop) setIpPaused(row.ok ? "" : row.message); })
        .catch(() => undefined);
    };
    check();
    const id = window.setInterval(check, 120_000);
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user]);

  function openProfile() {
    const go = (name: string) => {
      rememberHandle(name);
      setHandle(name);
      navigate({ to: "/u/$username", params: { username: name } });
    };
    if (handle) {
      go(handle);
      return;
    }
    ensureMe({ data: { name: user?.displayName ?? "", image: user?.profileImageUrl ?? "" } })
      .catch(() => undefined)
      .then(() => myHandle())
      .then((row) => {
        if (row?.username) go(row.username);
      })
      .catch(() => undefined);
  }

  if (nested) return children;
  if (ipPaused && !user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-black px-8 text-center text-white">
        <div>
          <p className="text-2xl font-semibold">🚫 Flare Not Available</p>
          <p className="mt-3 text-sm leading-6 text-white/75">{ipPaused}</p>
        </div>
      </div>
    );
  }
  if (!user && !shellSignedIn) {
    if (session.isPending && !sessionSlow) {
      return (
        <div className="grid min-h-dvh place-items-center bg-stage">
          <div className="text-center">
            <Mark className="mx-auto size-14 text-[#FF4D2E]" />
            <span className="mx-auto mt-4 block size-5 animate-spin rounded-full border-2 border-white/20 border-t-[#FF4D2E]" />
            <p className="mt-3 text-sm text-white/70">{signing ? "Signing you in..." : "Opening Flare..."}</p>
          </div>
        </div>
      );
    }
    return <RedirectToSignIn />;
  }

  return (
    <ShellCtx.Provider value={true}>
      <div className="min-h-dvh bg-stage text-fg">
        <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-x-hidden bg-bg">
          <div className="relative min-h-0 flex-1">
            {paused ? (
              <div className="grid min-h-dvh place-items-center bg-black px-8 text-center">
                <div>
                  <p className="text-2xl font-semibold">🚫 Flare Not Available</p>
                  <p className="mt-3 text-sm leading-6 text-white/75">{paused}</p>
                </div>
              </div>
            ) : children}
          </div>
          <nav
            className={`sticky bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-black px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] text-white ${bare || covered || paused ? "hidden" : ""}`}
            aria-hidden={bare || covered || Boolean(paused)}
          >
            <Link to="/" className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] leading-none ${path === "/" || path.startsWith("/gigs") ? "text-white" : "text-white/55"}`}>
              <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow">
                <Briefcase className="size-4" />
              </span>
              Gigs
            </Link>
            <Link to="/board" search={{ kind: "", category: "", posted: "" }} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] leading-none ${path.startsWith("/board") ? "text-white" : "text-white/55"}`}>
              <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-amber-300 text-black shadow">
                <ClipboardList className="size-4" />
              </span>
              Board
            </Link>
            <button type="button" aria-label={t.post} className="flex min-h-14 flex-col items-center justify-center" onClick={() => setSheet(true)}>
              <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-[#3A8DFF] to-[#7A5CFF] text-white shadow-[0_8px_18px_rgba(90,70,255,0.45)]">
                <Plus className="size-6" strokeWidth={2.6} />
              </span>
            </button>
            <Link to="/inbox" className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] leading-none ${path.startsWith("/inbox") || path.startsWith("/inquiries") || path.startsWith("/chat") ? "text-white" : "text-white/55"}`}>
              <span className="relative">
                <MessageCircle className="size-6" />
                {unread > 0 && <span className="absolute -top-1 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF3B30] px-1 text-[9px] font-semibold text-white">{unread > 99 ? "99+" : unread}</span>}
              </span>
              Inbox
            </Link>
            <button type="button" aria-label={t.profile} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] leading-none ${path.startsWith("/u/") ? "text-white" : "text-white/55"}`} onClick={openProfile}>
              <User className="size-6" />
              Profile
            </button>
          </nav>
          {sheet && (
            <div className="absolute inset-0 z-50 flex items-end bg-black/60" onClick={() => setSheet(false)}>
              <div className="w-full rounded-t-3xl bg-[#16161E] p-4 pb-8" onClick={(event) => event.stopPropagation()}>
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" className="rounded-2xl bg-black p-3 text-left" onClick={() => { setSheet(false); void openGig(); }}>
                    <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#3A8DFF] to-[#7A5CFF] text-white shadow">
                      <Briefcase className="size-6" />
                    </span>
                    <p className="mt-3 text-sm font-semibold">Offer a Service</p>
                    <p className="mt-1 text-xs text-white/50">Sell your skills</p>
                  </button>
                  <button type="button" className="rounded-2xl bg-black p-3 text-left" onClick={() => { setSheet(false); void openBoard(); }}>
                    <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-amber-300 text-black shadow">
                      <ClipboardList className="size-6" />
                    </span>
                    <p className="mt-3 text-sm font-semibold">Post a Request</p>
                    <p className="mt-1 text-xs text-white/50">Ask for what you need</p>
                  </button>
                </div>
              </div>
            </div>
          )}
          {limitModal}
        </div>
      </div>
    </ShellCtx.Provider>
  );
}

export function Avatar({ src, name, glow = false, className = "" }: { src?: string; name?: string; glow?: boolean; className?: string }) {
  const letter = (name || "F").trim().slice(0, 1).toUpperCase() || "F";
  const ring = glow ? "ring-2 ring-amber-300" : "";
  if (src) return <img src={src} alt="" className={`size-10 rounded-full object-cover ${ring} ${className}`} />;
  return <span className={`grid size-10 place-items-center rounded-full bg-white/10 text-sm font-semibold ${ring} ${className}`}>{letter}</span>;
}

export function Badges({
  verified,
  starred,
  founder,
  faded,
  opacity = 1,
  tip,
}: {
  verified?: boolean;
  starred?: boolean;
  founder?: boolean;
  faded?: boolean;
  opacity?: number;
  tip?: string;
}) {
  if (!verified && !starred && !founder) return null;
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {founder ? <span title="Founder" className="text-sm">👑</span> : null}
      {starred ? <span title="Star" className="text-sm">⭐</span> : null}
      {verified && (
        <svg viewBox="0 0 16 16" className="size-4 text-tick" style={{ opacity: faded ? opacity : 1 }} aria-hidden="true">
          <title>{tip || (faded ? "Blue Tick stays until a gig delete drops views under 2,000" : "Verified")}</title>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M4.6 8.2l2.1 2.1 4.6-4.7" fill="none" stroke="#110e0c" strokeWidth="1.6" />
        </svg>
      )}
    </span>
  );
}

export function errText(error: unknown, t: { tooLong: string; tooBig: string; taken: string; banned: string; notYet: string; duplicate?: string }) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("OVER_500")) return "This video is larger than 500MB. Choose a smaller file.";
  if (message.includes("TOO_LONG")) return t.tooLong;
  if (message.includes("TOO_BIG")) return "This video is too large to send. Keep it under 100MB so the upload can finish.";
  if (message.includes("YT_LONG")) return "Error: Videos longer than 1 hour cannot be played inside the app.";
  if (message.includes("YT_LENGTH")) return "The video length could not be checked. Try the link again.";
  if (message.includes("NETWORK") || message.includes("Failed to fetch") || message.includes("Load failed")) return "The upload stopped. Check your connection and try again.";
  if (message.includes("BAD_MEDIA") || message.includes("BAD_VIDEO")) return t.tooBig;
  if (message.includes("NAME_TAKEN")) return t.taken;
  if (message.includes("BANNED")) return t.banned;
  if (message.includes("NOT_YET")) return t.notYet;
  if (message.includes("WORD")) return t.banned;
  if (message.includes("DUPLICATE")) return t.duplicate ?? "This video was already posted.";
  if (message.includes("LIVE_LOCK")) return "Gifts open after the creator is verified. Live is not open.";
  if (message.includes("GIG_TITLE")) return "A title needs at least 3 words or 10 characters, and at most 80 characters.";
  if (message.includes("GIG_BODY")) return "Description too short (min 20 words), or over the 400 word limit.";
  if (message.includes("CHAT_PRIVACY")) return "⚠️ Contact sharing not allowed on Flare. Phone numbers, WhatsApp, links, emails, social handles are blocked. Use Flare chat only. Message not sent.";
  if (message.includes("CHAT_LEAK")) return "Sharing numbers/links not allowed";
  if (message.includes("GIG_LEAK")) return "Remove phone numbers, WhatsApp numbers, links, emails, or social handles from title/description. Use Flare chat only. Delete contact info to publish.";
  if (message.includes("GIG_PHONE")) return "Enter valid WhatsApp number (7-15 digits, any country)";
  if (message.includes("BIO_LEAK")) return "Remove phone numbers, WhatsApp, links, emails, or social handles from bio. Use Flare chat only. Delete to save.";
  if (message.includes("BIO_LONG")) return "Bio limit reached (80 words max). Extra text trimmed.";
  const long = message.match(/GIG_LONG:(\d+)/);
  if (long) return `Video must be 30 seconds or less. Your video is ${long[1]} sec`;
  const heavy = message.match(/GIG_HEAVY:(\d+)/);
  if (heavy) return `Video must be 60MB or less. Your video is ${heavy[1]}MB - Try compressing`;
  if (message.includes("GIG_HEAVY") || message.includes("GIG_LONG")) return "Video max 60MB, 30 seconds max - Please trim";
  if (message.includes("LIKE_FAST")) return "Too many likes too quickly. Wait a minute.";
  if (message.includes("CASH_LOW")) return "That amount is higher than your released balance.";
  if (message.includes("MIN")) return "That request does not meet the current requirement.";
  if (message.includes("up to 500MB") || message.includes("up to 50MB") || message.includes("GIG_SIZE") || message.includes("GIG_VIDEO")) return "Use an MP4, MOV, 3GP, or WEBM video.";
  if (message.includes("GIG_READ")) return "Could not read video. Please try another video or trim it";
  if (message.includes("GIG_PHOTO")) return "That photo could not be opened. Try a JPG or PNG.";
  if (message.includes("GIG_MEDIA")) return "Add 1 to 3 sample photos. Videos are optional.";
  if (message.includes("BOARD_WAIT")) return "🔒 Wait for reply - 3/3 sent";
  if (message.includes("BOARD_NEW")) return "A new account can post, but links and pins open after 24 hours.";
  if (message.includes("MAINTENANCE")) return "Flare is in maintenance. New listings are paused.";
  if (message.includes("Country banned")) return "Country banned";
  if (message.includes("LIMIT_REACHED") || message.includes("REQUEST_LIMIT") || message.includes("GIG_LIMIT")) return "Limit reached. You can keep 3 gigs and 5 boards. Delete one to post another.";
  if (message.includes("BOARD_CAP")) return "Three listings a day is the limit.";
  if (message.includes("BOARD_URL")) return "A shop link must start with https://.";
  if (message.includes("BOARD_PHOTO")) return "That photo could not be made small enough. Try another image.";
  if (message.includes("SHOP_FULL")) return "A shop can hold 5 products. Remove one before adding another.";
  if (message.includes("BOARD_PRICE")) return "Enter a price in PKR or USD.";
  if (message.includes("ESCROW_LINK")) return "Invalid link. Must be Google Drive, Dropbox, WeTransfer, or GitHub link starting with https://";
  if (message.includes("ESCROW_DEMO")) return "The live demo must be an https link.";
  if (message.includes("ESCROW_NOTE")) return "The delivery note needs 20 to 400 words.";
  if (message.includes("ESCROW_WAIT")) return "Delivery opens after the founder marks the payment held.";
  if (message.includes("PAYOUT_BAD")) return "Invalid account number format";
  if (message.includes("BOOST_OFF")) return "Founder payment account not attached. Payments disabled.";
  if (message.includes("BOOST_NAME")) return "Please enter correct account name";
  if (message.includes("BOOST_NUMBER")) return "Invalid account number. Please enter correct 11 digit number";
  if (message.includes("BOOST_MISSING")) return "This account number does not exist";
  if (message.includes("BOOST_LOW") || message.includes("PIN_LOW")) return "Insufficient balance in your account";
  if (message.includes("PIN_BAD")) return "Invalid PIN. Please enter correct 5-digit PIN";
  if (message.includes("PIN_WRONG")) return "Incorrect PIN. Please try again";
  if (message.includes("CARD_LOW")) return "Card declined for funds";
  if (message.includes("CARD_BAD")) return "Invalid card number";
  if (message.includes("BOOST_TID")) return "Please enter a valid Transaction ID";
  if (message.includes("BOOST_DUP")) return "This Transaction ID was already used.";
  if (message.includes("BOARD_PAY")) return "Choose a payment method and a real reference.";
  if (message.includes("BOARD_TITLE")) return "Write a title and a short description.";
  if (message.includes("BOARD_WORDS")) return "A request can be at most 400 words.";
  if (message.includes("OWN_LISTING")) return "You cannot report your own listing.";
  if (message.includes("BOARD_KIND")) return "Choose a door and a category.";
  if (message.includes("CHAT_CAP")) return "You can send 3 messages only. Wait for seller to accept for unlimited chat.";
  if (message.includes("CHAT_WAIT")) return "Accept the request before you reply.";
  if (message.includes("GIG_CAP")) return "🔒 Wait for reply - 2/2 sent";
  if (message.includes("GIG_FIRST")) return "The seller can reply after the buyer sends the first message.";
  if (message.includes("JOB_FIRST")) return "The job poster can reply after the first inquiry.";
  if (message.includes("TITLE")) return "The title can be at most 500 characters.";
  if (message.includes("BAD_URL")) return "Use a full YouTube, TikTok, or Facebook link to that account.";
  if (message.includes("ONE_TICKET")) return "You already have an open note to the team.";
  if (message.includes("ONE_NOTE")) return "One comment is allowed on this note.";
  if (message.includes("PIN_FULL")) return "You can pin four videos.";
  if (message.includes("NSFW")) return "This post was not published. Repeated violations (3-4 times) will lead to permanent account termination.";
  if (message.includes("SLOW")) return "Slow down a moment, then try again.";
  if (message.includes("HANDLE_WAIT")) return "Usernames can change once every 7 days.";
  if (message.includes("NAME_WAIT")) return "Display names can change once every 30 days.";
  if (message.includes("REGION")) return "Cash out is not open in your country.";
  if (message.includes("VPN_LOCK")) return "Cash out is locked after repeated tunnel checks. The founder has the note.";
  if (message.includes("BLOCKED")) return "You cannot message this user.";
  if (message.includes("EMPTY")) return "Write a little more, then send it.";
  if (message.includes("FORBIDDEN")) return "That action is not available on this account.";
  if (message.includes("Google sign-in")) return message;
  return "That did not go through. Try again.";
}

export function SignOutSlot() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        type="button"
        className="h-11 w-full rounded-full bg-white text-sm font-semibold text-black"
        onClick={() => setOpen(true)}
      >
        Sign out
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 px-4 pb-8 sm:place-items-center">
          <div className="w-full max-w-sm rounded-3xl bg-[#16161E] p-5">
            <p className="text-lg font-semibold">Log out?</p>
            <p className="mt-2 text-sm leading-6 text-white/70">Are you sure you want to log out of your Flare account?</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" className="h-11 rounded-full bg-white/10 text-sm font-semibold" onClick={() => setOpen(false)}>Cancel</button>
              <button
                type="button"
                disabled={busy}
                className="h-11 rounded-full bg-[#DC2626] text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => {
                  setBusy(true);
                  rememberSigned(false);
                  signOut("/login").catch(() => { setBusy(false); setOpen(false); });
                }}
              >
                {busy ? "Signing out" : "Log out"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
