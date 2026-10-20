import { useRouter } from "@tanstack/react-router";

export function TopBack({ floating = false, onClick }: { floating?: boolean; onClick?: () => void }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => (onClick ? onClick() : router.history.back())}
      className={`grid size-10 shrink-0 place-items-center rounded-full bg-black/80 text-lg font-semibold text-white ring-1 ring-white/25 ${floating ? "absolute top-3 left-3 z-20" : ""}`}
    >
      ←
    </button>
  );
}

export function BackBar({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <TopBack />
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold">{title}</h1>
        {hint ? <p className="truncate text-xs text-white/45">{hint}</p> : null}
      </div>
    </div>
  );
}