export const REPORT_REASONS = ["spam", "fake", "inappropriate", "scam", "abusive", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_LABELS: { id: ReportReason; label: string }[] = [
  { id: "spam", label: "Spam" },
  { id: "fake", label: "Fake" },
  { id: "scam", label: "Scam" },
  { id: "abusive", label: "Abusive" },
  { id: "other", label: "Other" },
];

export const REPORT_HIDE_AT = 5;

export function reportReason(value: string): ReportReason {
  const key = value.trim().toLowerCase();
  return (REPORT_REASONS as readonly string[]).includes(key) ? (key as ReportReason) : "other";
}

export function boostLeft(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "";
  const end = new Date(iso).getTime();
  if (!Number.isFinite(end) || end <= now) return "";
  const mins = Math.max(1, Math.ceil((end - now) / 60000));
  if (mins < 60) return `Ends in ${mins}m`;
  const hours = Math.ceil(mins / 60);
  if (hours < 48) return `Ends in ${hours}h`;
  return `Ends in ${Math.ceil(hours / 24)}d`;
}

export function shouldHideForReports(count: number) {
  return count >= REPORT_HIDE_AT;
}

export function formatTimeAgo(iso: string, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "Just now";
  const sec = Math.floor((now - then) / 1000);
  if (sec < 5) return "Just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}h ago`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}d ago`;
  const week = Math.floor(day / 7);
  if (week < 4) return `${week}w ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${Math.max(1, month)}mo ago`;
  const year = Math.floor(day / 365);
  return `${Math.max(1, year)}y ago`;
}
