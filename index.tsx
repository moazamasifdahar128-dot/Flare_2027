import { createFileRoute } from "@tanstack/react-router";
import { GigsPanel } from "@/components/shola/gigs";
import { Phone } from "@/components/shola/shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <Phone>
      <div className="absolute inset-0 overflow-hidden bg-black">
        <GigsPanel standalone />
      </div>
    </Phone>
  );
}
