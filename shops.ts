import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { keepSweep } from "@/lib/shola/life";

const CATS = ["Fashion", "Electronics", "Home", "Services", "Other"] as const;

function nid() {
  return crypto.randomUUID();
}

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cents(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(10_000_000, Math.max(0, Math.round(n * 100)));
}

async function open(userId: string) {
  const sql = await getSql();
  if ((await sql`select 1 from profiles where user_id = ${userId} and (banned_forever or (banned_until is not null and banned_until > now()))`).length) {
    throw new Error("BANNED");
  }
  return sql;
}

export const shopList = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { category?: string; q?: string } | null | undefined) => ({
    category: clean(input?.category, 24),
    q: clean(input?.q, 60).toLowerCase(),
  }))
  .handler(async ({ context, data }) => {
    const sql = await open(context.userId);
    await keepSweep(sql);
    const category = CATS.includes(data.category as (typeof CATS)[number]) ? data.category : "";
    const rows = await sql<{
      id: string; name: string; category: string; cover: string; logo: string; username: string; display_name: string; products: number;
    }>`
      select s.id, s.name, s.category, s.cover, s.logo, pr.username, pr.display_name,
        (select count(*)::int from shop_products p where p.shop_id = s.id) as products
      from shops s
      join profiles pr on pr.user_id = s.user_id
      where (${category} = '' or s.category = ${category})
        and (${data.q} = '' or lower(s.name) like ${"%" + data.q + "%"} or lower(s.category) like ${"%" + data.q + "%"})
        and (s.expires_at is null or s.expires_at > now())
      order by s.created_at desc
      limit 40`;
    return rows;
  });

export const shopsByName = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((username: string) => clean(username, 32).toLowerCase())
  .handler(async ({ context, data }) => {
    const sql = await open(context.userId);
    return sql<{ id: string; name: string; category: string; logo: string }>`
      select s.id, s.name, s.category, s.logo
      from shops s
      join profiles pr on pr.user_id = s.user_id
      where lower(pr.username) = ${data}
      order by s.created_at desc
      limit 12`;
  });

export const shopMine = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await open(context.userId);
    return sql<{ id: string; name: string }>`select id, name from shops where user_id = ${context.userId} order by created_at desc limit 12`;
  });

export const shopCreate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name?: string; category?: string; about?: string; cover?: string; logo?: string; whatsapp?: string; shopUrl?: string }) => ({
    name: clean(input?.name, 60),
    category: CATS.includes(clean(input?.category, 24) as (typeof CATS)[number]) ? clean(input?.category, 24) : "Other",
    about: clean(input?.about, 400),
    cover: clean(input?.cover, 140_000),
    logo: clean(input?.logo, 140_000),
    whatsapp: String(input?.whatsapp ?? "").replace(/\D/g, "").slice(0, 15),
    shopUrl: clean(input?.shopUrl, 200),
  }))
  .handler(async ({ context, data }) => {
    if (data.name.length < 2) throw new Error("BAD_NAME");
    const sql = await open(context.userId);
    await keepSweep(sql);
    const count = await sql<{ n: number }>`select count(*)::int as n from shops where user_id = ${context.userId}`;
    if ((count[0]?.n ?? 0) >= 3) throw new Error("FORBIDDEN");
    const id = nid();
    await sql`insert into shops (id, user_id, name, category, about, cover, logo, whatsapp, shop_url, expires_at) values (${id}, ${context.userId}, ${data.name}, ${data.category}, ${data.about}, ${data.cover}, ${data.logo}, ${data.whatsapp}, ${data.shopUrl}, now() + interval '90 days')`;
    return { id };
  });

export const shopOne = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => clean(id, 80))
  .handler(async ({ context, data }) => {
    const sql = await open(context.userId);
    await keepSweep(sql);
    const rows = await sql<{
      id: string; name: string; category: string; about: string; cover: string; logo: string; whatsapp: string; shop_url: string;
      username: string; display_name: string; avatar: string; verified: boolean; mine: boolean;
    }>`
      select s.id, s.name, s.category, s.about, s.cover, s.logo, s.whatsapp, s.shop_url, pr.username, pr.display_name, pr.avatar, pr.verified,
        (s.user_id = ${context.userId}) as mine
      from shops s
      join profiles pr on pr.user_id = s.user_id
      where s.id = ${data} and (s.expires_at is null or s.expires_at > now())`;
    if (!rows[0]) return null;
    const products = await sql<{ id: string; title: string; price_cents: number; currency: string; photo: string }>`
      select id, title, price_cents, currency, photo from shop_products where shop_id = ${data} order by created_at desc limit 40`;
    return { ...rows[0], products };
  });

export const productOne = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => clean(id, 80))
  .handler(async ({ context, data }) => {
    const sql = await open(context.userId);
    const rows = await sql<{
      id: string; shop_id: string; title: string; detail: string; price_cents: number; currency: string; photo: string;
      shop_name: string; username: string; display_name: string; avatar: string;
    }>`
      select p.id, p.shop_id, p.title, p.detail, p.price_cents, p.currency, p.photo,
        s.name as shop_name, pr.username, pr.display_name, pr.avatar
      from shop_products p
      join shops s on s.id = p.shop_id
      join profiles pr on pr.user_id = s.user_id
      where p.id = ${data}`;
    return rows[0] ?? null;
  });

export const productCreate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { shopId?: string; title?: string; detail?: string; price?: number; currency?: string; photo?: string }) => ({
    shopId: clean(input?.shopId, 80),
    title: clean(input?.title, 80),
    detail: clean(input?.detail, 400),
    price: cents(input?.price),
    currency: clean(input?.currency, 3).toUpperCase() === "PKR" ? "PKR" : "USD",
    photo: clean(input?.photo, 140_000),
  }))
  .handler(async ({ context, data }) => {
    if (!data.shopId || data.title.length < 2 || data.price < 1) throw new Error("BOARD_PRICE");
    const sql = await open(context.userId);
    const shop = await sql<{ n: number }>`select (select count(*)::int from shop_products where shop_id = ${data.shopId}) as n from shops where id = ${data.shopId} and user_id = ${context.userId}`;
    if (!shop.length) throw new Error("FORBIDDEN");
    if ((shop[0]?.n ?? 0) >= 5) throw new Error("SHOP_FULL");
    const id = nid();
    await sql`
      insert into shop_products (id, shop_id, user_id, title, detail, price_cents, currency, photo)
      values (${id}, ${data.shopId}, ${context.userId}, ${data.title}, ${data.detail}, ${data.price}, ${data.currency}, ${data.photo})`;
    return { id };
  });

export const shopDeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => clean(id, 80))
  .handler(async ({ context, data }) => {
    const sql = await open(context.userId);
    const product = (await sql<{ user_id: string; price_cents: number; currency: string }>`select user_id, price_cents, currency from shop_products where id = ${data}`)[0];
    if (!product || product.user_id === context.userId) throw new Error("FORBIDDEN");
    const amount = Math.max(0, Math.floor(Number(product.price_cents) / 100));
    const fee = Math.floor((amount * 15) / 100);
    await sql`
      insert into board_deals (id, post_id, buyer_id, seller_id, amount, currency, status)
      values (${nid()}, ${data}, ${context.userId}, ${product.user_id}, ${amount}, ${product.currency === "PKR" ? "PKR" : "USD"}, ${"asked"})
      on conflict (post_id, buyer_id) do nothing`;
    return { ok: true, amount, fee, currency: product.currency === "PKR" ? "PKR" : "USD" };
  });

export const productLookup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((ids: string[]) => [...new Set((ids ?? []).map((id) => clean(id, 80)).filter(Boolean))].slice(0, 20))
  .handler(async ({ context, data }) => {
    const sql = await open(context.userId);
    if (!data.length) return [];
    const rows: { id: string; title: string; price_cents: number; currency: string; photo: string; shop_name: string }[] = [];
    for (const id of data) {
      const [row] = await sql<{ id: string; title: string; price_cents: number; currency: string; photo: string; shop_name: string }>`
        select p.id, p.title, p.price_cents, p.currency, p.photo, s.name as shop_name
        from shop_products p
        join shops s on s.id = p.shop_id
        where p.id = ${id}`;
      if (row) rows.push(row);
    }
    return rows;
  });

export const orderPlace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((lines: { productId?: string; qty?: number }[]) => (lines ?? []).slice(0, 20).map((line) => ({
    productId: clean(line?.productId, 80),
    qty: Math.min(9, Math.max(1, Math.floor(Number(line?.qty) || 1))),
  })).filter((line) => line.productId))
  .handler(async ({ context, data }) => {
    if (!data.length) throw new Error("BOARD_PRICE");
    const sql = await open(context.userId);
    const ids = data.map((line) => line.productId);
    const products: { id: string; shop_id: string; title: string; price_cents: number; currency: string }[] = [];
    for (const id of ids) {
      const [row] = await sql<{ id: string; shop_id: string; title: string; price_cents: number; currency: string }>`
        select id, shop_id, title, price_cents, currency from shop_products where id = ${id}`;
      if (row) products.push(row);
    }
    if (products.length !== ids.length) throw new Error("NOT_FOUND");
    const stamp = Date.now().toString(36).toUpperCase();
    for (const line of data) {
      const product = products.find((row) => row.id === line.productId);
      if (!product) throw new Error("NOT_FOUND");
      await sql`
        insert into shop_orders (id, code, buyer_id, shop_id, product_id, title, qty, amount_cents, currency, status)
        values (${nid()}, ${"FLR" + stamp.slice(-6)}, ${context.userId}, ${product.shop_id}, ${product.id}, ${product.title}, ${line.qty}, ${product.price_cents * line.qty}, ${product.currency}, 'pending')`;
    }
    return { ok: true };
  });

export const orderMine = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await open(context.userId);
    return sql<{ id: string; code: string; title: string; qty: number; amount_cents: number; currency: string; status: string; created_at: string; shop_name: string }>`
      select o.id, o.code, o.title, o.qty, o.amount_cents, o.currency, o.status, o.created_at::text as created_at, s.name as shop_name
      from shop_orders o
      join shops s on s.id = o.shop_id
      where o.buyer_id = ${context.userId}
      order by o.created_at desc
      limit 40`;
  });

export const shopDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const me = await sql<{ is_admin: boolean }>`select is_admin from profiles where user_id = ${context.userId}`;
    if (!me[0]?.is_admin) return null;
    const [counts] = await sql<{ users: number; shops: number; listings: number; orders: number }>`
      select
        (select count(*)::int from profiles) as users,
        (select count(*)::int from shops) as shops,
        (select count(*)::int from job_posts where hidden_at is null) as listings,
        (select count(*)::int from shop_orders where status = 'pending') as orders`;
    const activity = await sql<{ kind: string; title: string; created_at: string }>`
      select * from (
        select 'Shop' as kind, name as title, created_at from shops
        union all
        select 'Gig', title, created_at from gigs
        union all
        select 'Listing', title, created_at from job_posts
        union all
        select 'Order', title, created_at from shop_orders
      ) rows
      order by created_at desc
      limit 6`;
    return { counts: counts ?? { users: 0, shops: 0, listings: 0, orders: 0 }, activity };
  });
