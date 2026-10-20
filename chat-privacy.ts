import { leakHits } from "@/lib/shola/gig-text";

export const CHAT_PRIVACY =
  "⚠️ Contact sharing not allowed on Flare. Phone numbers, WhatsApp, links, emails, social handles are blocked. Use Flare chat only. Message not sent.";

export function blockContactLeak(value: string) {
  return leakHits(value).length > 0;
}
