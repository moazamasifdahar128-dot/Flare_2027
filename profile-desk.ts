// @ts-nocheck
type ServerCall = (input?: any) => Promise<any>;
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { contactLeak, maskContact } from "@/lib/shola/gig-text";
import { sellerSplit } from "@/lib/shola/board-rules";
import { pkrForUsd, TICK_USD } from "@/lib/shola/money";
import { noteCash, notePayOk, notePayReject, postSystem, noteDeal, noteReceipt } from "@/lib/shola/system-notes";
import { tickOpacity } from "@/lib/shola/tick";
import { assertPayProof, normalizePayMethod, orderRef } from "@/lib/shola/pay-proof";
import { tidAlreadyUsed, founderReviewer, checkoutDesk } from "@/lib/shola/pay-live";
import { GIG_CAP, REQUEST_CAP, TICK_GIG_VIEWS } from "@/lib/shola/caps";

var GOAL = TICK_GIG_VIEWS;
function nid() {
	return crypto.randomUUID();
}
function clean(value, max) {
	return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
async function open(userId) {
	const sql = await getSql();
	if ((await sql`select 1 from profiles where user_id = ${userId} and (banned_forever or (banned_until is not null and banned_until > now()))`).length) throw new Error("BANNED");
	return sql;
}
async function notify(sql, userId, kind) {
	await sql`insert into notifications (id, user_id, kind, from_id, post_id) values (${nid()}, ${userId}, ${kind}, ${""}, ${""})`;
}
export const recordListingView: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	kind: clean(input?.kind, 8) === "gig" ? "gig" : "board",
	id: clean(input?.id, 80)
})).handler(async ({ context, data }) => {
	if (!data.id) return { ok: false };
	const sql = await open(context.userId);
	const owner = data.kind === "gig" ? (await sql`
          select user_id from gigs
          where id = ${data.id} and removed_at is null and hidden = false
        `)[0]?.user_id ?? "" : (await sql`
          select user_id from job_posts
          where id = ${data.id} and hidden_at is null
        `)[0]?.user_id ?? "";
	if (!owner || owner === context.userId) return { ok: false };
	await sql`
      insert into listing_views (kind, listing_id, viewer_id, owner_id, viewed_on)
      values (${data.kind}, ${data.id}, ${context.userId}, ${owner}, current_date)
      on conflict (kind, listing_id, viewer_id, viewed_on) do nothing`;
	return { ok: true };
});
export const profileListings: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((username) => clean(username, 32).toLowerCase()).handler(async ({ context, data }) => {
	return (await (await open(context.userId))`
      select j.id, j.title, j.kind, j.price, j.currency
      from job_posts j
      join profiles pr on pr.user_id = j.user_id
      where lower(pr.username) = ${data}
        and j.hidden_at is null
       
      order by j.created_at desc
      limit 40`).map((row) => ({
		id: row.id,
		title: maskContact(row.title),
		kind: row.kind,
		price: row.price,
		currency: row.currency === "USD" ? "USD" : "PKR"
	}));
});
export const profileDesk: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((username) => clean(username, 32).toLowerCase()).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const person = await sql`
      select user_id, username, display_name, verified from profiles where lower(username) = ${data}`;
	if (!person[0]) return null;
	const isSelf = person[0].user_id === context.userId;
	const tick = person[0].verified ? "active" : "none";
	const viewCount = (await sql`select count(*)::int as n from listing_views where owner_id = ${person[0].user_id} and kind = 'gig'`)[0]?.n ?? 0;
	let boardViews = 0;
	try {
		boardViews = Number((await sql`select count(*)::int as n from listing_views where owner_id = ${person[0].user_id} and kind = 'board'`)[0]?.n) || 0;
	} catch {
		boardViews = 0;
	}
	const base = {
		username: person[0].username,
		displayName: person[0].display_name,
		verified: Boolean(person[0].verified),
		tick,
		opacity: tick === "active" ? 1 : tickOpacity(viewCount),
		daysLeft: 0,
		isSelf
	};
	const gigCount = await sql`
      select count(*)::int as n from gigs
      where user_id = ${person[0].user_id} and removed_at is null`;
	const requestCount = await sql`
      select count(*)::int as n from job_posts
      where user_id = ${person[0].user_id} and kind = 'need' and hidden_at is null`;
	let likes = 0;
	try {
		const liked = await sql`
        select count(*)::int as n
        from gig_likes l
        join gigs g on g.id = l.gig_id
        where g.user_id = ${person[0].user_id}
          and g.removed_at is null
         `;
		likes = Number(liked[0]?.n) || 0;
	} catch {
		likes = 0;
	}
	const publicCounts = {
		likes,
		activeGigs: Number(gigCount[0]?.n) || 0,
		activeRequests: Number(requestCount[0]?.n) || 0,
		gigMax: GIG_CAP,
		requestMax: REQUEST_CAP
	};
	if (!isSelf) return {
		...base,
		views: 0,
		boardViews: 0,
		goal: GOAL,
		...publicCounts,
		earnings: [],
		withdrawals: [],
		verify: "",
		canApply: false
	};
	const earned = await sql`
      select currency, amount from board_deals where seller_id = ${context.userId} and status = 'released'`;
	let taken = [];
	try {
		taken = await sql`
        select currency, amount, status, method, account_mask from board_withdrawals where user_id = ${context.userId}`;
	} catch {
		taken = (await sql`
        select currency, amount, status from board_withdrawals where user_id = ${context.userId}`).map((row) => ({
			...row,
			method: "",
			account_mask: ""
		}));
	}
	const bag = /* @__PURE__ */ new Map();
	for (const row of earned) {
		const key = row.currency === "USD" ? "USD" : "PKR";
		bag.set(key, (bag.get(key) ?? 0) + sellerSplit(row.amount).payout);
	}
	for (const row of taken) {
		if (row.status !== "requested" && row.status !== "paid") continue;
		const key = row.currency === "USD" ? "USD" : "PKR";
		bag.set(key, (bag.get(key) ?? 0) - row.amount);
	}
	const verify = (await sql`select status from verify_requests where user_id = ${context.userId}`)[0]?.status ?? "";
	return {
		...base,
		views: viewCount,
		boardViews,
		goal: GOAL,
		...publicCounts,
		earnings: [...bag.entries()].filter(([, amount]) => amount > 0).map(([currency, amount]) => ({
			currency,
			amount
		})),
		withdrawals: taken.map((row) => ({
			amount: row.amount,
			currency: row.currency === "USD" ? "USD" : "PKR",
			status: row.status === "requested" ? "pending" : row.status,
			method: row.method || "",
			account: row.account_mask || ""
		})),
		verify,
		canApply: viewCount >= GOAL && !person[0].verified && (verify === "" || verify === "rejected")
	};
});
export const listingQuota: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await open(context.userId);
	const gigs = await sql`
      select count(*)::int as n from gigs
      where user_id = ${context.userId} and removed_at is null`;
	const requests = await sql`
      select count(*)::int as n from job_posts
      where user_id = ${context.userId} and kind = 'need' and hidden_at is null`;
	const who = await sql`select username from profiles where user_id = ${context.userId}`;
	return {
		gigs: Number(gigs[0]?.n) || 0,
		gigMax: GIG_CAP,
		requests: Number(requests[0]?.n) || 0,
		requestMax: REQUEST_CAP,
		username: who[0]?.username ?? ""
	};
});
export const applyBadge: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await open(context.userId);
	if ((await sql`select verified from profiles where user_id = ${context.userId}`)[0]?.verified) throw new Error("FORBIDDEN");
	if (((await sql`select count(*)::int as n from listing_views where owner_id = ${context.userId} and kind = 'gig'`)[0]?.n ?? 0) < GOAL) throw new Error("BOARD_VIEWS");
	const existing = await sql`select status from verify_requests where user_id = ${context.userId}`;
	if (existing[0] && existing[0].status !== "rejected") throw new Error("FORBIDDEN");
	if (existing[0]) await sql`update verify_requests set status = 'pay', method = '', reference = '', updated_at = now() where user_id = ${context.userId}`;
	else await sql`insert into verify_requests (user_id, status) values (${context.userId}, 'pay')`;
	await notify(sql, context.userId, "verify_fee");
	return { ok: true };
});
export const payBadge: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	method: normalizePayMethod(input?.method),
	payer: clean(input?.payer, 60),
	pin: String(input?.pin ?? "").replace(/\D/g, "").slice(0, 5),
	last4: String(input?.last4 ?? "").replace(/\D/g, "").slice(0, 4)
})).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const desk = await checkoutDesk(sql);
	const proof = assertPayProof({
		payer: data.payer,
		method: data.method,
		pin: data.pin,
		last4: data.last4,
		pkr: pkrForUsd(TICK_USD),
		founderAccount: desk.attached ? "attached" : "",
		openMethods: desk.methods
	});
	let ref = orderRef();
	if (await tidAlreadyUsed(sql, ref)) ref = orderRef();
	const row = await sql`select status from verify_requests where user_id = ${context.userId}`;
	if (row[0]?.status !== "pay" && row[0]?.status !== "approved" && row[0]?.status !== "review") throw new Error("FORBIDDEN");
	const hint = desk.line(proof.method);
	await sql`update verify_requests set status = 'paid_wait', method = ${proof.method}, reference = ${ref}, payer_name = ${proof.payer}, route_hint = ${hint}, updated_at = now() where user_id = ${context.userId}`;
	await noteReceipt(sql, context.userId, "Blue Tick ($2.50)", `${context.userId}:${ref}`);
	return {
		ok: true,
		review: await founderReviewer(sql, context.userId)
	};
});
export const askWithdrawal: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((currency) => clean(currency, 3).toUpperCase()).handler(async ({ context, data }) => {
	if (data !== "PKR" && data !== "USD") throw new Error("BOARD_PRICE");
	const sql = await open(context.userId);
	const earned = await sql`select amount from board_deals where seller_id = ${context.userId} and status = 'released' and currency = ${data}`;
	const taken = await sql`select amount from board_withdrawals where user_id = ${context.userId} and currency = ${data} and status in ('requested', 'paid')`;
	const left = earned.reduce((sum, row) => sum + sellerSplit(row.amount).payout, 0) - taken.reduce((sum, row) => sum + row.amount, 0);
	if (left < 1) throw new Error("BOARD_PAY");
	await sql`insert into board_withdrawals (id, user_id, amount, currency) values (${nid()}, ${context.userId}, ${left}, ${data})`;
	return {
		ok: true,
		amount: left
	};
});
function accountOk(method, account) {
	const bare = account.replace(/\s+/g, "");
	if (method === "jazzcash" || method === "easypaisa") return /^03\d{9}$/.test(bare);
	if (method === "bank" || method === "transfer") return /^PK\d{2}[A-Za-z0-9]{20}$/i.test(bare) || /^\d{10,16}$/.test(bare);
	if (method === "usdt") return /^[A-Za-z0-9]{26,64}$/.test(bare);
	return bare.length >= 6 && bare.length <= 80;
}
var CASH_METHODS = [
	"bank",
	"easypaisa",
	"jazzcash",
	"payoneer",
	"wise",
	"usdt",
	"transfer"
];
export const requestCash: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	amount: Math.floor(Number(input?.amount) || 0),
	method: clean(input?.method, 16),
	title: clean(input?.title, 60),
	account: clean(input?.account, 80)
})).handler(async ({ context, data }) => {
	if (!CASH_METHODS.includes(data.method)) throw new Error("BOARD_PAY");
	if (data.amount < 1) throw new Error("CASH_LOW");
	if (data.title.length < 2 || !accountOk(data.method, data.account)) throw new Error("BOARD_PAY");
	if (contactLeak(data.title)) throw new Error("GIG_LEAK");
	const sql = await open(context.userId);
	if ((await sql`select value from app_rules where key = 'cash_open'`)[0]?.value === "off") throw new Error("REGION");
	const earned = await sql`select amount from board_deals where seller_id = ${context.userId} and status = 'released' and currency = 'USD'`;
	const taken = await sql`select amount from board_withdrawals where user_id = ${context.userId} and currency = 'USD' and status in ('requested', 'paid')`;
	const left = earned.reduce((sum, row) => sum + sellerSplit(row.amount).payout, 0) - taken.reduce((sum, row) => sum + row.amount, 0);
	if (data.amount > left) throw new Error("CASH_LOW");
	const mask = `••••${data.account.replace(/\s+/g, "").slice(-4)}`;
	await sql`
      insert into board_withdrawals (id, user_id, amount, currency, method, account_title, account_mask)
      values (${nid()}, ${context.userId}, ${data.amount}, ${"USD"}, ${data.method}, ${data.title}, ${mask})`;
	const admins = await sql`select user_id from profiles where is_admin = true`;
	for (const row of admins) await notify(sql, row.user_id, "cash_in");
	await notify(sql, context.userId, "cash_out");
	return {
		ok: true,
		amount: data.amount
	};
});
export const askHelp: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	if (typeof input === "string") return {
		subject: "Help",
		body: clean(input, 500)
	};
	return {
		subject: clean(input?.subject, 80) || "Help",
		body: clean(input?.body, 500)
	};
}).handler(async ({ context, data }) => {
	if (data.body.length < 8) throw new Error("EMPTY");
	if (contactLeak(data.body) || contactLeak(data.subject)) throw new Error("GIG_LEAK");
	const sql = await open(context.userId);
	await sql`insert into help_notes (id, user_id, body, subject) values (${nid()}, ${context.userId}, ${data.body}, ${data.subject})`;
	const admins = await sql`select user_id from profiles where is_admin = true`;
	for (const row of admins) await notify(sql, row.user_id, "help_in");
	return { ok: true };
});
export const founderHelp: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await getSql();
	const me = await sql`select is_founder, is_admin from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_founder && !me[0]?.is_admin) return [];
	return sql`
      select h.id, pr.username, pr.user_id, h.subject, h.body, h.reply, h.status, h.created_at::text as at
      from help_notes h
      join profiles pr on pr.user_id = h.user_id
      order by h.created_at desc
      limit 40`;
});
export const founderHelpReply: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: clean(input?.id, 80),
	reply: clean(input?.reply, 800),
	resolve: Boolean(input?.resolve)
})).handler(async ({ context, data }) => {
	const sql = await getSql();
	const me = await sql`select is_founder, is_admin from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_founder && !me[0]?.is_admin) throw new Error("FORBIDDEN");
	if (data.reply.length < 2) throw new Error("EMPTY");
	const row = (await sql`select user_id, subject from help_notes where id = ${data.id}`)[0];
	if (!row) throw new Error("FORBIDDEN");
	await sql`update help_notes set reply = ${data.reply}, status = 'replied' where id = ${data.id}`;
	const subject = row.subject || "Support";
	await postSystem(sql, {
		userId: row.user_id,
		kind: "help_reply",
		body: `Support Reply: ${subject}\n\nAdmin: ${data.reply}`,
		ref: `${data.id}:${nid()}`
	});
	await sql`insert into notifications (id, user_id, kind, from_id, post_id) values (${nid()}, ${row.user_id}, ${"help_reply"}, ${context.userId}, ${""})`;
	return { ok: true };
});
export const followNames: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((input) => ({
	username: clean(input?.username, 32).toLowerCase(),
	kind: "none"
})).handler(async () => {
	return {
		hidden: false,
		rows: []
	};
});
export const verifyQueue: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await getSql();
	const me = await sql`select is_admin, is_founder from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_admin && !me[0]?.is_founder) return {
		reviews: [],
		payouts: [],
		deals: []
	};
	const desk = await checkoutDesk(sql);
	const reviews = await sql`
      select v.user_id, pr.username, pr.display_name, v.status, v.method, v.reference, v.payer_name, v.screenshot_url as shot, coalesce(v.route_hint, '') as route_hint,
        (select count(*)::int from listing_views where owner_id = v.user_id and kind = 'gig') as views
      from verify_requests v
      join profiles pr on pr.user_id = v.user_id
      where v.status in ('review', 'paid_wait', 'rejected', 'done', 'approved')
      order by v.updated_at desc
      limit 40`;
	const payouts = await sql`
      select w.id, pr.username, pr.display_name, w.amount, w.currency, w.method, w.account_title, w.account_mask, w.created_at::text as at,
        coalesce(u.email, '') as email,
        coalesce((
          select p.account from payout_methods p
          where p.user_id = w.user_id and p.method = w.method
          order by p.is_default desc, p.created_at desc
          limit 1
        ), '') as account
      from board_withdrawals w
      join profiles pr on pr.user_id = w.user_id
      left join "user" u on u.id = w.user_id
      where w.status = 'requested'
      order by w.created_at`;
	const deals = await sql`
      select d.id, pr.username, d.amount, d.currency, d.reference
      from board_deals d
      join profiles pr on pr.user_id = d.seller_id
      where d.status = 'paid_wait'
      order by d.updated_at`;
	return {
		reviews: reviews.map((row) => ({
			...row,
			route_hint: row.route_hint || (row.reference ? desk.line(row.method) : "")
		})),
		payouts,
		deals
	};
});
export const verifyAct: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	action: clean(input?.action, 16),
	id: clean(input?.id, 80),
	tx: clean(input?.tx, 40)
})).handler(async ({ context, data }) => {
	const sql = await getSql();
	const me = await sql`select is_admin, is_founder from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_admin && !me[0]?.is_founder) throw new Error("FORBIDDEN");
	if (data.action === "approve") {
		await sql`update verify_requests set status = 'approved', updated_at = now() where user_id = ${data.id} and status = 'review'`;
		await notify(sql, data.id, "verify_fee");
		return { ok: true };
	}
	if (data.action === "reject") {
		if ((await sql`update verify_requests set status = 'rejected', updated_at = now() where user_id = ${data.id} and status in ('review', 'paid_wait') returning user_id`).length) {
			await notify(sql, data.id, "verify_no");
			await notePayReject(sql, data.id, `${data.id}:tick-no`);
		}
		return { ok: true };
	}
	if (data.action === "badge") {
		if (!(await sql`select 1 from verify_requests where user_id = ${data.id} and status = 'paid_wait'`).length) throw new Error("FORBIDDEN");
		await sql`update profiles set verified = true, tick_state = 'active', faded_at = null where user_id = ${data.id} and is_founder = false`;
		await sql`update verify_requests set status = 'done', updated_at = now() where user_id = ${data.id}`;
		await notify(sql, data.id, "verify_yes");
		await notePayOk(sql, data.id, "Blue Tick", `${data.id}:tick`);
		return { ok: true };
	}
	if (data.action === "release") {
		const row = (await sql`
        update board_deals set status = 'released', updated_at = now()
        where id = ${data.id} and status = 'paid_wait'
        returning post_id, buyer_id, seller_id, amount`)[0];
		if (row) await noteDeal(sql, row.seller_id, row.buyer_id, row.post_id, row.amount);
		return { ok: true };
	}
	if (data.action === "paid") {
		const row = (await sql`
        update board_withdrawals set status = 'paid'
        where id = ${data.id} and status = 'requested'
        returning id, user_id, amount, method, account_mask`)[0];
		if (row) {
			await notify(sql, row.user_id, "cash_paid");
			await noteCash(sql, row.user_id, row.amount, row.method, row.account_mask, true, row.id, data.tx);
		}
		return { ok: true };
	}
	if (data.action === "decline") {
		const row = (await sql`
        update board_withdrawals set status = 'rejected'
        where id = ${data.id} and status = 'requested'
        returning id, user_id, amount, method, account_mask`)[0];
		if (row) {
			await notify(sql, row.user_id, "cash_no");
			await noteCash(sql, row.user_id, row.amount, row.method, row.account_mask, false, row.id);
		}
		return { ok: true };
	}
	throw new Error("FORBIDDEN");
});
//#endregion
