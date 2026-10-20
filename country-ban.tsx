import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ownerAct, ownerDesk } from "@/lib/shola/server";
import { BAN_SPANS, WORLD, banCopy, banLeft, countryByCode, filterCountries, type BanCountry } from "@/lib/shola/world";

export function CountryBanPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<BanCountry | null>(null);
  const [span, setSpan] = useState<(typeof BAN_SPANS)[number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [bans, setBans] = useState<NonNullable<Awaited<ReturnType<typeof ownerDesk>>>["blocks"]>([]);

  function loadBans() {
    ownerDesk().then((row) => {
      const live = (row?.blocks ?? []).filter((block) => block.forever || (block.until != null && new Date(block.until).getTime() > Date.now()));
      setBans(live);
    }).catch(() => setBans([]));
  }

  useEffect(() => {
    const id = window.setTimeout(() => setQ(query), 100);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(loadBans, []);

  const rows = useMemo(() => filterCountries(q), [q]);

  function apply() {
    if (!picked || !span || busy) return;
    setBusy(true);
    setErr("");
    const choice = span;
    const country = picked;
    ownerAct({
      data: {
        kind: "geo",
        country: country.code,
        hours: choice.hours,
        name: country.name,
        flag: country.flag,
        phone: country.phone,
        continent: country.continent,
        duration: choice.label,
        message: banCopy(country.name),
      },
    }).then(() => {
      try { sessionStorage.setItem("flare_founder_toast", `${country.flag} ${country.name} banned for ${choice.label} - Flare blocked`); } catch { /* private mode */ }
      navigate({ to: "/founder/controls" });
    }).catch(() => {
      setBusy(false);
      setErr("Ban was not saved.");
    });
  }

  return (
    <div className="flex h-dvh flex-col bg-black text-white">
      <div className="shrink-0 border-b border-white/10 px-4 pt-4 pb-3">
        <button type="button" className="text-sm text-white/70" onClick={() => navigate({ to: "/founder/controls" })}>← Back</button>
        <h1 className="mt-2 text-xl font-semibold">Select Country to Ban</h1>
        <div className="relative mt-3">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country name or code... e.g., Pakistan, UK, 92, 966"
            className="h-12 w-full rounded-2xl bg-[#16161E] pr-10 pl-10 text-sm outline-none"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {query ? (
            <button type="button" aria-label="Clear search" className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-white/60" onClick={() => setQuery("")}>✕</button>
          ) : null}
        </div>
        <p className="mt-2 text-[11px] text-white/40">{q.trim() ? `${rows.length} matches` : `${WORLD.length} countries · A to Z`}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
        <section className="rounded-2xl bg-[#16161E] p-3">
          <p className="text-sm font-semibold">Active Banned Countries ({bans.length})</p>
          {bans.length === 0 ? <p className="mt-2 text-sm text-white/55">No countries banned - Flare is open worldwide 🌍</p> : (
            <div className="mt-2 space-y-2">
              {bans.map((block) => {
                const known = countryByCode(block.country);
                const name = block.name || known?.name || block.country;
                const flag = block.flag || known?.flag || "";
                const phone = block.phone || known?.phone || "";
                const duration = block.duration || (block.forever ? "Permanent" : "limited");
                const expires = block.forever || !block.until ? "Permanent" : String(block.until).slice(0, 10);
                return (
                  <div key={block.country} className="flex items-center gap-2 rounded-xl bg-black px-3 py-2">
                    <p className="min-w-0 flex-1 text-xs leading-5">{flag} {name} ({phone}) - Banned for {duration} - Remaining: {banLeft(block.until, block.forever)} - Expires: {expires}</p>
                    <button type="button" className="h-8 shrink-0 rounded-full bg-white px-3 text-xs font-semibold text-red-600" onClick={() => ownerAct({ data: { kind: "clear", country: block.country } }).then(() => loadBans())}>Unban</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        {rows.map((row) => (
          <button
            key={row.code}
            type="button"
            onClick={() => { setPicked(row); setSpan(null); setErr(""); }}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${picked?.code === row.code ? "bg-gradient-to-r from-amber-200/30 via-amber-400/20 to-yellow-200/10 ring-1 ring-amber-300" : "bg-[#16161E]"}`}
          >
            <span className="text-3xl leading-none">{row.flag}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{row.name}</span>
              <span className="block text-xs text-white/45">{row.code} • {row.phone} • {row.continent}</span>
            </span>
            <span className="text-lg text-white/35" aria-hidden>›</span>
          </button>
        ))}
        {rows.length === 0 ? <p className="px-1 text-sm text-white/45">No country matches that search.</p> : null}
      </div>
      {picked ? (
        <div className="shrink-0 border-t border-white/10 bg-[#0c0c12] px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
          <p className="text-sm font-semibold">Ban {picked.flag} {picked.name} ({picked.phone})?</p>
          <p className="mt-1 text-xs text-white/50">Choose how long to block Flare in this country</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {BAN_SPANS.map((item) => (
              <button key={item.label} type="button" onClick={() => setSpan(item)} className={`h-9 rounded-full px-3 text-xs font-semibold ${span?.label === item.label ? "bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 text-black" : "bg-white/10"}`}>{item.label}</button>
            ))}
          </div>
          <button type="button" disabled={!span || busy} onClick={apply} className="mt-3 h-12 w-full rounded-2xl bg-red-700 text-sm font-semibold text-white disabled:opacity-40">
            {busy ? "Applying ban…" : `Apply Ban - Block ${picked.name} Now`}
          </button>
          {err ? <p className="mt-2 text-xs text-red-300">{err}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
