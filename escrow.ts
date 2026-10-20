import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { sellerSplit } from "@/lib/shola/board-rules";
import { deliveryLinkOk, demoLinkOk, lockHours } from "@/lib/shola/escrow-links";
import { containsContactInfo, wordCount } from "@/lib/shola/gig-text";
import { postSystem } from "@/lib/shola/system-notes";

function nid() {
  return crypto.randomUUID();
}

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

async function db(userId: string) {
  const sql = await getSql();
  const banned = await sql`select 1 from profiles where user_id = ${userId} and (banned_forever or (banned_until is not null and banned_until > now()))`;
  if (banned.length) throw new Error("BANNED");
  return sql;
}

async function founder(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  const me = await sql<{ is_founder: boolean }>`select is_founder from profiles where user_id = ${userId}`;
  if (!me[0]?.is_founder) throw new Error("FORBIDDEN");
}

async function sweep(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql`update escrow_deliveries set locked = true where locked = false and expires_at <= now()`;
}

export const escrowOpen = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((postId: string) => clean(postId, 80))
  .handler(async ({ context, data }) => {
    const sql = await db(context.userId);
    const gig = (await sql<{ user_id: string; price: number }>`select user_id, price_usd as price from gigs where id = ${data} and removed_at is null`)[0];
    const job = gig ? null : (await sql<{ user_id: string; price: number }>`select user_id, price from job_posts where id = ${data} and hidden_at is null`)[0];
    const post = gig ?? job;
    if (!post || post.user_id === context.userId) throw new Error("FORBIDDEN");
    const amount = Math.max(1, Math.floor(Number(post.price) || 0));
    const id = nid();
    await sql`
      insert into board_deals (id, post_id, buyer_id, seller_id, amount, currency, status)
      values (${id}, ${data}, ${context.userId}, ${post.user_id}, ${amount}, ${"USD"}, ${"asked"})
      on conflict (post_id, buyer_id) do nothing`;
    const row = (await sql<{ id: string }>`select id from board_deals where post_id = ${data} and buyer_id = ${context.userId} order by created_at desc limit 1`)[0];
    if (!row) throw new Error("FORBIDDEN");
    return { id: row.id };
  });

export const escrowOne = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => clean(id, 80))
  .handler(async ({ context, data }) => {
    const sql = await db(context.userId);
    await sweep(sql);
    const deal = (await sql<{
      id: string; post_id: string; buyer_id: string; seller_id: string; amount: number; status: string;
      buyer: string; seller: string; buyer_country: string; seller_country: string; title: string;
    }>`
      select d.id, d.post_id, d.buyer_id, d.seller_id, d.amount, d.status,
        b.username as buyer, s.username as seller, b.country as buyer_country, s.country as seller_country,
        coalesce(g.title, j.title, 'Order') as title
      from board_deals d
      join profiles b on b.user_id = d.buyer_id
      join profiles s on s.user_id = d.seller_id
      left join gigs g on g.id = d.post_id
      left join job_posts j on j.id = d.post_id
      where d.id = ${data}`)[0];
    if (!deal) return null;
    const me = (await sql<{ is_founder: boolean }>`select is_founder from profiles where user_id = ${context.userId}`)[0];
    const party = deal.buyer_id === context.userId || deal.seller_id === context.userId || me?.is_founder;
    if (!party) return null;
    const box = (await sql<{
      link_a: string; link_b: string; demo_link: string; message: string; kind: string;
      delivered_at: string; expires_at: string; locked: boolean;
    }>`
      select link_a, link_b, demo_link, message, kind, delivered_at::text as delivered_at, expires_at::text as expires_at, locked
      from escrow_deliveries where deal_id = ${deal.id}`)[0];
    const role = deal.seller_id === context.userId ? "seller" : deal.buyer_id === context.userId ? "buyer" : "founder";
    const hide = Boolean(box?.locked) && role === "buyer";
    const split = sellerSplit(deal.amount);
    return {
      id: deal.id,
      postId: deal.post_id,
      title: deal.title,
      amount: deal.amount,
      status: deal.status,
      role,
      buyer: deal.buyer,
      seller: deal.seller,
      fee: split.fee,
      payout: split.payout,
      delivery: box ? {
        links: hide ? [] : [box.link_a, box.link_b].filter(Boolean),
        demo: hide ? "" : box.demo_link,
        message: box.message,
        kind: box.kind,
        deliveredAt: box.delivered_at,
        expiresAt: box.expires_at,
        locked: Boolean(box.locked),
      } : null,
    };
  });

export const escrowDeliver = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string; links?: string[]; demo?: string; message?: string; kind?: string }) => ({
    id: clean(input?.id, 80),
    links: (input?.links ?? []).map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 2),
    demo: String(input?.demo ?? "").trim().slice(0, 300),
    message: String(input?.message ?? "").trim().slice(0, 4000),
    kind: input?.kind === "code" ? "code" : "video",
  }))
  .handler(async ({ context, data }) => {
    if (data.links.length < 1 || data.links.length > 2 || data.links.some((item) => !deliveryLinkOk(item))) throw new Error("ESCROW_LINK");
    if (!demoLinkOk(data.demo)) throw new Error("ESCROW_DEMO");
    const words = wordCount(data.message);
    if (words < 20 || words > 400) throw new Error("ESCROW_NOTE");
    if (containsContactInfo(data.message)) throw new Error("GIG_LEAK");
    const sql = await db(context.userId);
    const deal = (await sql<{ seller_id: string; buyer_id: string; status: string; post_id: string }>`
      select seller_id, buyer_id, status, post_id from board_deals where id = ${data.id}`)[0];
    if (!deal || deal.seller_id !== context.userId) throw new Error("FORBIDDEN");
    if (!["held", "delivered"].includes(deal.status)) throw new Error("ESCROW_WAIT");
    const hours = lockHours(data.kind);
    const expires = new Date(Date.now() + hours * 3_600_000).toISOString();
    await sql`
      insert into escrow_deliveries (deal_id, link_a, link_b, demo_link, message, kind, delivered_at, expires_at, locked)
      values (${data.id}, ${data.links[0]}, ${data.links[1] ?? ""}, ${data.demo}, ${data.message}, ${data.kind}, now(), ${expires}, false)
      on conflict (deal_id) do update set
        link_a = excluded.link_a,
        link_b = excluded.link_b,
        demo_link = excluded.demo_link,
        message = excluded.message,
        kind = excluded.kind,
        delivered_at = now(),
        expires_at = ${expires},
        locked = false`;
    await sql`update board_deals set status = 'delivered', updated_at = now() where id = ${data.id}`;
    const short = data.id.slice(0, 8);
    await postSystem(sql, {
      userId: deal.buyer_id,
      kind: "deal_in",
      body: `New Delivery for Order #${short}. Open the order and save the file now. The link locks in Flare after ${hours} hours. The file stays on the seller's drive.`,
      ref: `${data.id}:deliver`,
    });
    return { ok: true, hours };
  });

export const escrowAccept = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => clean(id, 80))
  .handler(async ({ context, data }) => {
    const sql = await db(context.userId);
    const deal = (await sql<{ buyer_id: string; status: string; amount: number }>`
      select buyer_id, status, amount from board_deals where id = ${data}`)[0];
    if (!deal || deal.buyer_id !== context.userId || deal.status !== "delivered") throw new Error("FORBIDDEN");
    await sql`update board_deals set status = 'accepted', updated_at = now() where id = ${data}`;
    const founders = await sql<{ user_id: string }>`select user_id from profiles where is_founder = true`;
    const short = data.slice(0, 8);
    for (const row of founders) {
      await postSystem(sql, {
        userId: row.user_id,
        kind: "deal_ready",
        body: `Ready to Release Payment. Order #${short} was accepted by the buyer. 15% stays with Flare.`,
        ref: `${data}:ready`,
      });
    }
    return { ok: true };
  });

export const escrowQueue = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db(context.userId);
    await founder(sql, context.userId);
    await sweep(sql);
    const rows = await sql<{
      id: string; amount: number; status: string; buyer: string; seller: string; title: string;
      kind: string; link_a: string; link_b: string; demo_link: string; delivered_at: string; locked: boolean;
    }>`
      select d.id, d.amount, d.status, b.username as buyer, s.username as seller,
        coalesce(g.title, j.title, 'Order') as title,
        coalesce(e.kind, '') as kind, coalesce(e.link_a, '') as link_a, coalesce(e.link_b, '') as link_b,
        coalesce(e.demo_link, '') as demo_link, coalesce(e.delivered_at::text, '') as delivered_at, coalesce(e.locked, false) as locked
      from board_deals d
      join profiles b on b.user_id = d.buyer_id
      join profiles s on s.user_id = d.seller_id
      left join gigs g on g.id = d.post_id
      left join job_posts j on j.id = d.post_id
      left join escrow_deliveries e on e.deal_id = d.id
      where d.status in ('asked', 'pending', 'paid_wait', 'held', 'delivered', 'accepted')
      order by d.updated_at desc
      limit 40`;
    return rows.map((row) => {
      const split = sellerSplit(row.amount);
      return {
        id: row.id,
        title: row.title,
        amount: row.amount,
        status: row.status,
        buyer: row.buyer,
        seller: row.seller,
        kind: row.kind,
        links: [row.link_a, row.link_b].filter(Boolean),
        demo: row.demo_link,
        deliveredAt: row.delivered_at,
        locked: Boolean(row.locked),
        fee: split.fee,
        payout: split.payout,
      };
    });
  });

export const escrowRelease = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string; action?: string }) => ({
    id: clean(input?.id, 80),
    action: input?.action === "hold" ? "hold" : "release",
  }))
  .handler(async ({ context, data }) => {
    const sql = await db(context.userId);
    await founder(sql, context.userId);
    const deal = (await sql<{ buyer_id: string; seller_id: string; status: string; amount: number; post_id: string }>`
      select buyer_id, seller_id, status, amount, post_id from board_deals where id = ${data.id}`)[0];
    if (!deal) throw new Error("FORBIDDEN");
    if (data.action === "hold") {
      if (!["asked", "pending", "paid_wait"].includes(deal.status)) throw new Error("FORBIDDEN");
      await sql`update board_deals set status = 'held', updated_at = now() where id = ${data.id}`;
      return { ok: true };
    }
    if (deal.status !== "accepted") throw new Error("FORBIDDEN");
    await sql`update board_deals set status = 'released', updated_at = now() where id = ${data.id} and status = 'accepted'`;
    const split = sellerSplit(deal.amount);
    const short = data.id.slice(0, 8);
    await postSystem(sql, {
      userId: deal.buyer_id,
      kind: "deal_done",
      body: `Escrow Order #${short} completed. Payment $${split.payout} released to the seller. Flare fee $${split.fee} (15%).`,
      ref: `${data.id}:buyer-release`,
    });
    await postSystem(sql, {
      userId: deal.seller_id,
      kind: "deal_fee",
      body: `Payment received. $${split.payout} added to your wallet for Order #${short}. Flare fee $${split.fee} (15%) was kept. Withdraw it from Wallet.`,
      ref: `${data.id}:seller-release`,
    });
    return { ok: true, ...split };
  });
