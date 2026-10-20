import { Camera } from "lucide-react";
import { useRef, useState } from "react";

const MAX = 12 * 1024 * 1024;

function frame(img: HTMLImageElement, pan: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1500;
  canvas.height = 500;
  const ctx = canvas.getContext("2d");
  if (!ctx || !img.naturalWidth) return "";
  const wide = img.naturalWidth / img.naturalHeight > 3;
  const sw = wide ? img.naturalHeight * 3 : img.naturalWidth;
  const sh = wide ? img.naturalHeight : img.naturalWidth / 3;
  const sx = wide ? (img.naturalWidth - sw) * pan : 0;
  const sy = wide ? 0 : (img.naturalHeight - sh) * pan;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1500, 500);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function BannerFrame({
  src,
  onChange,
  bleed = false,
  saveLabel = "",
}: {
  src: string;
  onChange: (url: string) => void;
  bleed?: boolean;
  saveLabel?: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [raw, setRaw] = useState("");
  const [pan, setPan] = useState(0.5);
  const [wide, setWide] = useState(true);
  const [big, setBig] = useState(false);

  function paint(next: number) {
    const img = imgRef.current;
    if (!img) return "";
    const url = frame(img, next);
    if (url && !saveLabel) onChange(url);
    return url;
  }

  return (
    <div>
      <div className={`relative aspect-[3/1] overflow-hidden bg-surface ${bleed ? "" : "rounded-xl"}`}>
        {(raw || src) && (
          <img
            src={raw || src}
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: wide ? `${pan * 100}% 50%` : `50% ${pan * 100}%` }}
          />
        )}
        <label className="absolute end-3 top-3 grid size-10 cursor-pointer place-items-center rounded-full bg-black/70 text-fg ring-1 ring-white/20" aria-label="Banner photo">
          <Camera className="size-5" />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > MAX) {
                setBig(true);
                return;
              }
              setRaw(URL.createObjectURL(file));
              setPan(0.5);
            }}
          />
        </label>
      </div>
      {raw && (
        <>
          <img
            ref={imgRef}
            src={raw}
            alt=""
            className="hidden"
            onLoad={(e) => {
              const img = e.currentTarget;
              setWide(img.naturalWidth / img.naturalHeight > 3);
              paint(0.5);
            }}
          />
          <label className={`block text-xs text-muted ${bleed ? "px-5" : ""} mt-2`}>
            Center
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={pan}
              onChange={(e) => {
                const next = Number(e.target.value);
                setPan(next);
                if (!saveLabel) paint(next);
              }}
              onPointerUp={() => paint(pan)}
              className="mt-1 w-full"
            />
          </label>
          {saveLabel && (
            <button
              type="button"
              className="mx-5 mt-2 h-10 rounded-full bg-primary px-4 text-sm font-semibold text-ink"
              onClick={() => {
                const url = frame(imgRef.current as HTMLImageElement, pan);
                if (url) onChange(url);
              }}
            >
              {saveLabel}
            </button>
          )}
        </>
      )}
      {big && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5 ring-1 ring-danger">
            <p className="text-sm font-semibold leading-6 text-danger">That image is too large to open. Choose one under 12MB. It is reduced before it is saved.</p>
            <button type="button" className="mt-4 h-11 w-full rounded-xl bg-primary font-semibold text-ink" onClick={() => setBig(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
