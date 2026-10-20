export const BOARD_KINDS = ["offer", "need", "shop"] as const;
export const BOARD_CATS = ["Video", "Design", "Development", "Web", "Marketing", "Writing", "Mobile", "Shop", "Other"] as const;
export const REQUEST_CATS = ["Design", "Development", "Video", "Writing", "Marketing", "Other"] as const;
export const REQUEST_DEADLINES = ["1 day", "3 days", "5 days", "1 week", "2 weeks"] as const;
export const BOARD_PAY_KINDS = ["boost_day", "boost_week", "boost_month", "renew"] as const;
export const BOARD_METHODS = ["jazzcash", "easypaisa", "payoneer", "wise"] as const;

export type BoardKind = (typeof BOARD_KINDS)[number];
export type BoardCat = (typeof BOARD_CATS)[number];
export type BoardPayKind = (typeof BOARD_PAY_KINDS)[number];
export type BoardMethod = (typeof BOARD_METHODS)[number];

const PRICES: Record<"pk" | "world", Record<BoardPayKind, string>> = {
  pk: { boost_day: "580 PKR", boost_week: "1,740 PKR", boost_month: "5,800 PKR", renew: "1,450 PKR" },
  world: { boost_day: "2 USD", boost_week: "6 USD", boost_month: "20 USD", renew: "5 USD" },
};

export function payRegion(method: string): "pk" | "world" | null {
  if (method === "jazzcash" || method === "easypaisa") return "pk";
  if (method === "payoneer" || method === "wise") return "world";
  return null;
}

export function payLabel(kind: string, method: string) {
  const region = payRegion(method);
  if (!region || !BOARD_PAY_KINDS.includes(kind as BoardPayKind)) return "";
  return PRICES[region][kind as BoardPayKind];
}

export function sellerSplit(amount: number) {
  const safe = Math.max(0, Math.floor(amount));
  const fee = Math.floor((safe * 15) / 100);
  return { fee, payout: safe - fee, rate: 15 };
}

export function shopLink(value: string) {
  const raw = value.trim().slice(0, 200);
  if (!raw) return "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "";
  }
  if (url.protocol !== "https:") return "";
  if (url.username || url.password) return "";
  return url.toString();
}
