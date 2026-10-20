import { createFileRoute } from "@tanstack/react-router";
import { CountryBanPage } from "@/components/shola/country-ban";

export const Route = createFileRoute("/founder/controls/country-ban")({
  component: CountryBanPage,
});
