import { useRef, useState, type ReactNode } from "react";

const FLARE_MARK = "/icons/icon-512.png";

export function Portrait({
  src,
  name,
  ceo = false,
  className = "",
}: {
  src?: string;
  name: string;
  ceo?: boolean;
  className?: string;
}) {
  const photo = src || (ceo ? FLARE_MARK : "");
  return (
    <span className={`relative grid size-24 shrink-0 place-items-center ${className}`}>
      {ceo ? <span className="founder-spin pointer-events-none absolute inset-0 rounded-full" aria-hidden="true" /> : null}
      <span className={`grid place-items-center overflow-hidden rounded-full bg-[#16161E] text-2xl font-semibold ${ceo ? "absolute inset-[3px] z-[1]" : "size-24"}`}>
        {photo ? <img src={photo} alt="" className="size-full object-cover" /> : name.slice(0, 1)}
      </span>
      {ceo ? <span className="absolute left-1/2 top-0 z-[3] -translate-x-1/2 -translate-y-1/2 text-sm leading-none" aria-hidden="true">👑</span> : null}
    </span>
  );
}

export function BannerShell({
  src,
  ceo = false,
  children,
}: {
  src?: string;
  ceo?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`relative mx-3 mt-3 ${ceo ? "ceo-banner rounded-xl" : ""}`}>
      <div className="relative z-[1] h-40 overflow-hidden rounded-[10px] bg-gradient-to-r from-[#1a1030] via-[#3a1760] to-[#fe2c55]">
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : ceo ? (
          <div className="flex h-full items-center justify-center gap-3">
            <img src={FLARE_MARK} alt="" className="size-14 rounded-2xl" />
            <span className="text-lg font-semibold tracking-wide text-white">Flare</span>
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function CropSheet({
  fileUrl,
  shape,
  onCancel,
  onUse,
}: {
  fileUrl: string;
  shape: "banner" | "circle";
  onCancel: () => void;
  onUse: (dataUrl: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  function finish() {
    const img = imgRef.current;
    if (!img?.naturalWidth) return;
    const w = shape === "banner" ? 1200 : 512;
    const h = shape === "banner" ? 675 : 512;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * base;
    const dh = img.naturalHeight * base;
    ctx.drawImage(img, (w - dw) / 2 + pan.x, (h - dh) / 2 + pan.y, dw, dh);
    onUse(canvas.toDataURL("image/jpeg", 0.86));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/80 p-4">
      <div className="w-full rounded-2xl bg-[#16161E] p-4">
        <p className="text-sm font-semibold">{shape === "banner" ? "Crop banner" : "Crop photo"}</p>
        <p className="mt-1 text-xs text-white/50">Drag to move. Use the slider to zoom.</p>
        <div
          className={`relative mx-auto mt-3 touch-none overflow-hidden bg-black ${shape === "banner" ? "aspect-video w-full rounded-xl" : "size-56 rounded-full"}`}
          onPointerDown={(event) => {
            drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y };
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            setPan({ x: drag.current.px + event.clientX - drag.current.x, y: drag.current.py + event.clientY - drag.current.y });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          <img
            ref={imgRef}
            src={fileUrl}
            alt=""
            draggable={false}
            className="pointer-events-none size-full object-cover"
            style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
          />
        </div>
        <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-3 w-full" />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onCancel} className="h-10 flex-1 rounded-full bg-white/10 text-sm">Cancel</button>
          <button type="button" onClick={finish} className="h-10 flex-1 rounded-full bg-[#25D366] text-sm font-semibold text-black">Use crop</button>
        </div>
      </div>
    </div>
  );
}
