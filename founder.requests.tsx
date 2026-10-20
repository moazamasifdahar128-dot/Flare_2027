import { createFileRoute } from "@tanstack/react-router";
import { RequestsPage } from "@/components/shola/founder-room";

export const Route = createFileRoute("/founder/requests")({
  component: RequestsPage,
});
