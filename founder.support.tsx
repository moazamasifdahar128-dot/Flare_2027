import { createFileRoute } from "@tanstack/react-router";
import { SupportPage } from "@/components/shola/founder-room";

export const Route = createFileRoute("/founder/support")({
  component: SupportPage,
});
