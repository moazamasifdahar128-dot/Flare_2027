import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopBack } from "@/components/flare/page";
import { Phone, errText } from "@/components/shola/shell";
import { chatLeak } from "@/lib/shola/gig-text";
import { gigBuy, gigOne, gigPartners, gigSend, gigTalk, threadOpen } from "@/lib/shola/gigs";
import { jobPeople, jobSend, jobTalk } from "@/lib/shola/jobs";
import { blockUser } from "@/lib/shola/server";
import { useI18n } from "@/lib/shola/i18n";

export const Route = createFileRoute("/inquiries/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    with: typeof search.with === "string" ? search.with.slice(0, 32).toLowerCase() : "",
    box: search.box === "job" ? "job" : "gig",
  }),
  component: InquiryThread,
});

function InquiryThread() {
  const { id } = Route.useParams();
  const { with: withUser, box } = Route.useSearch();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [mine, setMine] = useState(false);
  const [staff, setStaff] = useState(false);
  const [people, setPeople] = useState<{ username: string; displayName: string; started: boolean }[]>([]);
  const [msgs, setMsgs] = useState<{ id: string; body: string; mine: boolean }[]>([]);
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [opened, setOpened] = useState(false);
  const [menu, setMenu] = useState(false);
  const [peer, setPeer] = useState(withUser);
  const cap = box === "job" ? 3 : 2;

  function load() {
    if (box === "job") {
      jobTalk({ data: { id, with: withUser } }).then((row) => {
        setTitle(row.title);
        setMine(row.mine);
        setStaff(false);
        setPeer(row.peer || withUser);
        setMsgs(row.messages);
      }).catch(() => setMsgs([]));
      jobPeople({ data: id }).then(setPeople).catch(() => setPeople([]));
    } else {
    gigOne({ data: id }).then((row) => {
      setTitle(row?.title || "");
      setMine(Boolean(row?.mine));
      setStaff(Boolean(row?.staff));
      if (!row?.mine) setPeer(row?.username || withUser);
      else setPeer(withUser);
      if (!row?.mine) {
        setPeople([]);
        return;
      }
      gigPartners({ data: id }).then((list) => setPeople(list.map((person) => ({ username: person.username, displayName: person.displayName, started: person.started })))).catch(() => setPeople([]));
    }).catch(() => undefined);
    if (!withUser && box === "gig") {
      setMsgs([]);
    }
    gigTalk({ data: { id, with: withUser } }).then((rows) => setMsgs(rows.map((row) => ({ id: row.id, body: row.body, mine: row.mine })))).catch(() => setMsgs([]));
    }
    threadOpen({ data: { kind: box, id, username: withUser } }).then((row) => setOpened(row.open)).catch(() => setOpened(false));
  }

  useEffect(load, [id, withUser, box]);

  const buyerStarted = mine ? Boolean(people.find((person) => person.username === withUser)?.started) : true;
  const mineSent = msgs.filter((msg) => msg.mine).length;
  const otherSent = msgs.some((msg) => !msg.mine);
  const locked = !mine && !otherSent && !opened && mineSent >= cap;
  const canCompose = !staff && !locked && ((mine && Boolean(withUser) && buyerStarted) || !mine);
  const wait = box === "job" ? "Waiting for an inquiry before you can reply..." : "Waiting for the first message...";
  const status = otherSent || opened ? "Chat open" : `Limited ${Math.min(mineSent, cap)}/${cap}`;
  const otherName = mine ? people.find((person) => person.username === withUser)?.username || withUser : peer;

  return (
    <Phone>
      <div className="px-4 pt-4 pb-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <TopBack />
            <div>
            <h1 className="text-lg font-semibold">{title || (box === "job" ? "Offer" : "Gig chat")}</h1>
            <p className="mt-1 text-xs text-white/50">{otherSent || opened ? "Chat open. Both sides can keep writing." : status}</p>
            </div>
          </div>
          <button type="button" aria-label="Chat menu" className="mt-6 text-sm font-semibold" onClick={() => setMenu((v) => !v)}>...</button>
        </div>
        {menu && (
          <button type="button" className="mt-2 h-10 rounded-full bg-[#16161E] px-4 text-sm" onClick={() => {
            const who = otherName;
            if (!who) { setNote("Open a person before blocking."); return; }
            blockUser({ data: who }).then(() => setNote("You cannot message this user.")).catch((err) => setNote(errText(err, t)));
          }}>Block user</button>
        )}
        {mine && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {people.length === 0 && <p className="text-sm text-muted">{box === "job" ? "Inquiries will appear here" : "Buyers will appear here"}</p>}
            {people.map((person) => (
              <Link key={person.username} to="/inquiries/$id" params={{ id }} search={{ with: person.username, box }} className={`h-9 shrink-0 rounded-full px-3 text-sm leading-9 ${withUser === person.username ? "bg-gradient-to-r from-cyan-400 to-pink-500 text-black" : "bg-surface"}`}>
                {person.displayName}
              </Link>
            ))}
          </div>
        )}
        {staff && !mine && <p className="mt-6 text-sm text-muted">This thread is private to the owner and the person who wrote first.</p>}
        <div className="mt-4 space-y-2">
          {!(staff && !mine) && msgs.map((msg) => (
            <p key={msg.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${msg.mine ? "ml-auto bg-[#3A8DFF] text-white" : "bg-[#2a2a32] text-white"}`}>{msg.body}</p>
          ))}
        </div>
        {box === "gig" && !mine && !staff && (
          <div className="mt-4 flex gap-2">
            <button type="button" className="h-10 flex-1 rounded-full bg-white text-xs font-semibold text-black" onClick={() => gigBuy({ data: id }).then((next) => setNote(`In-app deal $${next.amount}. Seller receives $${next.payout}. Flare keeps $${next.fee}.`)).catch((err) => setNote(errText(err, t)))}>Create in-app deal</button>
            <Link to="/gigs/$id" params={{ id }} className="grid h-10 flex-1 place-items-center rounded-full bg-[#25D366] text-xs font-semibold text-black">WhatsApp $3</Link>
          </div>
        )}
        {locked && <p className="mt-4 rounded-2xl bg-white/10 px-3 py-3 text-sm text-white/60">🔒 Wait for reply - {mineSent}/{cap} sent</p>}
        {canCompose && (
          <form className="mt-4 flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            if (chatLeak(body)) {
              setNote("Sharing numbers/links not allowed");
              return;
            }
            const send = box === "job" ? jobSend({ data: { id, body, to: withUser } }) : gigSend({ data: { id, body, to: withUser } });
            send.then(() => { setBody(""); setNote(""); load(); }).catch((err) => setNote(errText(err, t)));
          }}>
            <input value={body} onChange={(e) => setBody(e.target.value)} placeholder={mine ? "Reply" : "Message"} className="h-11 flex-1 rounded-xl bg-[#16161E] px-3 text-base outline-none" />
            <button className="h-11 rounded-xl bg-[#fe2c55] px-3 text-sm font-semibold">Send</button>
          </form>
        )}
        {mine && withUser && !buyerStarted && (
          <input disabled value="" placeholder={wait} className="mt-4 h-11 w-full rounded-xl bg-surface px-3 text-base opacity-60" />
        )}
        {note && <p className="mt-3 text-sm text-[#FF3B30]">{note}</p>}
      </div>
    </Phone>
  );
}
