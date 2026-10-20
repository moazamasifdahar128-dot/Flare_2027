import { useState } from "react";
import { deliveryLinkOk, demoLinkOk, hostLabel } from "@/lib/shola/escrow-links";
import { wordCount } from "@/lib/shola/gig-text";
import { escrowDeliver } from "@/lib/shola/escrow";
import { openOriginal } from "@/components/shola/escrow-warning";

export function EscrowDeliveryForm({ dealId, onDone }: { dealId: string; onDone: () => void }) {
  const [links, setLinks] = useState(["", ""]);
  const [demo, setDemo] = useState("");
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<"video" | "code">("video");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const words = wordCount(message);
  const filled = links.map((item) => item.trim()).filter(Boolean);

  function submit() {
    if (filled.length < 1 || filled.some((item) => !deliveryLinkOk(item))) {
      setError("Invalid link. Must be Google Drive, Dropbox, WeTransfer, or GitHub link starting with https://");
      return;
    }
    if (!demoLinkOk(demo)) {
      setError("The live demo must start with https://");
      return;
    }
    if (words < 20 || words > 400) {
      setError(words < 20 ? "Delivery note is too short (min 20 words)." : "Delivery note is over 400 words.");
      return;
    }
    setBusy(true);
    setError("");
    escrowDeliver({ data: { id: dealId, links: filled, demo, message, kind } })
      .then(() => onDone())
      .catch(() => setError("That delivery was not saved."))
      .finally(() => setBusy(false));
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <p className="text-sm font-semibold">Deliver work</p>
      <p className="text-xs leading-5 text-white/45">Paste the original file link. Flare does not store the file.</p>
      {links.map((value, index) => (
        <input
          key={index}
          value={value}
          onChange={(event) => setLinks((cur) => cur.map((item, i) => i === index ? event.target.value.slice(0, 400) : item))}
          placeholder={index === 0 ? "Paste Google Drive / Dropbox / WeTransfer link here" : "Second link, optional"}
          className={`h-12 w-full rounded-2xl bg-[#16161E] px-3 text-sm outline-none ${value.trim() && !deliveryLinkOk(value) ? "ring-1 ring-[#FF3B30]" : ""}`}
        />
      ))}
      <input value={demo} onChange={(event) => setDemo(event.target.value.slice(0, 300))} placeholder="Paste live website link (optional)" className={`h-12 w-full rounded-2xl bg-[#16161E] px-3 text-sm outline-none ${demo.trim() && !demoLinkOk(demo) ? "ring-1 ring-[#FF3B30]" : ""}`} />
      <textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 4000))} rows={5} placeholder="Tell the buyer what you delivered" className="w-full rounded-2xl bg-[#16161E] px-3 py-3 text-sm outline-none" />
      <p className={`text-xs ${words >= 400 ? "font-semibold text-[#FF3B30]" : words >= 350 ? "text-orange-400" : words > 0 ? "text-emerald-400" : "text-white/45"}`}>{words}/400 words</p>
      <div className="flex gap-2">
        <button type="button" className={`h-10 flex-1 rounded-full text-xs font-semibold ${kind === "video" ? "bg-white text-black" : "bg-[#16161E]"}`} onClick={() => setKind("video")}>Video / short content · 24h</button>
        <button type="button" className={`h-10 flex-1 rounded-full text-xs font-semibold ${kind === "code" ? "bg-white text-black" : "bg-[#16161E]"}`} onClick={() => setKind("code")}>Website / code / design · 48h</button>
      </div>
      {error ? <p className="text-sm font-semibold text-[#FF3B30]">{error}</p> : null}
      <button disabled={busy} className="h-12 w-full rounded-full bg-[#fe2c55] text-sm font-semibold disabled:opacity-40">{busy ? "Sending…" : "Submit delivery"}</button>
    </form>
  );
}

export function DeliveryLinks({ links, demo }: { links: string[]; demo: string }) {
  return (
    <div className="mt-3 space-y-2">
      {links.map((url) => (
        <button key={url} type="button" className="flex w-full items-center justify-between gap-2 rounded-2xl bg-[#16161E] px-3 py-3 text-left text-sm text-sky-300 underline" onClick={() => openOriginal(url)}>
          <span>View delivery: {hostLabel(url)}</span>
          <span aria-hidden="true">↗</span>
        </button>
      ))}
      {demo ? (
        <button type="button" className="flex w-full items-center justify-between gap-2 rounded-2xl bg-[#16161E] px-3 py-3 text-left text-sm text-sky-300 underline" onClick={() => openOriginal(demo)}>
          <span>Open live demo</span>
          <span aria-hidden="true">↗</span>
        </button>
      ) : null}
    </div>
  );
}
