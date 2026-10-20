import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, errText } from "@/components/shola/shell";
import { TopBack } from "@/components/flare/page";
import { usdText } from "@/lib/shola/money";
import { profileDesk, requestCash } from "@/lib/shola/profile-desk";
import { myPayouts } from "@/lib/shola/payouts";
import { myHandle } from "@/lib/shola/server";
import { useI18n } from "@/lib/shola/i18n";

export const Route = createFileRoute("/wallet")({ component: Wallet });

const PAY_LABEL: Record<string, string> = {
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bank: "Bank",
  wise: "Wise",
  payoneer: "Payoneer",
  usdt: "USDT",
};

function Wallet() {
  const { t } = useI18n();
  const [handle, setHandle] = useState("");
  const [desk, setDesk] = useState<Awaited<ReturnType<typeof profileDesk>>>(null);
  const [page, setPage] = useState<"home" | "cash" | "history">("home");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [methods, setMethods] = useState<Awaited<ReturnType<typeof myPayouts>>>([]);
  const [methodId, setMethodId] = useState("");

  function load(name = handle) {
    if (!name) return;
    profileDesk({ data: name }).then(setDesk).catch(() => setDesk(null));
  }

  useEffect(() => {
    myHandle().then((row) => {
      setHandle(row.username);
      load(row.username);
    }).catch(() => undefined);
    myPayouts().then((rows) => {
      setMethods(rows);
      const picked = rows.find((item) => item.isDefault) ?? rows[0];
      if (picked) setMethodId(picked.id);
    }).catch(() => setMethods([]));
  }, []);

  const usd = desk?.earnings.find((row) => row.currency === "USD")?.amount ?? 0;

  return (
    <Phone bare>
      <div className="px-4 pt-4 pb-16">
        <div className="flex items-center justify-between">
          <TopBack onClick={page === "home" ? undefined : () => setPage("home")} />
          {handle ? <Link to="/u/$username" params={{ username: handle }} className="text-sm text-white/60">Profile</Link> : null}
        </div>
        <h1 className="mt-3 text-2xl font-semibold">{page === "history" ? "Withdrawal history" : page === "cash" ? "Withdraw" : "My Wallet"}</h1>
        <p className="mt-4 rounded-3xl bg-[#16161E] p-4 text-lg font-semibold">Your Balance: {usdText(usd)}</p>
        <p className="mt-2 text-xs leading-5 text-white/45">Only released in-app deals, after the 15% cut. This page is yours alone.</p>
        {page === "home" && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className="h-12 rounded-full bg-[#fe2c55] text-sm font-semibold" onClick={() => setPage("cash")}>Withdraw</button>
            <button type="button" className="h-12 rounded-full bg-[#16161E] text-sm font-semibold" onClick={() => setPage("history")}>History</button>
          </div>
        )}
        {page === "cash" && (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const chosen = methods.find((item) => item.id === methodId);
              if (!chosen) {
                setNote("Add payout method first in Wallet > Payout Settings");
                return;
              }
              requestCash({ data: { amount: Number(amount), method: chosen.method, title: chosen.title, account: chosen.account } }).then((row) => {
                setNote(`Your withdraw request of $${row.amount} was received. It will be processed in 24-48 hours.`);
                setAmount("");
                load();
              }).catch((err) => setNote(errText(err, t)));
            }}
          >
            {methods.length === 0 ? (
              <button type="button" className="h-12 w-full rounded-2xl bg-[#16161E] text-sm font-semibold" onClick={() => { try { sessionStorage.setItem("flare_open_payout", "1"); } catch { /* ignore */ } window.location.assign("/settings"); }}>Add payout method first</button>
            ) : (
              <label className="block text-xs text-white/50">
                Withdraw to
                <select value={methodId} onChange={(event) => setMethodId(event.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-[#16161E] px-3 text-sm">
                  {methods.map((item) => <option key={item.id} value={item.id}>{PAY_LABEL[item.method] ?? item.method} {item.account.slice(0, 4)}… ({item.title}){item.isDefault ? " · Default" : ""}</option>)}
                </select>
              </label>
            )}
            <label className="block text-xs text-white/50">
              Amount in USD (any amount from your balance)
              <input value={amount} inputMode="numeric" onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 6))} className="mt-1 h-12 w-full rounded-2xl bg-[#16161E] px-3 text-sm outline-none" />
            </label>
            <button disabled={methods.length === 0 || usd < 1 || Number(amount) < 1 || Number(amount) > usd} className="h-12 w-full rounded-full bg-[#fe2c55] text-sm font-semibold disabled:opacity-40">Request Withdraw</button>
          </form>
        )}
        {page === "history" && (
          <div className="mt-4 space-y-2">
            {(desk?.withdrawals ?? []).length === 0 && <p className="text-sm text-white/45">No requests yet.</p>}
            {(desk?.withdrawals ?? []).map((row, index) => (
              <p key={`${row.currency}-${index}`} className="rounded-2xl bg-[#16161E] px-4 py-3 text-sm">
                {row.currency === "USD" ? usdText(row.amount) : `${row.amount} PKR`} · {row.status}{row.method ? ` · ${row.method}` : ""}{row.account ? ` · ${row.account}` : ""}
              </p>
            ))}
          </div>
        )}
        {note ? <p className="mt-4 text-sm leading-6 text-white/75">{note}</p> : null}
      </div>
    </Phone>
  );
}
