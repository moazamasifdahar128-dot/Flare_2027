import { getRequest, setResponseStatus } from "@tanstack/react-start/server";
import type { Sql } from "@/lib/db";

function headerCountry() {
  try {
    const headers = getRequest().headers;
    const code = (headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || "").toUpperCase();
    return /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1" ? code : "";
  } catch {
    return "";
  }
}

export async function assertCountryOpen(sql: Sql, userId: string) {
  const me = await sql<{ country: string; is_founder: boolean }>`select country, is_founder from profiles where user_id = ${userId}`;
  if (me[0]?.is_founder) return;
  const codes = new Set<string>();
  const saved = String(me[0]?.country ?? "").toUpperCase();
  if (/^[A-Z]{2}$/.test(saved)) codes.add(saved);
  const header = headerCountry();
  if (header) codes.add(header);
  for (const code of codes) {
    const hit = await sql`select country from geo_blocks where country = ${code} and (forever = true or (until is not null and until > now())) limit 1`;
    if (hit.length) {
      setResponseStatus(403, "Country banned");
      throw new Error("Country banned");
    }
  }
}
