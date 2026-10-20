import { createFileRoute } from "@tanstack/react-router";
import { TopBack } from "@/components/flare/page";

export const Route = createFileRoute("/about")({ component: About });

function About() {
  return (
    <div className="min-h-dvh bg-white px-8 py-8 text-black">
      <TopBack />
      <div className="mx-auto flex min-h-[78dvh] max-w-sm flex-col items-center text-center">
        <img src="/icons/logo-transparent.png" alt="Flare" width={80} height={80} className="mt-6 size-20 bg-transparent object-contain" />
        <p className="mt-8 text-[16px] font-bold leading-7 text-black">
          <span className="text-[#FF5A5F]">Flare</span> is a simple marketplace where talent meets opportunity.
          <br />
          Built for creators worldwide.
        </p>
        <p className="mt-10 text-[12px] leading-5 font-normal text-[#9CA3AF]">
          Founder: MOAZAM ASIF
          <br />
          Hafizabad, Pakistan
        </p>
        <p className="mt-auto pt-16 text-[10px] text-[#9CA3AF]">© 2026 Flare - All Rights Reserved</p>
      </div>
    </div>
  );
}
