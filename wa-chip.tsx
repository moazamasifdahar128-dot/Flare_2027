import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useState } from "react";
import { prettyWhatsapp, pkrForUsd, UNLOCK_USD } from "@/lib/shola/money";

export function armUnlock(id: string) {
  try {
    sessionStorage.setItem("flare_unlock", id);
  } catch {
    /* ignore */
  }
}

export function WhatsAppChip({
  gigId,
  open,
  number,
  listed = false,
  compact = false,
  onUnlock,
}: {
  gigId: string;
  open: boolean;
  number: string;
  listed?: boolean;
  compact?: boolean;
  onUnlock?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const digits = String(number || "").replace(/\D/g, "");
  const full = prettyWhatsapp(digits);
  const height = compact ? "h-9 text-[10px]" : "h-10 text-[11px]";
  if (!open && !listed && !digits) return null;
  if (open && full) {
    return (
      <div className={`flex ${height} min-w-0 flex-1 items-center gap-1`}>
        <span className="min-w-0 flex-1 truncate rounded-full bg-[#25D366] px-2 text-center font-semibold leading-9 text-black">{full}</span>
        <button
          type="button"
          className="h-full shrink-0 rounded-full bg-white px-2 font-semibold text-black"
          onClick={() => {
            navigator.clipboard.writeText(digits).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }).catch(() => undefined);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="grid h-full shrink-0 place-items-center rounded-full bg-black px-2 font-semibold text-[#25D366]">Open</a>
      </div>
    );
  }
  const className = `flex ${height} min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-[#25D366] px-2 font-semibold leading-tight text-black`;
  const label = (
    <>
      <Lock className="size-3.5 shrink-0" />
      <span className="truncate">Unlock WhatsApp · ${UNLOCK_USD} / {pkrForUsd(UNLOCK_USD)} PKR</span>
    </>
  );
  if (onUnlock) {
    return (
      <button type="button" className={className} onClick={onUnlock}>
        {label}
      </button>
    );
  }
  return (
    <Link to="/gigs/$id" params={{ id: gigId }} className={className} onClick={() => armUnlock(gigId)}>
      {label}
    </Link>
  );
}
