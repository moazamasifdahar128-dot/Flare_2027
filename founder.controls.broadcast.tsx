import { createFileRoute } from "@tanstack/react-router";
import { BroadcastPage } from "@/components/shola/controls-pages";

export const Route = createFileRoute("/founder/controls/broadcast")({
  component: BroadcastPage,
});
