import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/components/shola/founder-room";

export const Route = createFileRoute("/founder/overview")({
  component: OverviewPage,
});
