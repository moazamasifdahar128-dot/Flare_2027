import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Phone, errText } from "@/components/shola/shell";
import { TopBack } from "@/components/flare/page";
import { HELP_FAQ } from "@/lib/shola/help-faq";
import { askHelp } from "@/lib/shola/profile-desk";
import { useI18n } from "@/lib/shola/i18n";

export const Route = createFileRoute("/help")({ component: Help });

function Help() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(-1);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return HELP_FAQ;
    return HELP_FAQ.filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(needle));
  }, [q]);

  return (
    <Phone bare>
      <div className="px-4 pt-4 pb-16">
        <div className="flex items-center gap-3">
          <TopBack />
          <h1 className="text-2xl font-semibold">Help Center</h1>
        </div>
        <p className="mt-1 text-sm text-white/50">Answers for gigs, fees, views, and the blue tick.</p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your problem..." className="mt-4 h-12 w-full rounded-2xl bg-[#16161E] px-4 text-sm outline-none" />
        <div className="mt-3 space-y-2">
          {rows.map((item) => {
            const index = HELP_FAQ.indexOf(item);
            const shown = open === index;
            return (
              <div key={item.q} className="overflow-hidden rounded-2xl bg-[#16161E]">
                <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(shown ? -1 : index)}>
                  <span className="min-w-0 flex-1 text-sm font-semibold">{item.q}</span>
                  <span className={`text-white/60 ${shown ? "rotate-90" : ""}`}>▸</span>
                </button>
                {shown && <p className="px-4 pb-4 text-sm leading-6 text-white/75">{item.a}</p>}
              </div>
            );
          })}
          {rows.length === 0 && <p className="py-6 text-center text-sm text-white/45">No matching answer.</p>}
        </div>
        <form
          className="mt-6 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            askHelp({ data: { subject, body } }).then(() => {
              setSubject("");
              setBody("");
              setNote("Sent to the founder. The reply arrives in your system inbox.");
            }).catch((err) => setNote(errText(err, t)));
          }}
        >
          <p className="text-sm font-semibold">Contact us</p>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="h-11 w-full rounded-2xl bg-[#16161E] px-3 text-sm outline-none" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Describe the problem. No phone or link." className="w-full rounded-2xl bg-[#16161E] p-3 text-sm outline-none" />
          <button className="h-12 w-full rounded-full bg-[#fe2c55] text-sm font-semibold">Contact Support</button>
        </form>
        {note ? <p className="mt-3 text-sm text-white/70">{note}</p> : null}
      </div>
    </Phone>
  );
}
