import { createFileRoute } from "@tanstack/react-router";
import { RequestsPanel } from "@/components/shola/requests";
import { Phone } from "@/components/shola/shell";

export const Route = createFileRoute("/board/")({
  validateSearch: (search: Record<string, unknown>) => ({
    kind: typeof search.kind === "string" ? search.kind : "",
    category: typeof search.category === "string" ? search.category : "",
    posted: search.posted === "1" ? "1" : "",
  }),
  component: JobsPage,
});

function JobsPage() {
  const { posted } = Route.useSearch();
  return (
    <Phone>
      <div className="absolute inset-0 overflow-hidden bg-black">
        <RequestsPanel posted={posted === "1"} />
      </div>
    </Phone>
  );
}
