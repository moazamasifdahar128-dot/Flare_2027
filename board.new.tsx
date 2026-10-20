import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { TopBack } from "@/components/flare/page";
import { BOARD_LIMIT_BODY, BOARD_LIMIT_TITLE, LimitModal } from "@/components/shola/limit-modal";
import { Phone, errText } from "@/components/shola/shell";
import { postRequest, requestOne, updateRequest } from "@/lib/shola/board";
import { REQUEST_CATS, REQUEST_DEADLINES } from "@/lib/shola/board-rules";
import { containsContactInfo, leakNote, trimWords, wordCount } from "@/lib/shola/gig-text";
import { LeakMark } from "@/components/shola/leak-mark";
import { useI18n } from "@/lib/shola/i18n";
import { listingQuota } from "@/lib/shola/profile-desk";

export const Route = createFileRoute("/board/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    edit: typeof search.edit === "string" ? search.edit.slice(0, 80) : "",
  }),
  component: NewRequest,
});

function hitLimit(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("LIMIT_REACHED") || message.includes("REQUEST_LIMIT");
}

function NewRequest() {
  const { t } = useI18n();
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<(typeof REQUEST_CATS)[number]>("Design");
  const [budget, setBudget] = useState("50");
  const [deadline, setDeadline] = useState<(typeof REQUEST_DEADLINES)[number]>("3 days");
  const [note, setNote] = useState("");
  const [titleAlert, setTitleAlert] = useState(false);
  const [bodyAlert, setBodyAlert] = useState(false);
  const titleTimer = useRef(0);
  const bodyTimer = useRef(0);
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState({ requests: 0, requestMax: 5, username: "" });
  const [blocked, setBlocked] = useState(false);
  const [checked, setChecked] = useState(Boolean(edit));
  const count = wordCount(body);
  const titleWords = wordCount(title);
  const titleOk = title.trim().length > 0 && (titleWords >= 3 || title.trim().length >= 10) && title.length <= 80;
  const bodyOk = count >= 20 && count <= 400;
  const titleLeak = containsContactInfo(title);
  const bodyLeak = containsContactInfo(body);
  const cap = quota.requestMax || 5;
  const full = !edit && quota.requests >= cap;

  useEffect(() => {
    listingQuota().then((row) => {
      const requests = Number(row?.requests) || 0;
      const requestMax = Number(row?.requestMax) || 5;
      setQuota({ requests, requestMax, username: String(row?.username || "") });
      if (!edit && requests >= requestMax) setBlocked(true);
    }).catch(() => undefined).finally(() => setChecked(true));
  }, [edit]);

  useEffect(() => {
    if (!edit) return;
    requestOne({ data: edit }).then((row) => {
      if (!row?.mine) {
        navigate({ to: "/board", search: { kind: "need", category: "", posted: "" } });
        return;
      }
      setTitle(row.title);
      setBody(row.body);
      setBudget(String(row.price || ""));
      if (REQUEST_CATS.includes(row.category as (typeof REQUEST_CATS)[number])) setCategory(row.category as (typeof REQUEST_CATS)[number]);
      if (REQUEST_DEADLINES.includes(row.deadline as (typeof REQUEST_DEADLINES)[number])) setDeadline(row.deadline as (typeof REQUEST_DEADLINES)[number]);
    }).catch(() => setNote("This request could not be opened."));
  }, [edit, navigate]);

  function manage() {
    try { sessionStorage.setItem("flare_profile_tab", "requests"); } catch { /* private mode */ }
    if (quota.username) navigate({ to: "/u/$username", params: { username: quota.username } });
    else navigate({ to: "/settings" });
  }

  function ping(setter: (value: boolean) => void, timer: { current: number }, ms: number) {
    setter(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setter(false), ms);
  }

  function takeTitle(raw: string) {
    if (raw.length > 80) {
      setTitle(raw.slice(0, 80));
      ping(setTitleAlert, titleTimer, 3000);
      return;
    }
    setTitle(raw);
  }

  function takeBody(raw: string) {
    const clipped = raw.length > 2000 ? raw.slice(0, 2000) : raw;
    if (wordCount(clipped) > 400 || raw.length > 2000) {
      setBody(trimWords(clipped, 400));
      ping(setBodyAlert, bodyTimer, 4000);
      return;
    }
    setBody(raw);
  }

  function publish() {
    if (full) {
      setBlocked(true);
      return;
    }
    if (!titleOk || !bodyOk || titleLeak || bodyLeak) {
      if (titleLeak) setNote(leakNote(title));
      else if (bodyLeak) setNote(leakNote(body));
      else if (!titleOk) setNote("A title needs at least 3 words or 10 characters.");
      else setNote(count > 0 && count < 20 ? "Description too short (min 20 words)" : "A description needs at least 20 words, and at most 400 words.");
      return;
    }
    setBusy(true);
    setNote("");
    const payload = { title, body, category, budget: Number(budget), deadline };
    const save = edit ? updateRequest({ data: { id: edit, ...payload } }) : postRequest({ data: payload });
    save
      .then(async (row) => {
        if (edit) {
          navigate({ to: "/board/$id", params: { id: row.id } });
          return;
        }
        navigate({ to: "/board", search: { kind: "need", category: "", posted: "1" } });
      })
      .catch((error) => {
        if (hitLimit(error)) setBlocked(true);
        else setNote(errText(error, t));
      })
      .finally(() => setBusy(false));
  }

  return (
    <Phone>
      <div className="h-full overflow-y-auto px-4 pt-4 pb-10">
        <div className="mb-3 flex items-center gap-3">
          <TopBack />
          <h1 className="text-2xl font-semibold">{edit ? "Edit Board" : "Create Board"}</h1>
        </div>
        <div className="flex justify-end">
          <p className="rounded-full bg-[#16161E] px-3 py-1 text-xs font-semibold text-white/80">Active Boards: {Math.min(quota.requests, cap)}/{cap}</p>
        </div>
        <p className="mt-2 text-sm text-white/55">Text-only posts. Boards remain active until deleted and are kept separate from Gigs.</p>
        {!edit && !checked ? (
          <div className="mt-4 animate-pulse space-y-3">
            <div className="h-12 rounded-xl bg-white/10" />
            <div className="h-28 rounded-xl bg-white/10" />
          </div>
        ) : null}
        {(edit || (checked && !full)) && (
        <>
        <label className="mt-4 block text-sm">
          Title
          <LeakMark
            value={title}
            maxLength={80}
            onChange={takeTitle}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData("text");
              const start = event.currentTarget.selectionStart ?? title.length;
              const end = event.currentTarget.selectionEnd ?? title.length;
              const merged = title.slice(0, start) + pasted + title.slice(end);
              if (merged.length > 80) {
                event.preventDefault();
                takeTitle(merged);
              }
            }}
            onKeyDown={(event) => {
              if (title.length >= 80 && event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) ping(setTitleAlert, titleTimer, 3000);
            }}
            minClass="min-h-12"
            bad={titleLeak}
          />
          <span className={`mt-1 block text-xs ${title.length >= 80 ? "font-semibold text-[#FF3B30]" : title.length >= 70 ? "text-[#FF3B30]" : "text-white/45"}`}>{title.length}/80 characters</span>
          {titleAlert ? <span className="mt-1 block text-xs font-semibold text-[#FF3B30]">Title limit reached (80 chars max). Extra text trimmed.</span> : null}
          <span className={`text-xs ${titleOk ? "text-emerald-400" : "text-white/45"}`}>{titleOk ? "Looks good" : `${titleWords} words - at least 3 words or 10 characters`}</span>
          {titleLeak ? <span className="mt-1 block text-xs font-semibold text-[#FF3B30]">{leakNote(title)}</span> : null}
        </label>
        <label className="mt-3 block text-sm">
          Description
          <LeakMark
            value={body}
            onChange={takeBody}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData("text");
              const start = event.currentTarget.selectionStart ?? body.length;
              const end = event.currentTarget.selectionEnd ?? body.length;
              const merged = body.slice(0, start) + pasted + body.slice(end);
              if (wordCount(merged) > 400 || merged.length > 2000) {
                event.preventDefault();
                takeBody(merged);
              }
            }}
            minClass="min-h-40"
            bad={bodyLeak}
          />
          <span className={`mt-1 block text-xs ${count >= 400 ? "font-semibold text-[#FF3B30]" : count >= 350 ? "text-orange-400" : count > 0 ? "text-emerald-400" : "text-white/45"}`}>{count}/400 words</span>
          {bodyAlert ? <span className="mt-1 block text-xs font-semibold text-[#FF3B30]">Description limit reached (400 words max). Extra words trimmed.</span> : null}
          <span className={`text-xs ${bodyOk ? "text-emerald-400" : "text-white/45"}`}>{bodyOk ? "Looks good" : count > 0 && count < 20 ? "Description too short (min 20 words)" : `${count} words - at least 20 words, up to 400`}</span>
          {bodyLeak ? <span className="mt-1 block text-xs font-semibold text-[#FF3B30]">{leakNote(body)}</span> : null}
        </label>
        <label className="mt-3 block text-sm">
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value as (typeof REQUEST_CATS)[number])} className="mt-1 h-12 w-full rounded-xl bg-[#16161E] px-3 text-base">
            {REQUEST_CATS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="mt-3 block text-sm">
          Budget in USD
          <input value={budget} onChange={(event) => setBudget(event.target.value.replace(/[^\d]/g, "").slice(0, 7))} inputMode="numeric" className="mt-1 h-12 w-full rounded-xl bg-[#16161E] px-3 text-base outline-none" />
        </label>
        <label className="mt-3 block text-sm">
          Delivery deadline
          <select value={deadline} onChange={(event) => setDeadline(event.target.value as (typeof REQUEST_DEADLINES)[number])} className="mt-1 h-12 w-full rounded-xl bg-[#16161E] px-3 text-base">
            {REQUEST_DEADLINES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        {note ? <p className="mt-3 text-sm text-[#fe2c55]">{note}</p> : null}
        <button type="button" disabled={busy || !titleOk || !bodyOk || titleLeak || bodyLeak} onClick={publish} className="mt-5 h-12 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-amber-300 text-sm font-semibold text-black disabled:opacity-60">
          {busy ? "Saving" : edit ? "Save" : "Post"}
        </button>
        </>
        )}
      </div>
      <LimitModal
        open={blocked}
        title={BOARD_LIMIT_TITLE}
        body={BOARD_LIMIT_BODY}
        manageLabel="Go to My Boards"
        onManage={manage}
        onClose={() => {
          if (full) {
            navigate({ to: "/board", search: { kind: "need", category: "", posted: "" } });
            return;
          }
          setBlocked(false);
        }}
      />
    </Phone>
  );
}
