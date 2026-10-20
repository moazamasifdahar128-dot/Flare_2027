import { useEffect, useState } from "react";

function left(until: string) {
  const ms = new Date(until).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${m}m ${s}s`;
}

export function EscrowWarning({ expiresAt, kind, locked }: { expiresAt: string; kind: string; locked: boolean }) {
  const [clock, setClock] = useState(() => left(expiresAt));

  useEffect(() => {
    setClock(left(expiresAt));
    const id = window.setInterval(() => setClock(left(expiresAt)), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  if (locked || !clock) {
    return (
      <p className="rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-sm text-white/60">
        Delivery link expired and locked in Flare. The file is still on the seller's drive. Ask the seller if you need the link again.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-[#DC2626] bg-[#2D0000] px-3 py-3 text-sm text-white">
      <p className="font-semibold">Download and save the files now.</p>
      <p className="mt-1 leading-5">
        The link locks inside Flare after {kind === "code" ? "48 hours" : "24 hours"}. The file stays on the seller's drive. Flare does not delete it.
      </p>
      <p className="mt-2 font-semibold">Link locks in Flare in: {clock}</p>
    </div>
  );
}

export function openOriginal(url: string) {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) window.location.assign(url);
}
