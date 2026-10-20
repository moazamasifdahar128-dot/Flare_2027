import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

const METHODS = ["jazzcash", "easypaisa", "bank", "wise", "payoneer", "usdt"] as const;

function nid() {
  return crypto.randomUUID();
}

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function accountOk(method: string, account: string) {
  const bare = account.replace(/\s+/g, "");
  if (method === "jazzcash" || method === "easypaisa") return /^03\d{9}$/.test(bare);
  if (method === "bank") return /^PK\d{2}[A-Za-z0-9]{20}$/i.test(bare) || /^\d{10,16}$/.test(bare);
  if (method === "usdt") return /^[A-Za-z0-9]{26,64}$/.test(bare);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bare);
}

export const myPayouts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string; method: string; title: string; account: string; is_default: boolean }>`
      select id, method, title, account, is_default from payout_methods
      where user_id = ${context.userId}
      order by is_default desc, created_at desc`;
    return rows.map((row) => ({
      id: row.id,
      method: row.method,
      title: row.title,
      account: row.account,
      isDefault: Boolean(row.is_default),
    }));
  });

export const savePayout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { method?: string; title?: string; account?: string; isDefault?: boolean }) => ({
    method: clean(input?.method, 16).toLowerCase(),
    title: clean(input?.title, 60),
    account: clean(input?.account, 80),
    isDefault: Boolean(input?.isDefault),
  }))
  .handler(async ({ context, data }) => {
    if (!METHODS.includes(data.method as (typeof METHODS)[number])) throw new Error("BOARD_PAY");
    if (data.title.length < 3 || !/^[A-Za-z0-9][A-Za-z0-9 .'-]*$/.test(data.title) || !accountOk(data.method, data.account)) throw new Error("PAYOUT_BAD");
    const sql = await getSql();
    const count = await sql<{ n: number }>`select count(*)::int as n from payout_methods where user_id = ${context.userId}`;
    if ((count[0]?.n ?? 0) >= 8) throw new Error("BOARD_PAY");
    const makeDefault = data.isDefault || (count[0]?.n ?? 0) === 0;
    if (makeDefault) await sql`update payout_methods set is_default = false where user_id = ${context.userId}`;
    const id = nid();
    await sql`
      insert into payout_methods (id, user_id, method, title, account, is_default)
      values (${id}, ${context.userId}, ${data.method}, ${data.title}, ${data.account.replace(/\s+/g, "")}, ${makeDefault})`;
    return { ok: true, id };
  });

export const removePayout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => clean(id, 80))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await sql<{ is_default: boolean }>`delete from payout_methods where id = ${data} and user_id = ${context.userId} returning is_default`;
    if (row[0]?.is_default) {
      await sql`
        update payout_methods set is_default = true
        where id = (select id from payout_methods where user_id = ${context.userId} order by created_at desc limit 1)`;
    }
    return { ok: true };
  });

export const defaultPayout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => clean(id, 80))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await sql`select id from payout_methods where id = ${data} and user_id = ${context.userId}`;
    if (!row.length) throw new Error("FORBIDDEN");
    await sql`update payout_methods set is_default = false where user_id = ${context.userId}`;
    await sql`update payout_methods set is_default = true where id = ${data} and user_id = ${context.userId}`;
    return { ok: true };
  });
