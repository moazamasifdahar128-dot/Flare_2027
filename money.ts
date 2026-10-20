const RATE = 290;

export const UNLOCK_USD = 3;
export const TICK_USD = 2.5;

export function boostUsd(kind: string) {
  if (kind === "month") return 20;
  if (kind === "week") return 6;
  return 2;
}

export function pkrForUsd(usd: number) {
  return Math.round(usd * RATE);
}

export function usdText(usd: number) {
  const amount = Math.round(usd * 100) / 100;
  const shown = Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/0$/, "");
  return `$${shown} (~${pkrForUsd(amount).toLocaleString("en-US")} PKR)`;
}

export function maskWhatsapp(raw: string) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 8) return "";
  const hidden = Math.max(2, digits.length - 8);
  return `${digits.slice(0, 5)}${"X".repeat(hidden)}${digits.slice(-3)}`;
}

export function prettyWhatsapp(raw: string) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 8) return "";
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export function maskWaPretty(raw: string) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 8) return "";
  return `${digits.slice(0, 4)}-${"X".repeat(Math.max(1, digits.length - 6))}${digits.slice(-2)}`;
}

export function maskAccount(method: string, reference: string) {
  const clean = reference.replace(/\s+/g, "");
  if (method !== "bank" || clean.length < 8) return reference;
  return `••••${clean.slice(-4)}`;
}
