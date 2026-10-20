export type LeakHit = { start: number; end: number; value: string; type: string };

const NUMBER_WORD = /\b(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/gi;
const PHONE = /(?:\+|00)?(?:\d[\s.*\-–—()[\]{}]?){7,15}/g;
const LINK = /(?:https?:\/\/|www\.)\S+|(?:wa\.me|api\.whatsapp\.com|whatsapp\.com|t\.me|telegram\.me|youtu\.be|discord\.gg)\/\S+|\b[a-z0-9][\w-]*\.(?:com|net|org|io|co|app|ly|me|tv|info|site|online|xyz|link|to|be|cc|gg|pro|biz|pk)\b/gi;
const EMAIL = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi;
const MAILBOX = /@(?:gmail|yahoo|hotmail|outlook|icloud)\b/gi;
const HANDLE = /(?<![a-z0-9._%+-])@[a-z0-9_]{2,}\b/gi;

export const PRIVACY_BLOCK = "For your privacy & security, sharing personal contact or external links in listing is not allowed. Please use secure unlock system.";

export const CHAT_BLOCK = "Sharing phone numbers, links or social handles is not allowed for privacy. Use Flare deals or WhatsApp Unlock.";

function pushMatches(value: string, pattern: RegExp, type: string, hits: LeakHit[]) {
  pattern.lastIndex = 0;
  for (const match of value.matchAll(pattern)) {
    const raw = match[0];
    const start = match.index ?? 0;
    if (!raw) continue;
    hits.push({ start, end: start + raw.length, value: raw, type });
  }
}

function pushPhones(value: string, hits: LeakHit[]) {
  PHONE.lastIndex = 0;
  for (const match of value.matchAll(PHONE)) {
    let raw = match[0];
    const start = match.index ?? 0;
    while (raw && !/\d$/.test(raw)) raw = raw.slice(0, -1);
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) continue;
    hits.push({ start, end: start + raw.length, value: raw, type: "phone" });
  }
}

function mergeHits(hits: LeakHit[]) {
  const sorted = hits.filter((hit) => hit.end > hit.start).sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: LeakHit[] = [];
  for (const hit of sorted) {
    const last = merged[merged.length - 1];
    if (last && hit.start < last.end) {
      last.end = Math.max(last.end, hit.end);
      continue;
    }
    merged.push({ ...hit });
  }
  return merged;
}

export function leakHits(value: string): LeakHit[] {
  const raw = String(value ?? "");
  if (!raw.trim()) return [];
  const hits: LeakHit[] = [];
  pushPhones(raw, hits);
  pushMatches(raw, LINK, "link", hits);
  pushMatches(raw, EMAIL, "email", hits);
  pushMatches(raw, MAILBOX, "email", hits);
  pushMatches(raw, HANDLE, "handle", hits);
  const spoken = [...raw.matchAll(NUMBER_WORD)];
  if (spoken.length >= 7) {
    for (const match of spoken) {
      const text = match[0];
      const start = match.index ?? 0;
      hits.push({ start, end: start + text.length, value: text, type: "words" });
    }
  }
  return mergeHits(hits);
}

export function leakNote(value: string) {
  const hits = leakHits(value);
  if (!hits.length) return "";
  const items = [...new Set(hits.map((hit) => hit.value.trim()).filter(Boolean))].slice(0, 4);
  return `Remove to publish: ${items.map((item) => `[${item}]`).join(", ")} - Highlighted in yellow above - Delete them`;
}

export function containsContactInfoBio(value: string) {
  return leakHits(value).length > 0;
}

export function containsContactInfo(value: string) {
  return containsContactInfoBio(value);
}

export function contactLeak(value: string) {
  return containsContactInfo(value);
}

export function chatLeak(value: string) {
  return containsContactInfo(value);
}

export function whatsappDigits(value: string) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 15);
}

export function whatsappOk(value: string) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function fakeBadge(value: string) {
  const text = String(value ?? "");
  if (/[✅✔️☑️💙🔵🔷☑✓✔🟦]/u.test(text)) return true;
  if (/blue\s*tick/i.test(text)) return true;
  return /\bverified\b/i.test(text);
}

export function wordCount(value: string) {
  const text = value.trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

export function trimWords(value: string, max: number) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= max) return value;
  return parts.slice(0, max).join(" ");
}

export function maskContact(value: string) {
  const hits = leakHits(value);
  if (!hits.length) return value;
  let out = "";
  let cursor = 0;
  for (const hit of hits) {
    out += value.slice(cursor, hit.start) + "••••";
    cursor = hit.end;
  }
  return out + value.slice(cursor);
}
