export const WELCOME = `👋 Welcome to Flare!

You can post Offer a Service (Gigs with photos/videos) or Post a Request (what you need).

Start exploring! 🚀
- Team Flare`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function dayLabel(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "the scheduled date";
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function boostLength(kind: string) {
  if (kind === "month") return "1 month";
  if (kind === "week") return "1 week";
  return "24 hours";
}

export function boostPending(title: string, usd: number, duration: string) {
  return `Payment Successful: Your $${usd} for ${duration} boost on '${title}' was received. It will be pinned after confirmation.`;
}

export function boostApproved(title: string, usd = 2) {
  return `✅ Approved: Your $${usd} boost request for '${title}' has been approved. Your listing will be boosted and pinned to top within a few minutes. Thank you for using Flare.`;
}

export function boostLive(title: string, duration: string, usd = 0) {
  const price = usd ? ` for $${usd}` : "";
  return `🚀 Boosted: Congratulations! Your listing '${title}' is now boosted and pinned on top of the feed${price} for ${duration}. It will be shown first to all users. Enjoy more views!`;
}

export function boostRejected(title: string) {
  return `Rejected: Your payment for '${title}' was not pinned. In test mode the charge is reversed. No real wallet was debited.`;
}

export function boostEnded(title: string, duration: string) {
  return `📉 Boost Ended: Your boost for '${title}' has ended after ${duration}. Your listing will now move down normally as new listings arrive. If you want to boost again, you can do it from Flare Studio > Boost Listing.`;
}

export function dealFee(amount: number, title: string, fee: number, payout: number) {
  return `💰 Commission Deducted: Your deal of $${amount} for '${title}' is completed. Flare fee 15% ($${fee}) has been deducted. You received $${payout} (85%) in your wallet. You can withdraw anytime from Wallet. Thank you!`;
}

export function dealDone(user: string, title: string) {
  return `✅ Deal Completed: Your deal with ${user} for ${title} is marked completed by both parties.`;
}

export function listingAction(title: string, action: "hidden" | "deleted", reason: string) {
  return `⚠️ Action Taken: Your listing '${title}' has been ${action} by the Flare team due to ${reason}. There is no in-app appeal. For queries, contact support@flare.app.`;
}

export function reportsHidden(title: string) {
  return `⚠️ Action Taken: Your listing '${title}' was hidden due to multiple reports and is under review. There is no in-app appeal. For queries, contact support@flare.app.`;
}

export function whatsappOpen(name: string, number: string, title = "") {
  const shown = number || "the number on the gig";
  const gig = title ? ` for ${title}` : "";
  return `✅ WhatsApp Unlocked${gig}\n\nNumber: ${shown}. Tap to chat on WhatsApp. Seller: ${name}.`;
}

export function viewsAlert(views: number) {
  return `👁️ Views: Your gig views are ${views.toLocaleString("en-US")}. Blue Tick never auto-removes. It is removed only if you delete a gig and total gig views fall below 2,000. Board views do not count.`;
}

export function tickRemovedLow(views: number) {
  return `😔 Blue Tick Removed: You deleted a gig and total gig views are now ${views.toLocaleString("en-US")} (under 2,000). A new tick needs the $2.50 fee again after you reach 5,000 gig views. Board views do not count. - Team Flare`;
}

export function tickRemovedGrace(views: number) {
  return `😔 Blue Tick stays. Gig views are ${views.toLocaleString("en-US")}. Blue Tick is not removed on a timer. It is removed only if you delete a gig and total gig views fall below 2,000. - Team Flare`;
}

export function cashPaid(amount: number, method: string, last4: string, tx = "") {
  const ref = tx ? ` TxID: ${tx}.` : "";
  return `✅ Withdrawal approved! $${amount} sent to your ${method} ending ${last4}.${ref} Check your account.`;
}

export function cashFailed(amount: number, reason: string) {
  return `❌ Withdrawal Failed: Your withdrawal of $${amount} failed due to ${reason}. Amount has been returned to your Flare wallet. Please try again.`;
}

export function teamNote(title: string, body: string) {
  return `📢 Update from Flare Team: ${title}\n\n${body}\n\n[From Flare Team]`;
}
