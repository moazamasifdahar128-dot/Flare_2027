import { createFileRoute } from "@tanstack/react-router";
import { MaintenancePage } from "@/components/shola/controls-pages";

export const Route = createFileRoute("/founder/controls/maintenance")({
  component: MaintenancePage,
});
