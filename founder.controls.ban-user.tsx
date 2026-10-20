import { createFileRoute } from "@tanstack/react-router";
import { BanUserPage } from "@/components/shola/controls-pages";

export const Route = createFileRoute("/founder/controls/ban-user")({
  component: BanUserPage,
});
