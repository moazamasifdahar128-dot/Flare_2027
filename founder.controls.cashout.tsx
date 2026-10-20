import { createFileRoute } from "@tanstack/react-router";
import { CashoutPage } from "@/components/shola/controls-pages";

export const Route = createFileRoute("/founder/controls/cashout")({
  component: CashoutPage,
});
