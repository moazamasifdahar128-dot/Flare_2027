import type { Sql } from "@/lib/db";
import { routeHint } from "@/lib/shola/pay-proof";

/**
 * Test checkout only. A 5-digit PIN or a test card does not move real money.
 * Personal Easypaisa and JazzCash have no debit API.
 * Live wallet debit needs an Easypaisa or JazzCash merchant id, password, and integrity salt.
 * Live cards need a server-only Stripe secret key. Never put that key in the app.
 */

export type CheckoutMethod = "easypaisa" | "jazzcash" | "card";

export type PayAccount = {
  method: string;
  accountNumber: string;
  title: string;
  active: boolean;
};

const CHECKOUT = new Set<string>(["easypaisa", "jazzcash", "card"]);

function longEnough(method: string, account: string) {
  const value = account.trim();
  if (!value) return false;
  if (method === "easypaisa" || method === "jazzcash") return value.replace(/\D/g, "").length >= 4 || value.length >= 4;
  if (method === "bank") return value.replace(/\s/g, "").length >= 6;
  if (method === "card") return value.length >= 4;
  if (method === "usdt") return value.length >= 8;
  return value.length >= 4;
}

const slot = globalThis as typeof globalThis & { __flarePayAccounts__?: Promise<void> };

async function applyFounderAccounts(sql: Sql) {
  await sql.query(`
    create table if not exists founder_payment_accounts (
      method text primary key,
      account_number text not null default '',
      title text not null default '',
      is_active boolean not null default false,
      updated_at timestamptz not null default now()
    )`);
  await sql.query(`alter table gig_boosts add column if not exists route_hint text not null default ''`);
  await sql.query(`alter table board_payments add column if not exists route_hint text not null default ''`);
  await sql.query(`alter table manual_orders add column if not exists route_hint text not null default ''`);
  await sql.query(`alter table verify_requests add column if not exists route_hint text not null default ''`);
  const count = await sql<{ n: number }>`select count(*)::int as n from founder_payment_accounts`;
  if (Number(count[0]?.n) > 0) return;
  await sql.query(`
    insert into founder_payment_accounts (method, account_number, title, is_active)
    select 'easypaisa', trim(payee_easypaisa), left(trim(payee_title), 80), true
    from board_settings where id = 'main' and length(trim(payee_easypaisa)) >= 4
    on conflict (method) do nothing`);
  await sql.query(`
    insert into founder_payment_accounts (method, account_number, title, is_active)
    select 'jazzcash', trim(payee_jazzcash), left(trim(payee_title), 80), true
    from board_settings where id = 'main' and length(trim(payee_jazzcash)) >= 4
    on conflict (method) do nothing`);
  await sql.query(`
    insert into founder_payment_accounts (method, account_number, title, is_active)
    select 'bank', trim(payee_bank), left(trim(payee_title), 80), true
    from board_settings where id = 'main' and length(trim(payee_bank)) >= 6
    on conflict (method) do nothing`);
  await sql.query(`
    insert into founder_payment_accounts (method, account_number, title, is_active)
    select 'card',
      case when length(trim(payee_payoneer)) >= 4 then trim(payee_payoneer) else trim(payee_wise) end,
      left(trim(payee_title), 80), true
    from board_settings
    where id = 'main' and (length(trim(payee_payoneer)) >= 4 or length(trim(payee_wise)) >= 4)
    on conflict (method) do nothing`);
}

export async function ensureFounderAccounts(sql: Sql) {
  if (!slot.__flarePayAccounts__) {
    slot.__flarePayAccounts__ = applyFounderAccounts(sql).catch((error) => {
      slot.__flarePayAccounts__ = undefined;
      throw error;
    });
  }
  await slot.__flarePayAccounts__;
}

export async function founderPayAccounts(sql: Sql): Promise<PayAccount[]> {
  await ensureFounderAccounts(sql);
  const rows = await sql<{ method: string; account_number: string; title: string; is_active: boolean }>`
    select method, account_number, title, is_active from founder_payment_accounts`;
  return rows.map((row) => ({
    method: row.method,
    accountNumber: row.account_number ?? "",
    title: row.title ?? "",
    active: Boolean(row.is_active),
  }));
}

function envMethods() {
  const out: { method: CheckoutMethod; account: string }[] = [];
  const easy = process.env.FOUNDER_EASYPAISA_NUMBER?.trim() || "";
  const jazz = process.env.FOUNDER_JAZZCASH_NUMBER?.trim() || "";
  const card = process.env.FOUNDER_PAYONEER?.trim() || process.env.FOUNDER_WISE?.trim() || "";
  const generic = process.env.FOUNDER_PAYMENT_ACCOUNT?.trim() || "";
  if (easy) out.push({ method: "easypaisa", account: easy });
  if (jazz) out.push({ method: "jazzcash", account: jazz });
  if (card) out.push({ method: "card", account: card });
  if (!out.length && generic) {
    out.push({ method: "easypaisa", account: generic });
    out.push({ method: "jazzcash", account: generic });
    out.push({ method: "card", account: generic });
  }
  return out;
}

/** Active checkout methods only. A saved bank IBAN does not open a buyer button. */
export async function checkoutDesk(sql: Sql) {
  const saved = await founderPayAccounts(sql);
  const live = saved.filter((row) => row.active && longEnough(row.method, row.accountNumber));
  const methods = live.filter((row) => CHECKOUT.has(row.method)).map((row) => row.method as CheckoutMethod);
  const hints = new Map<string, string>();
  for (const row of live) hints.set(row.method, routeHint(row.method, row.accountNumber));
  if (methods.length === 0) {
    for (const item of envMethods()) {
      if (!methods.includes(item.method)) methods.push(item.method);
      if (!hints.has(item.method)) hints.set(item.method, routeHint(item.method, item.account));
    }
  }
  methods.sort((a, b) => (a === "jazzcash" ? 1 : a === "card" ? 2 : 0) - (b === "jazzcash" ? 1 : b === "card" ? 2 : 0));
  return {
    attached: methods.length > 0,
    methods,
    line(method: string) {
      return hints.get(method) || routeHint(method, "");
    },
  };
}

export async function saveFounderAccounts(sql: Sql, input: {
  title: string;
  easypaisa: string;
  jazzcash: string;
  bank: string;
  card: string;
  easyOn: boolean | null;
  jazzOn: boolean | null;
  bankOn: boolean | null;
  cardOn: boolean | null;
}) {
  await ensureFounderAccounts(sql);
  const title = input.title.trim().slice(0, 80);
  const rows: [string, string, boolean | null][] = [
    ["easypaisa", input.easypaisa, input.easyOn],
    ["jazzcash", input.jazzcash, input.jazzOn],
    ["bank", input.bank, input.bankOn],
    ["card", input.card, input.cardOn],
  ];
  for (const [method, account, flag] of rows) {
    const number = account.trim().slice(0, 120);
    const active = longEnough(method, number) && flag !== false;
    await sql`
      insert into founder_payment_accounts (method, account_number, title, is_active, updated_at)
      values (${method}, ${number}, ${title}, ${active}, now())
      on conflict (method) do update set
        account_number = excluded.account_number,
        title = excluded.title,
        is_active = excluded.is_active,
        updated_at = now()`;
  }
}

/** True when at least one Easypaisa, JazzCash, or Visa receiving account is active. */
export async function paymentsLive(sql: Sql) {
  return (await checkoutDesk(sql)).attached;
}

/** True when this TID is already on a live receipt. Rejected proofs can be reused. */
export async function tidAlreadyUsed(sql: Sql, tid: string) {
  const key = tid.toLowerCase();
  if (!key) return false;
  const rows = await sql<{ n: number }>`
    select 1 as n from gig_boosts where lower(reference) = ${key} and status <> 'rejected'
    union all
    select 1 from board_payments where lower(reference) = ${key} and status <> 'rejected'
    union all
    select 1 from manual_orders where lower(transaction_id) = ${key} and status not in ('disputed', 'refunded')
    union all
    select 1 from verify_requests where lower(reference) = ${key} and status not in ('rejected', 'pay')
    limit 1`;
  return rows.length > 0;
}

export async function founderReviewer(sql: Sql, userId: string) {
  const me = await sql<{ is_admin: boolean; is_founder: boolean }>`select is_admin, is_founder from profiles where user_id = ${userId}`;
  return Boolean(me[0]?.is_admin || me[0]?.is_founder);
}
