import { createFileRoute } from "@tanstack/react-router";
import { ControlsPage } from "@/components/shola/founder-room";

export const Route = createFileRoute("/founder/controls/")({
  component: ControlsPage,
});
