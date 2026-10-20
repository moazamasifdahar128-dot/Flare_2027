import { createFileRoute } from "@tanstack/react-router";
import { Feed } from "@/components/shola/feed";
import { Phone } from "@/components/shola/shell";

export const Route = createFileRoute("/v/$id")({
  component: Watch,
});

function Watch() {
  const { id } = Route.useParams();
  return (
    <Phone>
      <Feed focus={id} />
    </Phone>
  );
}
