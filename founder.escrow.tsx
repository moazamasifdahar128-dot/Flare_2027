import { createFileRoute } from "@tanstack/react-router";
import { FounderEscrowPage } from "@/components/shola/founder-escrow";

export const Route = createFileRoute("/founder/escrow")({
  component: FounderEscrowPage,
});
