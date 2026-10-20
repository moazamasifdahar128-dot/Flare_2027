import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Sql } from "@/lib/db";
import { getSql } from "@/lib/db";
import { contactLeak, maskContact } from "@/lib/shola/gig-text";
import { sellerSplit } from "@/lib/shola/board-rules";
import {
  WELCOME,
  boostApproved,
  boostEnded,
  boostLength,
  boostLive,
  boostPending,
  boostRejected,
  cashFailed,
  cashPaid,
  dayLabel,
  dealDone,
  dealFee,
  listingAction,
  reportsHidden,
  teamNote,
  tickRemovedGrace,
  tickRemovedLow,
  viewsAlert,
  whatsappOpen,
} from "@/lib/shola/system-copy";

function nid() {
  return crypto.randomUUID();
}

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function postSystem(
  sql: Sql,
  input: { userId: string; kind: string; body: string; ref?: string; appeal?: boolean },
) {
  if (!input.userId || !input.body) return false;
  const ref = (input.ref ?? "").slice(0, 120);
  if (ref) {
    const seen = await sql`select 1 from system_messages where user_id = ${input.userId} and kind = ${input.kind} and ref = ${ref} limit 1`;
    if (seen.length) return false;
  }
  await sql`
    insert into system_messages (id, user_id, kind, body, ref, appeal_ok)
    values (${nid()}, ${input.userId}, ${input.kind}, ${input.body.slice(0, 2000)}, ${ref}, ${Boolean(input.appeal)})`;
  return true;
}

export async function welcomeOnce(sql: Sql, userId: string) {
  await postSystem(sql, { userId, kind: "welcome", body: WELCOME, ref: "signup" });
}

export async function noteBoostWait(sql: Sql, userId: string, listingId: string, title: string, kind: string) {
  const name = maskContact(title).slice(0, 80) || "your listing";
  const usd = kind === "month" ? 20 : kind === "week" ? 6 : 2;
  await postSystem(sql, {
    userId,
    kind: "boost_wait",
    body: boostPending(name, usd, boostLength(kind)),
    ref: `${listingId}:wait:${nid()}`,
  });
}

export async function noteBoost(sql: Sql, userId: string, gigId: string, title: string, kind: string) {
  const name = maskContact(title).slice(0, 80) || "your listing";
  const length = boostLength(kind);
  const usd = kind === "month" ? 20 : kind === "week" ? 6 : 2;
  await postSystem(sql, { userId, kind: "boost_ok", body: boostApproved(name, usd), ref: `${gigId}:ok` });
  await postSystem(sql, { userId, kind: "boost_on", body: boostLive(name, length, usd), ref: `${gigId}:on:${kind}` });
}

export async function noteBoostReject(sql: Sql, userId: string, listingId: string, title: string) {
  const name = maskContact(title).slice(0, 80) || "your listing";
  await postSystem(sql, { userId, kind: "boost_no", body: boostRejected(name), ref: `${listingId}:no:${nid()}` });
}

export async function noteReceipt(sql: Sql, userId: string, purpose: string, ref: string) {
  await postSystem(sql, {
    userId,
    kind: "pay_wait",
    body: `Payment Successful: Your ${purpose} was received. It activates after confirmation.`,
    ref,
  });
}

export async function notePayOk(sql: Sql, userId: string, purpose: string, ref: string) {
  await postSystem(sql, {
    userId,
    kind: "pay_ok",
    body: `Approved: Your ${purpose} activated.`,
    ref,
  });
}

export async function notePayReject(sql: Sql, userId: string, ref: string) {
  await postSystem(sql, {
    userId,
    kind: "pay_no",
    body: "Rejected: The payment was not approved. In test mode nothing is refunded from a real wallet.",
    ref,
  });
}

export async function noteBoostEnd(sql: Sql, userId: string, gigId: string, title: string, kind: string, until: string) {
  const name = maskContact(title).slice(0, 80) || "your listing";
  await postSystem(sql, {
    userId,
    kind: "boost_off",
    body: boostEnded(name, boostLength(kind)),
    ref: `${gigId}:${until}`,
  });
}

export async function noteDeal(sql: Sql, sellerId: string, buyerId: string, postId: string, amount: number) {
  const gig = await sql<{ title: string }>`select title from gigs where id = ${postId}`;
  const job = gig[0] ? null : (await sql<{ title: string }>`select title from job_posts where id = ${postId}`)[0];
  const title = maskContact(gig[0]?.title || job?.title || "your listing").slice(0, 80);
  const split = sellerSplit(amount);
  const seller = (await sql<{ display_name: string; username: string }>`select display_name, username from profiles where user_id = ${sellerId}`)[0];
  const buyer = (await sql<{ display_name: string; username: string }>`select display_name, username from profiles where user_id = ${buyerId}`)[0];
  const sellerName = seller?.display_name || seller?.username || "the seller";
  const buyerName = buyer?.display_name || buyer?.username || "the buyer";
  await postSystem(sql, {
    userId: sellerId,
    kind: "deal_fee",
    body: dealFee(Math.max(0, Math.floor(amount)), title, split.fee, split.payout),
    ref: `${postId}:${buyerId}`,
  });
  await postSystem(sql, { userId: sellerId, kind: "deal_done", body: dealDone(buyerName, title), ref: `${postId}:${buyerId}:seller` });
  await postSystem(sql, { userId: buyerId, kind: "deal_done", body: dealDone(sellerName, title), ref: `${postId}:${sellerId}:buyer` });
}

export async function noteWhatsapp(sql: Sql, buyerId: string, sellerId: string, gigId: string) {
  const gig = (await sql<{ title: string; whatsapp: string }>`select title, whatsapp from gigs where id = ${gigId}`)[0];
  const seller = (await sql<{ display_name: string; username: string }>`select display_name, username from profiles where user_id = ${sellerId}`)[0];
  const name = seller?.display_name || seller?.username || "the seller";
  const handle = seller?.username ? `@${seller.username}` : name;
  const digits = String(gig?.whatsapp || "").replace(/\D/g, "");
  const buyer = (await sql<{ username: string }>`select username from profiles where user_id = ${buyerId}`)[0];
  await postSystem(sql, {
    userId: buyerId,
    kind: "wa_open",
    body: whatsappOpen(handle, digits, maskContact(gig?.title || "").slice(0, 80)),
    ref: gigId,
  });
  await postSystem(sql, {
    userId: sellerId,
    kind: "wa_seller",
    body: `Your WhatsApp was unlocked by @${buyer?.username || "a buyer"}.`,
    ref: `${gigId}:seller`,
  });
}

export async function noteModeration(sql: Sql, userId: string, gigId: string, title: string, action: "hidden" | "deleted", spam: boolean) {
  const reason = spam ? "spam" : "a violation of the terms";
  await postSystem(sql, {
    userId,
    kind: action === "hidden" ? "listing_hidden" : "listing_deleted",
    body: listingAction(maskContact(title).slice(0, 80) || "your listing", action, reason),
    ref: gigId,
    appeal: false,
  });
}

export async function noteReports(sql: Sql, userId: string, listingId: string, title: string) {
  await postSystem(sql, {
    userId,
    kind: "listing_hidden",
    body: reportsHidden(maskContact(title).slice(0, 80) || "your listing"),
    ref: listingId,
    appeal: false,
  });
}

export async function noteViews(sql: Sql, userId: string, views: number, removed: boolean) {
  if (removed && views < 2_000) {
    await postSystem(sql, { userId, kind: "tick_low", body: tickRemovedLow(views), ref: `low:${views}` });
    return;
  }
  if (removed) {
    await postSystem(sql, { userId, kind: "tick_grace", body: tickRemovedGrace(views), ref: `grace:${views}` });
    return;
  }
  await postSystem(sql, { userId, kind: "views_low", body: viewsAlert(views), ref: `fade:${Math.floor(views / 100)}` });
}

export async function noteCash(sql: Sql, userId: string, amount: number, method: string, mask: string, ok: boolean, id: string, tx = "") {
  const last4 = mask.replace(/\D/g, "").slice(-4) || "----";
  const label = method || "payout account";
  const body = ok ? cashPaid(amount, label, last4, tx) : cashFailed(amount, "the payout review was declined");
  await postSystem(sql, { userId, kind: ok ? "cash_paid" : "cash_no", body, ref: id });
}

export const systemFeed = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string; kind: string; body: string; ref: string; appeal_ok: boolean; read: boolean; created_at: string }>`
      select id, kind, body, ref, appeal_ok, read, created_at::text as created_at
      from system_messages
      where user_id = ${context.userId}
      order by created_at desc
      limit 80`;
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      body: row.body,
      ref: row.ref,
      appeal: false,
      read: Boolean(row.read),
      at: row.created_at,
    }));
  });

export const systemRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`update system_messages set read = true where user_id = ${context.userId} and read = false`;
    return { ok: true };
  });

export const broadcastLog = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const me = (await sql<{ is_founder: boolean }>`select is_founder from profiles where user_id = ${context.userId}`)[0];
    if (!me?.is_founder) throw new Error("FORBIDDEN");
    return sql<{ body: string; at: string }>`
      select min(body) as body, min(created_at)::text as at
      from system_messages
      where kind = 'team' and ref <> ''
      group by ref
      order by min(created_at) desc
      limit 5`;
  });

export const sendTeamNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title?: string; body?: string; username?: string }) => ({
    title: clean(input?.title, 80),
    body: clean(input?.body, 600),
    username: clean(input?.username, 32).toLowerCase(),
  }))
  .handler(async ({ context, data }) => {
    if (data.title.length < 3 || data.body.length < 3) throw new Error("EMPTY");
    if (contactLeak(data.title) || contactLeak(data.body)) throw new Error("GIG_LEAK");
    const sql = await getSql();
    const me = (await sql<{ is_founder: boolean }>`select is_founder from profiles where user_id = ${context.userId}`)[0];
    if (!me?.is_founder) throw new Error("FORBIDDEN");
    const people = data.username
      ? await sql<{ user_id: string }>`select user_id from profiles where username = ${data.username}`
      : await sql<{ user_id: string }>`select user_id from profiles`;
    if (!people.length) throw new Error("MISSING");
    const ref = nid();
    const body = teamNote(data.title, data.body);
    for (const person of people) {
      await postSystem(sql, { userId: person.user_id, kind: "team", body, ref });
    }
    return { ok: true, sent: people.length };
  });
