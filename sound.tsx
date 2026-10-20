import { createFileRoute } from "@tanstack/react-router";
import { Phone } from "@/components/shola/shell";
import { TopBack } from "@/components/flare/page";

export const Route = createFileRoute("/sound")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q.slice(0, 60) : "" }),
  component: SoundPage,
});

function SoundPage() {
  const { q } = Route.useSearch();
  return (
    <Phone bare>
      <div className="px-4 pt-4">
        <TopBack />
        <p className="text-xs uppercase tracking-wide text-primary">Sound</p>
        <h1 className="mt-2 text-3xl font-semibold">{q || "Untitled"}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">This sound belongs to a published video. New videos are not posted from here.</p>
        <p className="mt-10 text-center text-[11px] text-muted">© 2026 Flare. All Rights Reserved.</p>
      </div>
    </Phone>
  );
}
