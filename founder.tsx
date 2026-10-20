import { createFileRoute } from "@tanstack/react-router";
import { FounderLayout } from "@/components/shola/founder-room";

export const Route = createFileRoute("/founder")({
  component: FounderLayout,
});
