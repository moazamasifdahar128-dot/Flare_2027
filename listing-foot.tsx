import { Bookmark, Flag, Heart, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BoostPaySheet } from "@/components/shola/boost";
import { errText } from "@/components/shola/shell";
import { playChime } from "@/lib/shola/chime";
import { boardReport } from "@/lib/shola/board";
import { gigReport, boostPayGate } from "@/lib/shola/gigs";
import { useI18n } from "@/lib/shola/i18n";
import { REPORT_LABELS, type ReportReason, formatTimeAgo } from "@/lib/shola/time-ago";

export function ListingFooter({
  kind,
  id,
  createdAt,
  likes,
  liked,
  saved,
  mine = false,
  title = "",
  onLike,
  onSave,
}: {
  kind: "gig" | "request";
  id: string;
  createdAt: string;
  likes: number | null;
  liked: boolean;
  saved: boolean;
  mine?: boolean;
  title?: string;
  onLike: () => Promise<boolean | void> | boolean | void;
  onSave: () => Promise<void> | void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [pop, setPop] = useState(0);
  const [toast, setToast] = useState("");
  const [sheet, setSheet] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [boostReady, setBoostReady] = useState<boolean | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!mine) return;
    let stop = false;
    boostPayGate().then((row) => { if (!stop) setBoostReady(row.attached); }).catch(() => { if (!stop) setBoostReady(false); });
    return () => { stop = true; };
  }, [mine]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function share() {
    const path = kind === "gig" ? `/gigs/${id}` : `/board/${id}`;
    const url = `${location.origin}${path}`;
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      copied = false;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: "Flare", url });
      } catch {
        /* dismissed */
      }
    }
    setToast(copied ? "Link copied!" : "Could not copy the link.");
  }

  async function submitReport() {
    if (mine || sending) return;
    setSending(true);
    try {
      const payload = { id, reason, note: detail };
      const next = kind === "gig" ? await gigReport({ data: payload }) : await boardReport({ data: payload });
      setDone(true);
      setSheet(false);
      setToast(next.already ? "You already reported this listing." : "Report sent to Founder");
    } catch (error) {
      setToast(errText(error, t));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="mt-2 flex items-center gap-0.5 border-t border-white/10 px-2 py-1.5">
        <button
          type="button"
          aria-label={liked ? "Unlike" : "Like"}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-1.5 text-white/55"
          onClick={() => {
            Promise.resolve(onLike())
              .then((next) => {
                if (next) setPop((n) => n + 1);
              })
              .catch((error) => setToast(errText(error, t)));
          }}
        >
          <Heart key={pop} className={`size-[18px] ${liked ? "fill-[#fe2c55] text-[#fe2c55]" : ""} ${pop ? "heart-pop" : ""}`} />
          {likes != null ? <span className="text-xs tabular-nums">{likes}</span> : null}
        </button>
        <button
          type="button"
          aria-label={saved ? "Unsave" : "Save"}
          className={`inline-flex h-9 items-center gap-1 rounded-lg px-1.5 text-xs ${saved ? "text-[#3A8DFF]" : "text-white/55"}`}
          onClick={() => {
            Promise.resolve(onSave()).catch((error) => setToast(errText(error, t)));
          }}
        >
          <Bookmark className={`size-[18px] ${saved ? "fill-[#3A8DFF]" : ""}`} />
          {saved ? "Saved" : null}
        </button>
        <button type="button" aria-label="Share" className="inline-flex h-9 items-center rounded-lg px-1.5 text-white/55" onClick={() => void share()}>
          <Share2 className="size-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Report"
          className={`inline-flex h-9 items-center rounded-lg px-1.5 ${done ? "text-[#fe2c55]" : "text-white/55"}`}
          onClick={() => {
            if (mine) {
              setToast("You cannot report your own listing.");
              return;
            }
            setSheet(true);
          }}
        >
          <Flag className={`size-[18px] ${done ? "fill-[#fe2c55]" : ""}`} />
        </button>
        {mine ? (
          <button type="button" aria-disabled={boostReady === false} className={`inline-flex h-8 items-center rounded-full px-2.5 text-[11px] font-semibold ${boostReady === false ? "bg-white/10 text-white/35" : "bg-white text-black"}`} onClick={() => setBoostOpen(true)}>
            🚀 Boost
          </button>
        ) : null}
        <span suppressHydrationWarning className="ms-auto shrink-0 text-[12px] text-white/45">{formatTimeAgo(createdAt, now)}</span>
      </div>
      {toast ? <p className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-black shadow">{toast}</p> : null}
      {sheet ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setSheet(false)}>
          <div className="w-full max-w-[430px] rounded-t-3xl bg-[#16161E] p-4 pb-8" onClick={(event) => event.stopPropagation()}>
            <p className="text-base font-semibold">Report this listing</p>
            <p className="mt-1 text-xs text-white/50">The founder sees the listing, your reason, and your note on one card.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {REPORT_LABELS.map((item) => (
                <button key={item.id} type="button" onClick={() => setReason(item.id)} className={`h-9 rounded-full px-3 text-xs font-semibold ${reason === item.id ? "bg-white text-black" : "bg-black text-white/80"}`}>
                  {item.label}
                </button>
              ))}
            </div>
            <textarea value={detail} onChange={(event) => setDetail(event.target.value.slice(0, 280))} rows={3} placeholder="Describe issue" className="mt-3 w-full rounded-xl bg-black px-3 py-2 text-sm outline-none" />
            <button type="button" disabled={sending} className="mt-3 h-11 w-full rounded-xl bg-[#fe2c55] text-sm font-semibold disabled:opacity-60" onClick={() => void submitReport()}>
              {sending ? "Sending" : "Submit"}
            </button>
          </div>
        </div>
      ) : null}
      {boostOpen ? (
        <BoostPaySheet
          listingKind={kind}
          id={id}
          title={title || "Your listing"}
          onClose={() => setBoostOpen(false)}
          onSent={(review) => {
            setBoostOpen(false);
            const text = "Payment Successful! Paid to Flare Official Account. It will be pinned after confirmation. Test mode: no real wallet or card was charged.";
            playChime();
            if (review) {
              sessionStorage.setItem("flare_pay_note", text);
              void navigate({ to: "/founder/requests" });
              return;
            }
            setToast(text);
          }}
          onFail={(message) => setToast(errText(new Error(message), t))}
        />
      ) : null}
    </>
  );
}
