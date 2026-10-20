import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PrivacyPolicy, TermsOfService } from "@/components/shola/legal";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function GoogleMark() {
  return (
    <svg className="shrink-0" width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FBBC05" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#EA4335" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#34A853" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [agree, setAgree] = useState(false);
  const [doc, setDoc] = useState<"" | "privacy" | "terms">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isPending && user) return <Navigate to="/" />;

  return (
    <main className="lock-copy grid min-h-dvh place-items-center bg-black px-4 text-white">
      <div className="w-full max-w-[400px] rounded-[28px] border border-[#222222] bg-[#0F0F0F] px-8 py-8">
        <img src="/icons/logo-transparent.png" alt="" width={64} height={64} className="mb-4 size-16 bg-transparent object-contain" />
        <p className="text-[12px] font-semibold tracking-[3px] text-[#888888]">MARKETPLACE</p>
        <h1 className="mt-4 text-[42px] leading-none font-extrabold tracking-tight text-white">Flare</h1>
        <p className="mt-3 text-[16px] text-[#AAAAAA]">Welcome to Flare.</p>
        <button
          type="button"
          disabled={!agree || busy}
          className="mt-8 flex h-14 w-full max-w-[400px] items-center justify-center gap-4 rounded-full bg-white text-[16px] font-bold text-black shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition duration-150 hover:scale-[0.98] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
          onClick={() => {
            const provider = GROK_PROVIDERS[0];
            if (!provider) return;
            setBusy(true);
            setNote("");
            signIn(provider.providerId, { callbackURL: "/" })
              .catch((error) => setNote(error instanceof Error ? error.message : "Sign-in failed"))
              .finally(() => setBusy(false));
          }}
        >
          <GoogleMark />
          <span>{busy ? "Opening Google…" : "Continue with Google"}</span>
        </button>
        {note ? <p className="mt-3 text-sm text-[#FF3B30]">{note}</p> : null}
        <label className="mt-5 flex items-start gap-3 text-[14px] leading-5 text-[#CCCCCC]">
          <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} className="peer sr-only" />
          <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-[5px] border ${agree ? "border-[#3B82F6] bg-[#3B82F6]" : "border-[#666666] bg-transparent"}`}>
            {agree ? (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2 6.2 4.7 9 10 3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </span>
          <span>I agree to the Privacy Policy and the Terms of Service.</span>
        </label>
        <p className="mt-4 text-[15px]">
          <button type="button" className="font-bold text-[#00D26A]" onClick={() => setDoc("privacy")}>
            Privacy Policy
          </button>
          <span className="text-[#777777]"> · </span>
          <button type="button" className="font-bold text-[#00C853]" onClick={() => setDoc("terms")}>
            Terms of Service
          </button>
        </p>
        <p className="mt-6 text-[12px] text-[#777777]">© 2026 Flare. All Rights Reserved.</p>
      </div>
      {doc && (
        <div className="lock-copy fixed inset-0 z-50 flex flex-col bg-black text-start">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#222222] px-2">
            <button type="button" aria-label="Back" className="grid size-10 place-items-center rounded-full bg-black/80 text-lg text-white ring-1 ring-white/20" onClick={() => setDoc("")}>
              ←
            </button>
            <h2 className="text-base font-semibold text-white">{doc === "privacy" ? "Privacy Policy" : "Terms of Service"}</h2>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-12 text-sm leading-7 text-[#AAAAAA]">
            {doc === "privacy" ? <PrivacyPolicy /> : <TermsOfService />}
          </div>
        </div>
      )}
    </main>
  );
}
