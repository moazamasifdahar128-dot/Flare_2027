// @ts-nocheck
type ServerCall = (input?: any) => Promise<any>;
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { contactLeak, containsContactInfoBio, maskContact, chatLeak } from "@/lib/shola/gig-text";
import { maskWhatsapp, pkrForUsd, maskAccount, TICK_USD, UNLOCK_USD } from "@/lib/shola/money";
import { notePayOk, noteReports, noteBoostWait, notePayReject, postSystem, noteDeal, noteWhatsapp, noteBoostReject, noteModeration, noteBoost, noteReceipt } from "@/lib/shola/system-notes";
import { keepSweep, eraseGig, eraseJob } from "@/lib/shola/life";
import { assertPayProof, normalizePayMethod, tidError, orderRef, assertBoostProof } from "@/lib/shola/pay-proof";
import { tidAlreadyUsed, founderReviewer, checkoutDesk, paymentsLive } from "@/lib/shola/pay-live";
import { GIG_CAP, overActiveCap, TICK_FLOOR_VIEWS, TICK_GIG_VIEWS } from "@/lib/shola/caps";
import { shouldHideForReports, reportReason } from "@/lib/shola/time-ago";
import { publicGigCounts, canManageGig } from "@/lib/shola/sample-limit";
import { assertCountryOpen } from "@/lib/shola/geo-guard";

function nid() {
	return crypto.randomUUID();
}
function clean(value, max) {
	return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
function words(value) {
	return value.trim().split(/\s+/).filter(Boolean).length;
}
function reasonName(value) {
	const key = String(value || "").toLowerCase();
	if (key === "spam") return "Spam";
	if (key === "fake") return "Fake";
	if (key === "inappropriate") return "Inappropriate";
	if (key === "scam") return "Scam";
	if (key === "copyright") return "Copyright";
	if (key === "abusive") return "Abusive";
	if (!key || key === "other") return "Other";
	return key.charAt(0).toUpperCase() + key.slice(1);
}
function readList(raw) {
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, 3) : [];
	} catch {
		return [];
	}
}
function clipSeconds(raw) {
	for (const item of readList(raw)) {
		const match = item.match(/[?&]s=(\d{1,4})(?:&|$)/i);
		if (!match) continue;
		const n = Number(match[1]);
		if (n > 0 && n <= 30) return n;
	}
	return 0;
}
async function open(userId) {
	const sql = await getSql();
	if ((await sql`select 1 from profiles where user_id = ${userId} and (banned_forever or (banned_until is not null and banned_until > now()))`).length) throw new Error("BANNED");
	return sql;
}
var CATS = /* @__PURE__ */ new Set([
	"AI Video",
	"Editing",
	"Duet",
	"Logo",
	"Animation"
]);
var MOD_ACTIONS = [
	"hide",
	"show",
	"flag",
	"unflag",
	"remove",
	"restore"
];
async function isAdmin(sql, userId) {
	const me = await sql`select is_admin from profiles where user_id = ${userId}`;
	return Boolean(me[0]?.is_admin);
}
function mapCard(row, me) {
	const slides = readList(row.slides);
	const cover = slides.length ? slides : row.thumb ? [row.thumb] : [];
	const videos = readList(row.videos).slice(0, 2);
	const last = row.last_seen ? new Date(row.last_seen).getTime() : 0;
	const mine = row.user_id === me;
	const counts = publicGigCounts(Number(row.views) || 0, Number(row.likes) || 0, Boolean(row.hide_counts), mine);
	return {
		id: row.id,
		title: maskContact(row.title),
		priceUsd: row.price_usd,
		days: row.days || "1-3 Days",
		thumb: row.thumb,
		slides: cover,
		views: counts.views,
		likes: counts.likes,
		gigViews: counts.gigViews,
		gigLikes: counts.gigLikes,
		isHidden: counts.isHidden,
		category: CATS.has(row.category) ? row.category : "Editing",
		hideCounts: Boolean(row.hide_counts),
		createdAt: row.created_at,
		hasVideo: videos.length > 0 || Boolean(row.has_video),
		seconds: clipSeconds(row.videos),
		videos,
		username: row.username,
		displayName: row.display_name,
		avatar: row.avatar,
		verified: Boolean(row.verified),
		founder: Boolean(row.is_founder),
		online: !row.hide_online && Date.now() - last < 45e3,
		mine,
		ownerId: row.user_id,
		waOpen: Boolean(row.wa_open) && !mine,
		waListed: Boolean(row.wa_listed),
		whatsapp: !mine && row.wa_open ? row.whatsapp || "" : "",
		liked: Boolean(row.liked),
		saved: Boolean(row.saved),
		boostUntil: row.boost_until || "",
		adminHold: Boolean(row.admin_hold)
	};
}
function cardSql(where, meSlot, take = 40, skip = 0) {
	const page = take === 10 || take === 20 ? 20 : 40;
	const offset = Math.max(0, Math.min(2000, Math.floor(Number(skip) || 0)));
	return `
    select g.id, g.user_id, g.title, g.price_usd, g.days, g.thumb, ''::text as slides, g.views, g.likes,
      g.category, g.hide_counts, g.admin_hold, g.created_at::text as created_at, ''::text as videos,
      (coalesce(g.videos, '') <> '' and g.videos <> '[]') as has_video,
      g.boost_until::text as boost_until,
      exists(select 1 from manual_orders o where o.gig_id = g.id and o.buyer_id = ${meSlot} and o.deal_type = 'whatsapp_unlock' and o.status = 'released') as wa_open,
      (coalesce(g.whatsapp, '') <> '') as wa_listed,
      case when exists(select 1 from manual_orders o where o.gig_id = g.id and o.buyer_id = ${meSlot} and o.deal_type = 'whatsapp_unlock' and o.status = 'released') then coalesce(g.whatsapp, '') else '' end as whatsapp,
      pr.username, pr.display_name, pr.avatar, pr.verified, pr.is_founder, pr.hide_online, pr.last_seen::text as last_seen,
      exists(select 1 from gig_likes l where l.gig_id = g.id and l.user_id = ${meSlot}) as liked,
      exists(select 1 from gig_saves sv where sv.gig_id = g.id and sv.user_id = ${meSlot}) as saved
    from gigs g
    join profiles pr on pr.user_id = g.user_id
    where (${where})
      and g.removed_at is null
     
      and (g.hidden = false or g.user_id = ${meSlot})
      and not exists (
        select 1 from blocks b
        where (b.blocker_id = ${meSlot} and b.blocked_id = g.user_id)
           or (b.blocked_id = ${meSlot} and b.blocker_id = g.user_id)
      )
    order by (g.boost_until is not null and g.boost_until > now()) desc, g.created_at desc
    limit ${page} offset ${offset}`;
}
export const gigBoard: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((input) => {
	const raw = typeof input === "string" ? {
		q: input,
		category: "All"
	} : input ?? {};
	const category = clean(raw.category, 24);
	return {
		q: clean(raw.q, 60).toLowerCase(),
		category: category === "All" || CATS.has(category) ? category || "All" : "All",
		offset: Math.max(0, Math.min(2000, Math.floor(Number(raw.offset) || 0)))
	};
}).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const like = `%${data.q.replace(/[%_\\]/g, "")}%`;
	return (await sql.query(cardSql(`($1 = '' or lower(g.title) like $2 or lower(g.body) like $2 or lower(pr.display_name) like $2 or lower(pr.username) like $2) and ($3 = 'All' or g.category = $3)`, "$4", 20, data.offset), [
		data.q,
		like,
		data.category,
		context.userId
	])).map((row) => mapCard(row, context.userId));
});
export const gigLike: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => clean(id, 80)).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const has = await sql`select 1 from gig_likes where gig_id = ${data} and user_id = ${context.userId}`;
	if (has.length) {
		if ((await sql`delete from gig_likes where gig_id = ${data} and user_id = ${context.userId} returning gig_id`).length) await sql`update gigs set likes = greatest(0, likes - 1) where id = ${data}`;
	} else if ((await sql`select count(*)::int as n from gig_likes where user_id = ${context.userId} and liked_at > now() - interval '10 minutes'`)[0]?.n >= 30) throw new Error("LIKE_FAST");
	else if ((await sql`insert into gig_likes (gig_id, user_id, liked_at) values (${data}, ${context.userId}, now()) on conflict do nothing returning gig_id`).length) await sql`update gigs set likes = likes + 1 where id = ${data}`;
	const row = await sql`select likes, hide_counts, user_id from gigs where id = ${data}`;
	if (!row[0]) return {
		likes: null,
		gigLikes: null,
		isHidden: false,
		liked: false
	};
	const counts = publicGigCounts(0, Number(row[0].likes) || 0, Boolean(row[0].hide_counts), row[0].user_id === context.userId);
	return {
		likes: counts.likes,
		gigLikes: counts.gigLikes,
		isHidden: counts.isHidden,
		liked: !has.length
	};
});
export const gigOne: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((id) => clean(id, 80)).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	await keepSweep(sql);
	const row = (await sql`
      select g.id, g.user_id, g.title, g.body, g.price_usd, g.days, g.photos, g.videos, g.thumb, g.slides, g.views, g.likes,
        g.category, g.hide_counts, g.admin_edit, g.hidden, g.whatsapp, g.removed_at::text as removed_at, g.created_at::text as created_at, g.boost_until::text as boost_until, g.expires_at::text as expires_at,
        pr.username, pr.display_name, pr.avatar, pr.verified, pr.is_founder, pr.hide_online, pr.last_seen::text as last_seen,
        false as liked, false as saved
      from gigs g join profiles pr on pr.user_id = g.user_id
      where g.id = ${data}`)[0];
	if (!row) return null;
	const staff = await isAdmin(sql, context.userId);
	const mine = row.user_id === context.userId;
	if (row.removed_at && !staff) return null;
	if (row.hidden && !mine && !staff) return null;
	if (!mine && !staff) {
		if ((await sql`select 1 from blocks where (blocker_id = ${context.userId} and blocked_id = ${row.user_id}) or (blocker_id = ${row.user_id} and blocked_id = ${context.userId})`).length) return null;
	}
	const saved = await sql`select 1 from gig_saves where gig_id = ${data} and user_id = ${context.userId}`;
	const liked = await sql`select 1 from gig_likes where gig_id = ${data} and user_id = ${context.userId}`;
	const saveCount = await sql`select count(*)::int as n from gig_saves where gig_id = ${data}`;
	const last = row.last_seen ? new Date(row.last_seen).getTime() : 0;
	const photoList = readList(row.photos);
	const counts = publicGigCounts(Number(row.views) || 0, Number(row.likes) || 0, Boolean(row.hide_counts), mine || staff);
	const opened = mine || staff || (await sql`select 1 from manual_orders where gig_id = ${data} and buyer_id = ${context.userId} and deal_type = 'whatsapp_unlock' and status = 'released'`).length > 0;
	const clearShots = mine || staff || (await sql`select 1 from manual_orders where gig_id = ${data} and buyer_id = ${context.userId} and deal_type = 'in_app_deal' and status in ('paid', 'delivered', 'released')`).length > 0;
	return {
		id: row.id,
		title: maskContact(row.title),
		body: maskContact(row.body),
		priceUsd: row.price_usd,
		days: row.days,
		photos: [],
		photoCount: photoList.length,
		videos: readList(row.videos).slice(0, 2),
		slides: readList(row.slides),
		thumb: row.thumb,
		views: counts.views,
		likes: counts.likes,
		gigViews: counts.gigViews,
		gigLikes: counts.gigLikes,
		isHidden: counts.isHidden,
		saves: Number(saveCount[0]?.n) || 0,
		category: CATS.has(row.category) ? row.category : "Editing",
		hideCounts: Boolean(row.hide_counts),
		adminEdit: mine || staff ? row.admin_edit || "" : "",
		createdAt: row.created_at,
		expiresAt: "",
		boostUntil: row.boost_until || "",
		username: row.username,
		ownerId: row.user_id,
		displayName: row.display_name,
		avatar: row.avatar,
		verified: Boolean(row.verified),
		founder: Boolean(row.is_founder),
		online: !row.hide_online && Date.now() - last < 45e3,
		mine,
		staff,
		canEdit: canManageGig(context.userId, row.user_id, staff),
		saved: saved.length > 0,
		liked: liked.length > 0,
		whatsapp: opened ? row.whatsapp || "" : "",
		whatsappMasked: opened ? maskWhatsapp(row.whatsapp || "") : "",
		whatsappListed: String(row.whatsapp || "").replace(/\D/g, "").length >= 8,
		whatsappOpen: opened,
		clearShots
	};
});
export const gigSeen: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => clean(id, 80)).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const gig = await sql`
      select user_id, hide_counts, views from gigs where id = ${data} and removed_at is null and (hidden = false or user_id = ${context.userId})`;
	if (!gig[0] || gig[0].user_id === context.userId) return {
		views: null,
		gigViews: null,
		isHidden: Boolean(gig[0]?.hide_counts)
	};
	if ((await sql`select 1 from blocks where (blocker_id = ${context.userId} and blocked_id = ${gig[0].user_id}) or (blocker_id = ${gig[0].user_id} and blocked_id = ${context.userId})`).length) return {
		views: null,
		gigViews: null,
		isHidden: true
	};
	if ((await sql`
      insert into gig_views (gig_id, user_id, seen_at)
      values (${data}, ${context.userId}, now())
      on conflict (gig_id, user_id) do update set seen_at = now()
      where gig_views.seen_at < now() - interval '24 hours'
      returning gig_id`).length) await sql`update gigs set views = views + 1 where id = ${data}`;
	if (gig[0].hide_counts) return {
		views: null,
		gigViews: null,
		isHidden: true
	};
	const next = (await sql`select views from gigs where id = ${data}`)[0]?.views ?? gig[0].views;
	return {
		views: next,
		gigViews: next,
		isHidden: false
	};
});
function videoRef(value) {
	const match = value.match(/^\/api\/gig-media\?id=([0-9a-f-]{36})(?:&s=(\d{1,4}))?$/i);
	if (!match) return false;
	if (!match[2]) return true;
	const n = Number(match[2]);
	return n > 0 && n <= 30;
}
function draftFrom(input) {
	const category = CATS.has(String(input.category)) ? String(input.category) : "Editing";
	return {
		title: clean(input.title, 80),
		body: clean(input.body, 2000),
		priceUsd: Math.min(1e5, Math.max(1, Math.floor(Number(input.priceUsd) || 0))),
		days: clean(input.days, 40),
		photos: (input.photos ?? []).filter(Boolean).slice(0, 3),
		videos: (input.videos ?? []).filter(Boolean).slice(0, 2),
		thumb: String(input.thumb ?? ""),
		category,
		hideCounts: Boolean(input.hideCounts),
		slides: (input.slides ?? []).filter((item) => item.startsWith("data:image/") && item.length <= 2e5).slice(0, 3),
		whatsapp: String(input.whatsapp ?? "").replace(/\D/g, "").slice(0, 15)
	};
}
async function coverFor(sql, userId, data) {
	const titleWords = words(data.title);
	const bodyWords = words(data.body);
	if (!data.title.trim() || (titleWords < 3 && data.title.length < 10) || data.title.length > 80) throw new Error("GIG_TITLE");
	if (bodyWords < 20 || bodyWords > 400 || data.body.length > 2000) throw new Error("GIG_BODY");
	if (containsContactInfoBio(data.title) || containsContactInfoBio(data.body)) throw new Error("GIG_LEAK");
	if (data.whatsapp && (data.whatsapp.length < 7 || data.whatsapp.length > 15)) throw new Error("GIG_PHONE");
	if (data.photos.length < 1 || data.photos.length > 3 || data.videos.length > 2) throw new Error("GIG_MEDIA");
	if (data.photos.some((item) => !item.startsWith("data:image/") || item.length > 29e5)) throw new Error("GIG_MEDIA");
	if (data.videos.some((item) => !videoRef(item))) throw new Error("GIG_MEDIA");
	for (const item of data.videos) {
		const id = item.match(/id=([0-9a-f-]{36})/i)?.[1];
		if (!id) continue;
		if (!(await sql`select 1 from gig_blobs where id = ${id} and user_id = ${userId} and done = true`).length) throw new Error("GIG_MEDIA");
	}
	const thumb = data.thumb.startsWith("data:image/") && data.thumb.length <= 2e5 ? data.thumb : data.photos[0];
	return thumb.length <= 2e5 ? thumb : "";
}
export const saveGig: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => draftFrom(input ?? {})).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	await keepSweep(sql);
	try {
		if ((await sql`select value from app_rules where key = 'maintenance'`)[0]?.value === "on") {
			const me = await sql`select is_founder from profiles where user_id = ${context.userId}`;
			if (!me[0]?.is_founder) throw new Error("MAINTENANCE");
		}
	} catch (err) {
		if (err instanceof Error && err.message === "MAINTENANCE") throw err;
	}
	await assertCountryOpen(sql, context.userId);
	const active = await sql`
      select count(*)::int as n from gigs
      where user_id = ${context.userId} and removed_at is null`;
	if (overActiveCap(active[0]?.n ?? 0, GIG_CAP)) throw new Error("LIMIT_REACHED");
	const cover = await coverFor(sql, context.userId, data);
	const id = nid();
	await sql`
      insert into gigs (id, user_id, title, body, price_usd, days, thumb, photos, videos, category, hide_counts, slides, whatsapp)
      values (${id}, ${context.userId}, ${data.title}, ${data.body}, ${data.priceUsd}, ${data.days || "1-3 Days"}, ${cover}, ${JSON.stringify(data.photos)}, ${JSON.stringify(data.videos)}, ${data.category}, ${data.hideCounts}, ${JSON.stringify(data.slides)}, ${data.whatsapp})`;
	return { id };
});
function photoPlanFrom(input) {
	if (!Array.isArray(input)) return [];
	return input.slice(0, 3).map((item) => {
		const row = item && typeof item === "object" ? item : {};
		const keep = Number(row.keep);
		if (Number.isInteger(keep) && keep >= 0 && keep < 3 && typeof row.full !== "string") return { keep };
		return {
			full: typeof row.full === "string" ? row.full : "",
			thumb: typeof row.thumb === "string" ? row.thumb : ""
		};
	});
}
export const updateGig: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: clean(input?.id, 80),
	...draftFrom(input ?? {}),
	photoPlan: photoPlanFrom(input?.photoPlan)
})).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const mine = await sql`select user_id from gigs where id = ${data.id}`;
	if (!mine[0]) throw new Error("FORBIDDEN");
	const staff = await isAdmin(sql, context.userId);
	if (!canManageGig(context.userId, mine[0].user_id, staff)) throw new Error("FORBIDDEN");
	let next = {
		title: data.title,
		body: data.body,
		priceUsd: data.priceUsd,
		days: data.days,
		photos: data.photos,
		videos: data.videos,
		thumb: data.thumb,
		category: data.category,
		hideCounts: data.hideCounts,
		slides: data.slides,
		whatsapp: data.whatsapp
	};
	if (data.photoPlan.length) {
		const existing = await sql`select photos, slides, thumb from gigs where id = ${data.id}`;
		const photos = readList(existing[0]?.photos || "[]");
		const slides = readList(existing[0]?.slides || "[]");
		const builtPhotos = [];
		const builtSlides = [];
		for (const step of data.photoPlan) if (typeof step.keep === "number") {
			const photo = photos[step.keep];
			if (!photo) continue;
			builtPhotos.push(photo);
			const slide = slides[step.keep] || "";
			builtSlides.push(slide.startsWith("data:image/") ? slide : "");
		} else if (step.full) {
			builtPhotos.push(step.full);
			builtSlides.push(step.thumb && step.thumb.startsWith("data:image/") ? step.thumb : "");
		}
		next = {
			...next,
			photos: builtPhotos,
			slides: builtSlides,
			thumb: builtSlides.find((item) => item.startsWith("data:image/")) || existing[0]?.thumb || data.thumb
		};
	}
	const cover = await coverFor(sql, mine[0].user_id, next);
	await sql`
      update gigs
      set title = ${next.title}, body = ${next.body}, price_usd = ${next.priceUsd}, days = ${next.days || "1-3 Days"},
        thumb = ${cover}, photos = ${JSON.stringify(next.photos)}, videos = ${JSON.stringify(next.videos)},
        category = ${next.category}, hide_counts = ${next.hideCounts}, slides = ${JSON.stringify(next.slides)}, whatsapp = ${data.whatsapp}
      where id = ${data.id}`;
	if (staff && mine[0].user_id !== context.userId) {
		const note = `Edited by Admin at ${(/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19)} UTC`;
		await sql`update gigs set admin_edit = ${note} where id = ${data.id}`;
		await sql`insert into gig_audit (id, gig_id, actor_id, action, note) values (${nid()}, ${data.id}, ${context.userId}, ${"edit"}, ${note})`;
	}
	return { id: data.id };
});
export const gigSave: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => clean(id, 80)).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const has = await sql`select 1 from gig_saves where gig_id = ${data} and user_id = ${context.userId}`;
	if (has.length) await sql`delete from gig_saves where gig_id = ${data} and user_id = ${context.userId}`;
	else await sql`insert into gig_saves (gig_id, user_id) values (${data}, ${context.userId}) on conflict do nothing`;
	const count = await sql`select count(*)::int as n from gig_saves where gig_id = ${data}`;
	return {
		saved: !has.length,
		saves: Number(count[0]?.n) || 0
	};
});
export const gigBuy: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => clean(id, 80)).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const gig = (await sql`select user_id, price_usd from gigs where id = ${data} and removed_at is null`)[0];
	if (!gig || gig.user_id === context.userId) throw new Error("FORBIDDEN");
	const amount = Math.max(0, Math.floor(Number(gig.price_usd) || 0));
	const fee = Math.floor(amount * 15 / 100);
	await sql`
      insert into board_deals (id, post_id, buyer_id, seller_id, amount, currency, status)
      values (${nid()}, ${data}, ${context.userId}, ${gig.user_id}, ${amount}, ${"USD"}, ${"asked"})
      on conflict (post_id, buyer_id) do nothing`;
	await sql`
      insert into manual_orders (id, gig_id, buyer_id, seller_id, deal_type, payment_method, transaction_id, amount_pkr, amount_usd_cents, status)
      values (${nid()}, ${data}, ${context.userId}, ${gig.user_id}, ${"in_app_deal"}, ${""}, ${""}, ${pkrForUsd(amount)}, ${amount * 100}, ${"pending"})`;
	return {
		ok: true,
		amount,
		fee,
		payout: amount - fee
	};
});
export const gigDealReceipt: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: clean(input?.id, 80),
	reference: clean(input?.reference, 40)
})).handler(async ({ context, data }) => {
	if (data.reference.length < 4) throw new Error("BOARD_PAY");
	const sql = await open(context.userId);
	if (!await paymentsLive(sql)) throw new Error("BOOST_OFF");
	const row = await sql`update board_deals set status = 'paid_wait', reference = ${data.reference}, updated_at = now() where post_id = ${data.id} and buyer_id = ${context.userId} and status = 'asked' returning id`;
	await sql`update manual_orders set status = 'paid', transaction_id = ${maskAccount("bank", data.reference)} where gig_id = ${data.id} and buyer_id = ${context.userId} and deal_type = 'in_app_deal' and status = 'pending'`;
	if (!row.length) throw new Error("FORBIDDEN");
	return { ok: true };
});
export const requestGigBoost: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: clean(input?.id, 80),
	kind: input?.kind === "week" ? "week" : input?.kind === "month" ? "month" : "day",
	method: normalizePayMethod(input?.method),
	payer: clean(input?.payer, 60),
	pin: String(input?.pin ?? "").replace(/\D/g, "").slice(0, 5),
	last4: String(input?.last4 ?? "").replace(/\D/g, "").slice(0, 4)
})).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const desk = await checkoutDesk(sql);
	const proof = assertBoostProof({
		payer: data.payer,
		method: data.method,
		pin: data.pin,
		last4: data.last4,
		kind: data.kind,
		founderAccount: desk.attached ? "attached" : "",
		openMethods: desk.methods
	});
	let ref = orderRef();
	if (await tidAlreadyUsed(sql, ref)) ref = orderRef();
	const mine = await sql`select title from gigs where id = ${data.id} and user_id = ${context.userId} and removed_at is null`;
	if (!mine[0]) throw new Error("FORBIDDEN");
	const hint = desk.line(proof.method);
	await sql`
      insert into gig_boosts (id, gig_id, user_id, kind, method, reference, amount_label, payer_name, listing_title, status, route_hint)
      values (${nid()}, ${data.id}, ${context.userId}, ${proof.kind}, ${proof.method}, ${ref}, ${proof.amount}, ${proof.payer}, ${mine[0].title}, ${"paid"}, ${hint})`;
	await sql`
      insert into manual_orders (id, gig_id, buyer_id, seller_id, deal_type, payment_method, transaction_id, amount_pkr, amount_usd_cents, status, payer_name, route_hint)
      values (${nid()}, ${data.id}, ${context.userId}, ${context.userId}, ${"boost"}, ${proof.method}, ${ref}, ${proof.pkr}, ${Math.round(proof.usd * 100)}, ${"paid"}, ${proof.payer}, ${hint})`;
	await noteBoostWait(sql, context.userId, data.id, mine[0].title, proof.kind);
	return {
		ok: true,
		amount: proof.amount,
		review: await founderReviewer(sql, context.userId)
	};
});
export const boostPayGate: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await open(context.userId);
	const desk = await checkoutDesk(sql);
	return {
		attached: desk.attached,
		methods: desk.methods
	};
});
export const payTestProbe: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	tid: String(input?.tid ?? "").replace(/\s+/g, "").trim().slice(0, 15),
	scene: clean(input?.scene, 24)
})).handler(async ({ context, data }) => {
	const sql = await getSql();
	const me = await sql`select is_admin, is_founder from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_admin && !me[0]?.is_founder) throw new Error("FORBIDDEN");
	if ((await sql`select value from app_rules where key = 'pay_test'`)[0]?.value !== "on") throw new Error("FORBIDDEN");
	if (data.scene === "failed" || data.scene === "network") return {
		phase: "failed",
		note: "Simulated failed payment. Nothing was charged and nothing was marked paid."
	};
	if (data.scene === "reopen") return {
		phase: "pending",
		note: "Closing the app does not pay a receipt. It stays pending until you approve it in Requests."
	};
	if (data.scene === "invalid" || tidError(data.tid || "x")) return {
		phase: "invalid",
		note: "Please enter a valid Transaction ID and upload your receipt screenshot."
	};
	if (data.scene === "duplicate") return {
		phase: "failed",
		note: "This Transaction ID was already used. No order was created."
	};
	if (data.scene === "success" || data.scene === "pending") return {
		phase: "pending",
		note: "Test only. A real receipt would stay pending for your approval. Nothing was marked paid."
	};
	if (data.tid && await tidAlreadyUsed(sql, data.tid)) return {
		phase: "failed",
		note: "This Transaction ID was already used. No order was created."
	};
	return {
		phase: "pending",
		note: "Test only. A real receipt would stay pending for your approval. Nothing was marked paid."
	};
});
export const founderReceiving: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await getSql();
	const me = await sql`select is_admin, is_founder from profiles where user_id = ${context.userId}`;
	const founder = Boolean(me[0]?.is_admin || me[0]?.is_founder);
	const attached = await paymentsLive(sql);
	if (!founder) return {
		attached,
		account: "",
		easypaisa: "",
		jazzcash: "",
		bank: "",
		wise: "",
		payoneer: ""
	};
	return {
		attached,
		account: process.env.FOUNDER_PAYMENT_ACCOUNT?.trim() ?? "",
		easypaisa: process.env.FOUNDER_EASYPAISA_NUMBER?.trim() ?? "",
		jazzcash: process.env.FOUNDER_JAZZCASH_NUMBER?.trim() ?? "",
		bank: process.env.FOUNDER_BANK_ACCOUNT?.trim() ?? "",
		wise: process.env.FOUNDER_WISE?.trim() ?? "",
		payoneer: process.env.FOUNDER_PAYONEER?.trim() ?? ""
	};
});
export const gigBoostQueue: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await getSql();
	const me = await sql`select is_admin, is_founder from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_admin && !me[0]?.is_founder) return [];
	return sql`
      select b.id, b.gig_id, pr.username, b.kind, b.method, b.reference, b.amount_label
      from gig_boosts b
      join profiles pr on pr.user_id = b.user_id
      where b.status = 'pending'
      order by b.created_at`;
});
export const gigBoostAct: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => clean(input?.id, 80)).handler(async ({ context, data }) => {
	const sql = await getSql();
	const me = await sql`select is_admin, is_founder from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_admin && !me[0]?.is_founder) throw new Error("FORBIDDEN");
	const row = (await sql`select gig_id, kind from gig_boosts where id = ${data} and status in ('pending', 'paid')`)[0];
	if (!row) throw new Error("FORBIDDEN");
	const owner = (await sql`select user_id, title from gigs where id = ${row.gig_id}`)[0];
	if (row.kind === "month") await sql`update gigs set boost_until = greatest(coalesce(boost_until, now()), now()) + interval '30 days' where id = ${row.gig_id}`;
	else if (row.kind === "week") await sql`update gigs set boost_until = greatest(coalesce(boost_until, now()), now()) + interval '7 days' where id = ${row.gig_id}`;
	else await sql`update gigs set boost_until = greatest(coalesce(boost_until, now()), now()) + interval '1 day' where id = ${row.gig_id}`;
	await sql`update gig_boosts set status = 'approved' where id = ${data}`;
	await sql`update manual_orders set status = 'released' where gig_id = ${row.gig_id} and deal_type = 'boost' and status in ('pending', 'paid')`;
	if (owner) await noteBoost(sql, owner.user_id, row.gig_id, owner.title, row.kind);
	return { ok: true };
});
export const gigBoostReject: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => clean(input?.id, 80)).handler(async ({ context, data }) => {
	const sql = await getSql();
	const me = await sql`select is_admin, is_founder from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_admin && !me[0]?.is_founder) throw new Error("FORBIDDEN");
	const row = (await sql`select gig_id from gig_boosts where id = ${data} and status in ('pending', 'paid')`)[0];
	if (!row) throw new Error("FORBIDDEN");
	const owner = (await sql`select user_id, title from gigs where id = ${row.gig_id}`)[0];
	await sql`update gig_boosts set status = 'rejected' where id = ${data}`;
	await sql`update manual_orders set status = 'disputed' where gig_id = ${row.gig_id} and deal_type = 'boost' and status in ('pending', 'paid')`;
	if (owner) await noteBoostReject(sql, owner.user_id, row.gig_id, owner.title);
	return { ok: true };
});
function laneOf(status) {
	const key = String(status || "");
	if (["rejected", "disputed", "refunded", "no"].includes(key)) return "rejected";
	if (["approved", "released", "done", "yes"].includes(key)) return "approved";
	return "pending";
}
function boostSpan(kind) {
	const key = String(kind || "");
	if (key.includes("month")) return { short: "30 days", long: "30 days", usd: 20 };
	if (key.includes("week")) return { short: "7 days", long: "7 days", usd: 6 };
	return { short: "24h", long: "24 hours", usd: 2 };
}
function moneyLine(usd) {
	const shown = Number.isInteger(usd) ? String(usd) : usd.toFixed(2);
	return `$${shown} / ${pkrForUsd(usd)} PKR`;
}
function shotOf(value) {
	const text = String(value || "");
	if (text.length < 16 || text.length > 180000) return "";
	if (text.startsWith("data:image/") || text.startsWith("https://") || text.startsWith("http://")) return text;
	return "";
}
async function requestRows(sql, withNote, plain) {
	try { return await withNote; }
	catch { return await plain; }
}
export const requestDesk: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await getSql();
	const me = await sql`select is_founder, is_admin from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_founder && !me[0]?.is_admin) return [];
	const boosts = await requestRows(sql,
		sql`
      select b.id, b.user_id, pr.username, pr.display_name, pr.avatar, b.kind, b.method, b.reference, b.status,
        b.created_at::text as at, coalesce(nullif(b.listing_title, ''), g.title, '') as title,
        coalesce(b.payer_name, '') as payer, coalesce(b.screenshot_url, '') as shot, coalesce(b.reject_note, '') as note
      from gig_boosts b
      join profiles pr on pr.user_id = b.user_id
      left join gigs g on g.id = b.gig_id
      order by b.created_at desc limit 40`,
		sql`
      select b.id, b.user_id, pr.username, pr.display_name, pr.avatar, b.kind, b.method, b.reference, b.status,
        b.created_at::text as at, coalesce(nullif(b.listing_title, ''), g.title, '') as title,
        coalesce(b.payer_name, '') as payer, coalesce(b.screenshot_url, '') as shot, '' as note
      from gig_boosts b
      join profiles pr on pr.user_id = b.user_id
      left join gigs g on g.id = b.gig_id
      order by b.created_at desc limit 40`);
	const boards = await requestRows(sql,
		sql`
      select p.id, p.user_id, pr.username, pr.display_name, pr.avatar, p.kind, p.method, p.reference, p.status,
        p.created_at::text as at, coalesce(j.title, '') as title, coalesce(p.payer_name, '') as payer,
        coalesce(p.screenshot_url, '') as shot, coalesce(p.reject_note, '') as note
      from board_payments p
      join profiles pr on pr.user_id = p.user_id
      left join job_posts j on j.id = p.post_id
      where p.kind like 'boost%'
      order by p.created_at desc limit 40`,
		sql`
      select p.id, p.user_id, pr.username, pr.display_name, pr.avatar, p.kind, p.method, p.reference, p.status,
        p.created_at::text as at, coalesce(j.title, '') as title, coalesce(p.payer_name, '') as payer,
        coalesce(p.screenshot_url, '') as shot, '' as note
      from board_payments p
      join profiles pr on pr.user_id = p.user_id
      left join job_posts j on j.id = p.post_id
      where p.kind like 'boost%'
      order by p.created_at desc limit 40`);
	const unlocks = await requestRows(sql,
		sql`
      select o.id, o.buyer_id as user_id, pr.username, pr.display_name, pr.avatar, o.payment_method as method,
        o.transaction_id as reference, o.status, o.created_at::text as at, coalesce(g.title, '') as title,
        coalesce(o.payer_name, '') as payer, coalesce(o.screenshot_url, '') as shot, coalesce(o.reject_note, '') as note
      from manual_orders o
      join profiles pr on pr.user_id = o.buyer_id
      left join gigs g on g.id = o.gig_id
      where o.deal_type = 'whatsapp_unlock'
      order by o.created_at desc limit 40`,
		sql`
      select o.id, o.buyer_id as user_id, pr.username, pr.display_name, pr.avatar, o.payment_method as method,
        o.transaction_id as reference, o.status, o.created_at::text as at, coalesce(g.title, '') as title,
        coalesce(o.payer_name, '') as payer, coalesce(o.screenshot_url, '') as shot, '' as note
      from manual_orders o
      join profiles pr on pr.user_id = o.buyer_id
      left join gigs g on g.id = o.gig_id
      where o.deal_type = 'whatsapp_unlock'
      order by o.created_at desc limit 40`);
	const ticks = await requestRows(sql,
		sql`
      select v.user_id as id, v.user_id, pr.username, pr.display_name, pr.avatar, v.method, v.reference, v.status,
        v.updated_at::text as at, coalesce(v.payer_name, '') as payer, coalesce(v.screenshot_url, '') as shot, coalesce(v.reject_note, '') as note,
        (select count(*)::int from gigs g where g.user_id = v.user_id and g.removed_at is null) as gigs,
        (select count(*)::int from listing_views lv where lv.owner_id = v.user_id and lv.kind = 'gig') as views,
        (select coalesce(sum(g.likes), 0)::int from gigs g where g.user_id = v.user_id and g.removed_at is null) as likes
      from verify_requests v
      join profiles pr on pr.user_id = v.user_id
      where v.status in ('paid_wait', 'review', 'approved', 'done', 'rejected', 'yes', 'no')
      order by v.updated_at desc limit 40`,
		sql`
      select v.user_id as id, v.user_id, pr.username, pr.display_name, pr.avatar, v.method, v.reference, v.status,
        v.updated_at::text as at, coalesce(v.payer_name, '') as payer, coalesce(v.screenshot_url, '') as shot, '' as note,
        (select count(*)::int from gigs g where g.user_id = v.user_id and g.removed_at is null) as gigs,
        (select count(*)::int from listing_views lv where lv.owner_id = v.user_id and lv.kind = 'gig') as views,
        (select coalesce(sum(g.likes), 0)::int from gigs g where g.user_id = v.user_id and g.removed_at is null) as likes
      from verify_requests v
      join profiles pr on pr.user_id = v.user_id
      where v.status in ('paid_wait', 'review', 'approved', 'done', 'rejected', 'yes', 'no')
      order by v.updated_at desc limit 40`);
	function person(row) {
		const avatar = String(row.avatar || "");
		return {
			userId: row.user_id || "",
			username: row.username || "",
			name: row.display_name || row.username || "User",
			avatar: avatar.startsWith("data:image/") && avatar.length < 180000 ? avatar : "",
			method: row.method || "",
			reference: row.reference || "",
			at: row.at || "",
			payer: row.payer || "",
			shot: shotOf(row.shot),
			note: row.note || "",
			lane: laneOf(row.status)
		};
	}
	return [
		...boosts.map((row) => {
			const span = boostSpan(row.kind);
			return { ...person(row), id: row.id, box: "boost", title: row.title || "Listing", badge: span.short === "24h" ? "Gig Boost 24h" : span.short === "7 days" ? "Gig Boost 7 days" : "Gig Boost 30 days", amount: moneyLine(span.usd), kind: row.kind, gigs: 0, views: 0, likes: 0, eligible: false };
		}),
		...boards.map((row) => {
			const span = boostSpan(row.kind);
			return { ...person(row), id: row.id, box: "board", title: row.title || "Listing", badge: "Board Boost", amount: moneyLine(span.usd), kind: row.kind, gigs: 0, views: 0, likes: 0, eligible: false };
		}),
		...unlocks.map((row) => ({ ...person(row), id: row.id, box: "whatsapp", title: row.title || "Listing", badge: "WhatsApp Unlock", amount: moneyLine(UNLOCK_USD), kind: "unlock", gigs: 0, views: 0, likes: 0, eligible: false })),
		...ticks.map((row) => {
			const views = Number(row.views) || 0;
			return { ...person(row), id: row.id, box: "tick", title: "Blue Tick", badge: "Blue Tick Application", amount: moneyLine(TICK_USD), kind: "tick", gigs: Number(row.gigs) || 0, views, likes: Number(row.likes) || 0, eligible: views >= TICK_GIG_VIEWS, lane: row.status === "approved" || row.status === "review" || row.status === "paid_wait" ? "pending" : person(row).lane };
		})
	];
});
export const requestAct: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: clean(input?.id, 80),
	box: clean(input?.box, 16),
	action: clean(input?.action, 16),
	reason: clean(input?.reason, 180)
})).handler(async ({ context, data }) => {
	const sql = await getSql();
	const me = await sql`select is_founder, is_admin from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_founder && !me[0]?.is_admin) throw new Error("FORBIDDEN");
	const reason = data.reason || "Invalid payment receipt";
	async function tell(userId, body, kind) {
		if (!userId) return;
		await postSystem(sql, { userId, kind, body, ref: `${data.id}:${kind}:${nid()}`, appeal: false });
		await sql`insert into notifications (id, user_id, kind, from_id, post_id) values (${nid()}, ${userId}, ${kind}, ${context.userId}, ${data.id})`;
	}
	async function note(query) {
		try { await query; } catch { /* note column */ }
	}
	if (data.box === "boost") {
		const row = (await sql`select gig_id, kind, user_id, status from gig_boosts where id = ${data.id}`)[0];
		if (!row) throw new Error("FORBIDDEN");
		const owner = (await sql`select user_id, title from gigs where id = ${row.gig_id}`)[0];
		const title = owner?.title || "your listing";
		const span = boostSpan(row.kind);
		if (data.action === "approve") {
			if (!["pending", "paid"].includes(row.status)) throw new Error("FORBIDDEN");
			if (span.usd === 20) await sql`update gigs set boost_until = greatest(coalesce(boost_until, now()), now()) + interval '30 days' where id = ${row.gig_id}`;
			else if (span.usd === 6) await sql`update gigs set boost_until = greatest(coalesce(boost_until, now()), now()) + interval '7 days' where id = ${row.gig_id}`;
			else await sql`update gigs set boost_until = greatest(coalesce(boost_until, now()), now()) + interval '1 day' where id = ${row.gig_id}`;
			await sql`update gig_boosts set status = 'approved' where id = ${data.id}`;
			await sql`update manual_orders set status = 'released' where gig_id = ${row.gig_id} and deal_type = 'boost' and status in ('pending', 'paid')`;
			await tell(row.user_id, `Boost Activated 🚀\n\nYour Gig Boost (${span.short}) is now active! Your listing '${title}' will get higher visibility for ${span.long}. Amount: ${moneyLine(span.usd)} verified.`, "boost_ok");
		} else if (data.action === "reject") {
			if (!["pending", "paid"].includes(row.status)) throw new Error("FORBIDDEN");
			await sql`update gig_boosts set status = 'rejected' where id = ${data.id}`;
			await note(sql`update gig_boosts set reject_note = ${reason} where id = ${data.id}`);
			await sql`update manual_orders set status = 'disputed' where gig_id = ${row.gig_id} and deal_type = 'boost' and status in ('pending', 'paid')`;
			await tell(row.user_id, `Request Rejected\n\nYour Boost request was rejected. Reason: ${reason}. Please upload valid payment proof with correct TxID and try again. Contact support@flare.app if issue.`, "boost_no");
		} else if (data.action === "restore") {
			if (row.status !== "rejected") throw new Error("FORBIDDEN");
			await sql`update gig_boosts set status = 'paid' where id = ${data.id}`;
			await note(sql`update gig_boosts set reject_note = '' where id = ${data.id}`);
		} else throw new Error("FORBIDDEN");
		return { ok: true };
	}
	if (data.box === "board") {
		const row = (await sql`select post_id, kind, user_id, status from board_payments where id = ${data.id}`)[0];
		if (!row || !String(row.kind).startsWith("boost")) throw new Error("FORBIDDEN");
		const job = (await sql`select title from job_posts where id = ${row.post_id}`)[0];
		const title = job?.title || "your listing";
		const span = boostSpan(row.kind);
		if (data.action === "approve") {
			if (!["pending", "paid"].includes(row.status)) throw new Error("FORBIDDEN");
			if (span.usd === 20) await sql`update job_posts set boost_rank = now(), boost_until = greatest(coalesce(boost_until, now()), now()) + interval '30 days' where id = ${row.post_id}`;
			else if (span.usd === 6) await sql`update job_posts set boost_rank = now(), boost_until = greatest(coalesce(boost_until, now()), now()) + interval '7 days' where id = ${row.post_id}`;
			else await sql`update job_posts set boost_rank = now(), boost_until = greatest(coalesce(boost_until, now()), now()) + interval '1 day' where id = ${row.post_id}`;
			await sql`update board_payments set status = 'approved' where id = ${data.id}`;
			await tell(row.user_id, `Boost Activated 🚀\n\nYour Board Boost (${span.short}) is now active! Your listing '${title}' will get higher visibility for ${span.long}. Amount: ${moneyLine(span.usd)} verified.`, "boost_ok");
		} else if (data.action === "reject") {
			if (!["pending", "paid"].includes(row.status)) throw new Error("FORBIDDEN");
			await sql`update board_payments set status = 'rejected' where id = ${data.id}`;
			await note(sql`update board_payments set reject_note = ${reason} where id = ${data.id}`);
			await tell(row.user_id, `Request Rejected\n\nYour Boost request was rejected. Reason: ${reason}. Please upload valid payment proof with correct TxID and try again. Contact support@flare.app if issue.`, "boost_no");
		} else if (data.action === "restore") {
			if (row.status !== "rejected") throw new Error("FORBIDDEN");
			await sql`update board_payments set status = 'paid' where id = ${data.id}`;
			await note(sql`update board_payments set reject_note = '' where id = ${data.id}`);
		} else throw new Error("FORBIDDEN");
		return { ok: true };
	}
	if (data.box === "whatsapp") {
		const row = (await sql`select gig_id, buyer_id, seller_id, status from manual_orders where id = ${data.id} and deal_type = 'whatsapp_unlock'`)[0];
		if (!row) throw new Error("FORBIDDEN");
		const gig = (await sql`select title, whatsapp from gigs where id = ${row.gig_id}`)[0];
		const seller = (await sql`select username from profiles where user_id = ${row.seller_id}`)[0];
		const buyer = (await sql`select username from profiles where user_id = ${row.buyer_id}`)[0];
		if (data.action === "approve") {
			if (!["pending", "paid"].includes(row.status)) throw new Error("FORBIDDEN");
			await sql`update manual_orders set status = 'released' where id = ${data.id}`;
			const digits = String(gig?.whatsapp || "").replace(/\D/g, "");
			await tell(row.buyer_id, `✅ WhatsApp Unlocked for ${gig?.title || "this gig"}\n\nNumber: ${digits || "the number on the gig"}. Tap to chat on WhatsApp.`, "wa_open");
			await tell(row.seller_id, `Your WhatsApp was unlocked by @${buyer?.username || "a buyer"}.`, "wa_seller");
		} else if (data.action === "reject") {
			if (!["pending", "paid"].includes(row.status)) throw new Error("FORBIDDEN");
			await sql`update manual_orders set status = 'disputed' where id = ${data.id}`;
			await note(sql`update manual_orders set reject_note = ${reason} where id = ${data.id}`);
			await tell(row.buyer_id, `Request Rejected\n\nYour WhatsApp Unlock request was rejected. Reason: ${reason}. Please upload valid payment proof with correct TxID and try again. Contact support@flare.app if issue.`, "pay_no");
		} else if (data.action === "restore") {
			if (row.status !== "disputed") throw new Error("FORBIDDEN");
			await sql`update manual_orders set status = 'paid' where id = ${data.id}`;
			await note(sql`update manual_orders set reject_note = '' where id = ${data.id}`);
		} else throw new Error("FORBIDDEN");
		return { ok: true };
	}
	if (data.box === "tick") {
		const row = (await sql`select status from verify_requests where user_id = ${data.id}`)[0];
		if (!row) throw new Error("FORBIDDEN");
		if (data.action === "approve") {
			if (["done", "yes"].includes(row.status)) throw new Error("FORBIDDEN");
			await sql`update profiles set verified = true, tick_state = 'active', faded_at = null where user_id = ${data.id} and is_founder = false`;
			await sql`update verify_requests set status = 'done', updated_at = now() where user_id = ${data.id}`;
			await tell(data.id, "Blue Tick Approved! ✅\n\nYour Blue Tick request was approved! Verified badge added to your profile and gigs. Keep posting quality gigs.", "tick_yes");
		} else if (data.action === "reject") {
			if (["rejected", "no", "done", "yes"].includes(row.status)) throw new Error("FORBIDDEN");
			await sql`update verify_requests set status = 'rejected', updated_at = now() where user_id = ${data.id}`;
			await note(sql`update verify_requests set reject_note = ${reason} where user_id = ${data.id}`);
			await tell(data.id, `Request Rejected\n\nYour Blue Tick request was rejected. Reason: ${reason}. Please upload valid payment proof with correct TxID and try again. Contact support@flare.app if issue.`, "tick_no");
		} else if (data.action === "restore") {
			if (!["rejected", "no"].includes(row.status)) throw new Error("FORBIDDEN");
			await sql`update verify_requests set status = 'paid_wait', updated_at = now() where user_id = ${data.id}`;
			await note(sql`update verify_requests set reject_note = '' where user_id = ${data.id}`);
		} else throw new Error("FORBIDDEN");
		return { ok: true };
	}
	throw new Error("FORBIDDEN");
});
export const askWhatsapp: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: clean(input?.id, 80),
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
		pkr: pkrForUsd(UNLOCK_USD),
		founderAccount: desk.attached ? "attached" : "",
		openMethods: desk.methods
	});
	let ref = orderRef();
	if (await tidAlreadyUsed(sql, ref)) ref = orderRef();
	const gig = (await sql`select user_id from gigs where id = ${data.id} and removed_at is null`)[0];
	if (!gig || gig.user_id === context.userId) throw new Error("FORBIDDEN");
	const orderId = nid();
	const hint = desk.line(proof.method);
	await sql`
      insert into manual_orders (id, gig_id, buyer_id, seller_id, deal_type, payment_method, transaction_id, amount_pkr, amount_usd_cents, status, payer_name, route_hint)
      values (${orderId}, ${data.id}, ${context.userId}, ${gig.user_id}, ${"whatsapp_unlock"}, ${proof.method}, ${ref}, ${pkrForUsd(UNLOCK_USD)}, ${Math.round(UNLOCK_USD * 100)}, ${"paid"}, ${proof.payer}, ${hint})`;
	await noteReceipt(sql, context.userId, "WhatsApp Unlock ($3)", orderId);
	return {
		ok: true,
		review: await founderReviewer(sql, context.userId)
	};
});
export const manualQueue: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await getSql();
	const me = await sql`select is_admin, is_founder from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_admin && !me[0]?.is_founder) return [];
	return sql`
      select o.id, o.gig_id, o.deal_type, o.payment_method, o.transaction_id, o.amount_pkr, o.amount_usd_cents, o.status, pr.username
      from manual_orders o
      join profiles pr on pr.user_id = o.buyer_id
      where o.status in ('pending', 'paid', 'delivered') and o.deal_type <> 'boost'
      order by o.created_at
      limit 40`;
});
export const manualAct: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: clean(input?.id, 80),
	status: clean(input?.status, 16)
})).handler(async ({ context, data }) => {
	const next = data.status;
	if (![
		"paid",
		"delivered",
		"released",
		"disputed"
	].includes(next)) throw new Error("FORBIDDEN");
	const sql = await getSql();
	const me = await sql`select is_admin, is_founder from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_admin && !me[0]?.is_founder) throw new Error("FORBIDDEN");
	const row = (await sql`select gig_id, buyer_id, seller_id, deal_type from manual_orders where id = ${data.id}`)[0];
	if (!row) throw new Error("FORBIDDEN");
	await sql`update manual_orders set status = ${next} where id = ${data.id}`;
	if (next === "released" && row.deal_type === "whatsapp_unlock") {
		await notePayOk(sql, row.buyer_id, "WhatsApp Unlock", data.id);
		await noteWhatsapp(sql, row.buyer_id, row.seller_id, row.gig_id);
		await sql`insert into notifications (id, user_id, kind, from_id, post_id) values (${nid()}, ${row.seller_id}, ${"wa_seller"}, ${""}, ${row.gig_id})`;
	}
	if (next === "disputed" && (row.deal_type === "whatsapp_unlock" || row.deal_type === "boost")) await notePayReject(sql, row.buyer_id, data.id);
	if (next === "released" && row.deal_type === "in_app_deal") {
		await sql`update board_deals set status = 'released', updated_at = now() where post_id = ${row.gig_id} and buyer_id = ${row.buyer_id}`;
		const deal = (await sql`select amount from board_deals where post_id = ${row.gig_id} and buyer_id = ${row.buyer_id}`)[0];
		await noteDeal(sql, row.seller_id, row.buyer_id, row.gig_id, deal?.amount ?? 0);
	}
	return { ok: true };
});
export const ownerCash: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await getSql();
	const me = await sql`select is_admin, is_founder from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_admin && !me[0]?.is_founder) return {
		usd: 0,
		pkr: 0
	};
	const direct = await sql`
      select coalesce(sum(amount_usd_cents), 0)::int as cents, coalesce(sum(amount_pkr), 0)::int as pkr
      from manual_orders where status = 'released' and deal_type in ('whatsapp_unlock', 'boost')`;
	const deals = await sql`select coalesce(sum(amount), 0)::int as n from board_deals where status = 'released'`;
	const cut = Math.floor((deals[0]?.n ?? 0) * 15 / 100);
	return {
		usd: ((direct[0]?.cents ?? 0) + cut * 100) / 100,
		pkr: (direct[0]?.pkr ?? 0) + Math.round(cut * 290)
	};
});
export const founderBooks: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await getSql();
	const me = await sql`select is_founder, is_admin from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_founder && !me[0]?.is_admin) throw new Error("FORBIDDEN");
	const users = await sql`select count(*)::int as n from profiles`;
	const gigs = await sql`select count(*)::int as n from gigs where removed_at is null`;
	const requests = await sql`select count(*)::int as n from job_posts where kind = 'need' and hidden_at is null`;
	const active = await sql`
      select ((select count(*) from gigs where boost_until > now()) + (select count(*) from job_posts where boost_until > now()))::int as n`;
	const wa = await sql`select coalesce(sum(amount_usd_cents), 0)::int as cents from manual_orders where deal_type = 'whatsapp_unlock' and status = 'released'`;
	const boostCents = await sql`select coalesce(sum(amount_usd_cents), 0)::int as cents from manual_orders where deal_type = 'boost' and status = 'released'`;
	const dealSum = await sql`select coalesce(sum(amount), 0)::int as n from board_deals where status = 'released'`;
	const fee = Math.floor((dealSum[0]?.n ?? 0) * 15 / 100);
	const ticks = await sql`select count(*)::int as n from verify_requests where status in ('paid_wait', 'approved')`;
	const withdrawn = await sql`select coalesce(sum(amount), 0)::int as n from board_withdrawals where status = 'paid' and currency = 'USD'`;
	const waUsd = (wa[0]?.cents ?? 0) / 100;
	const boostUsdSum = (boostCents[0]?.cents ?? 0) / 100;
	const tickUsd = (ticks[0]?.n ?? 0) * TICK_USD;
	let viewCount = 0;
	let likeCount = 0;
	let activeNow = 0;
	let growth: { day: string; n: number }[] = [];
	try {
		const gigViews = await sql`select count(*)::int as n from listing_views where kind = 'gig'`;
		const boardViews = await sql`select count(*)::int as n from listing_views where kind = 'board'`;
		viewCount = (Number(gigViews[0]?.n) || 0) + (Number(boardViews[0]?.n) || 0);
	} catch { /* view table */ }
	try {
		const gigLikes = await sql`select count(*)::int as n from gig_likes`;
		likeCount = Number(gigLikes[0]?.n) || 0;
	} catch { /* likes table */ }
	try {
		const jobLikes = await sql`select count(*)::int as n from job_likes`;
		likeCount += Number(jobLikes[0]?.n) || 0;
	} catch { /* board likes */ }
	try {
		const online = await sql`select count(*)::int as n from profiles where last_seen > now() - interval '5 minutes'`;
		activeNow = Number(online[0]?.n) || 0;
	} catch { /* presence */ }
	try {
		growth = await sql<{ day: string; n: number }>`
        select created_at::date::text as day, count(*)::int as n
        from profiles
        where created_at >= current_date - 6
        group by 1
        order by 1`;
	} catch { growth = []; }
	const desk = await checkoutDesk(sql);
	const unlocks = await sql`
      select o.id, b.username as buyer, b.display_name as name, s.username as seller, coalesce(g.title, '') as title,
        o.amount_usd_cents as cents, o.amount_pkr as pkr, o.created_at::text as at, o.status,
        o.payment_method as method, o.transaction_id as reference, coalesce(o.screenshot_url, '') as shot, coalesce(o.payer_name, '') as payer_name,
        coalesce(o.route_hint, '') as route_hint
      from manual_orders o
      join profiles b on b.user_id = o.buyer_id
      join profiles s on s.user_id = o.seller_id
      left join gigs g on g.id = o.gig_id
      where o.deal_type = 'whatsapp_unlock'
      order by o.created_at desc limit 30`;
	const boosts = await sql`
      select b.id, pr.username, pr.display_name as name, coalesce(nullif(b.listing_title, ''), g.title) as title, b.kind, b.method, b.reference, b.amount_label,
        b.payer_name, b.screenshot_url as shot, b.created_at::text as at, b.status, g.boost_until::text as until, coalesce(b.route_hint, '') as route_hint
      from gig_boosts b
      join profiles pr on pr.user_id = b.user_id
      join gigs g on g.id = b.gig_id
      order by b.created_at desc limit 30`;
	const badges = await sql`
      select pr.username, v.status, (select count(*)::int from listing_views lv where lv.owner_id = v.user_id and lv.kind = 'gig') as views, v.created_at::text as at
      from verify_requests v
      join profiles pr on pr.user_id = v.user_id
      order by v.created_at desc limit 30`;
	const deals = await sql`
      select d.id, b.username as buyer, s.username as seller, coalesce(g.title, j.title, '') as title, d.amount, d.status
      from board_deals d
      join profiles b on b.user_id = d.buyer_id
      join profiles s on s.user_id = d.seller_id
      left join gigs g on g.id = d.post_id
      left join job_posts j on j.id = d.post_id
      order by d.created_at desc limit 30`;
	const reports = await sql`
      select r.id, r.post_id, r.reason, r.note, pr.username as reporter, r.created_at::text as at,
        (select count(distinct reporter_id)::int from reports x where x.post_id = r.post_id and x.status = 'open') as n,
        coalesce(g.title, j.title, '') as title,
        left(coalesce(g.body, j.body, ''), 2000) as body,
        left(coalesce(g.body, j.body, ''), 160) as snippet,
        case
          when length(coalesce(g.thumb, '')) between 1 and 120000 then g.thumb
          when length(coalesce(j.photo, '')) between 1 and 120000 then j.photo
          else ''
        end as thumb,
        coalesce(ow.username, '') as owner,
        case when g.id is not null then 'gig' else 'board' end as box
      from reports r
      join profiles pr on pr.user_id = r.reporter_id
      left join gigs g on g.id = r.post_id
      left join job_posts j on j.id = r.post_id
      left join profiles ow on ow.user_id = coalesce(g.user_id, j.user_id)
      where r.status = 'open'
      order by r.created_at desc limit 40`;
	const cash = await sql`
      select w.id, pr.username, w.amount, w.method, w.account_mask, w.status, w.created_at::text as at
      from board_withdrawals w
      join profiles pr on pr.user_id = w.user_id
      order by w.created_at desc limit 30`;
	return {
		users: users[0]?.n ?? 0,
		gigs: gigs[0]?.n ?? 0,
		requests: requests[0]?.n ?? 0,
		activeBoosts: active[0]?.n ?? 0,
		withdrawn: withdrawn[0]?.n ?? 0,
		revenue: Math.round((waUsd + boostUsdSum + tickUsd + fee) * 100) / 100,
		waUsd,
		boostUsd: boostUsdSum,
		tickUsd,
		fee,
		views: viewCount,
		likes: likeCount,
		activeNow,
		growth,
		unlocks: unlocks.map((row) => ({
			...row,
			title: row.title || "Listing",
			route_hint: row.route_hint || desk.line(row.method)
		})),
		boosts: boosts.map((row) => ({
			...row,
			route_hint: row.route_hint || desk.line(row.method)
		})),
		badges,
		deals: deals.map((row) => ({
			...row,
			title: row.title || "Listing",
			fee: Math.floor(row.amount * 15 / 100),
			payout: row.amount - Math.floor(row.amount * 15 / 100)
		})),
		reports,
		cash
	};
});
export const ownerSay: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((body) => clean(body, 180)).handler(async ({ context, data }) => {
	if (!data || contactLeak(data)) throw new Error("GIG_LEAK");
	const sql = await getSql();
	if (!(await sql`select is_admin from profiles where user_id = ${context.userId}`)[0]?.is_admin) throw new Error("FORBIDDEN");
	await sql`insert into owner_notes (id, body) values (${nid()}, ${data})`;
	return { ok: true };
});
export const flareNote: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async () => {
	return (await (await getSql())`select body from owner_notes order by created_at desc limit 1`)[0]?.body ?? "";
});
export const gigTalk: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((input) => {
	if (typeof input === "string") return {
		id: clean(input, 80),
		withUser: ""
	};
	return {
		id: clean(input?.id, 80),
		withUser: clean(input?.with, 32).toLowerCase()
	};
}).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const gig = await sql`select user_id from gigs where id = ${data.id}`;
	if (!gig[0]) return [];
	let other = "";
	if (gig[0].user_id === context.userId) {
		if (!data.withUser) return [];
		other = (await sql`select user_id from profiles where username = ${data.withUser}`)[0]?.user_id ?? "";
	} else other = gig[0].user_id;
	if (!other || other === context.userId) return [];
	if ((await sql`select 1 from blocks where (blocker_id = ${context.userId} and blocked_id = ${other}) or (blocker_id = ${other} and blocked_id = ${context.userId})`).length) return [];
	const left = gig[0].user_id === context.userId ? gig[0].user_id : context.userId;
	return (await sql`
      select id, from_id, body, created_at::text as created_at
      from gig_messages
      where gig_id = ${data.id}
        and ((from_id = ${left} and to_id = ${other}) or (from_id = ${other} and to_id = ${left}))
      order by created_at`).map((row) => ({
		id: row.id,
		body: maskContact(row.body),
		mine: row.from_id === context.userId,
		at: row.created_at
	}));
});
export const gigPartners: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((id) => clean(id, 80)).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const gig = await sql`select user_id from gigs where id = ${data}`;
	if (!gig[0] || gig[0].user_id !== context.userId) return [];
	const ownerId = gig[0].user_id;
	return (await sql`
      select pr.username, pr.display_name, pr.avatar,
        exists(
          select 1 from gig_messages m
          where m.gig_id = ${data} and m.from_id = people.uid and m.to_id = ${ownerId}
        ) as started
      from (
        select buyer_id as uid from gig_orders where gig_id = ${data} and seller_id = ${ownerId}
        union
        select from_id as uid from gig_messages where gig_id = ${data} and to_id = ${ownerId}
        union
        select to_id as uid from gig_messages where gig_id = ${data} and from_id = ${ownerId}
      ) people
      join profiles pr on pr.user_id = people.uid
      where people.uid <> ${ownerId}`).map((row) => ({
		username: row.username,
		displayName: row.display_name,
		avatar: row.avatar,
		started: Boolean(row.started)
	}));
});
export const gigSend: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: clean(input?.id, 80),
	body: clean(input?.body, 500),
	to: clean(input?.to ?? "", 32).toLowerCase()
})).handler(async ({ context, data }) => {
	if (!data.body) throw new Error("EMPTY");
	const sql = await open(context.userId);
	if (chatLeak(data.body)) {
		await sql`insert into spam_logs (id, user_id, kind, body) values (${nid()}, ${context.userId}, ${"gig"}, ${maskContact(data.body).slice(0, 180)})`;
		throw new Error("CHAT_LEAK");
	}
	const gig = await sql`select user_id, removed_at::text as removed_at, hidden from gigs where id = ${data.id}`;
	if (!gig[0] || gig[0].removed_at) throw new Error("FORBIDDEN");
	const sellerId = gig[0].user_id;
	let other = "";
	if (sellerId === context.userId) {
		if (!data.to) throw new Error("FORBIDDEN");
		const buyer = await sql`select user_id from profiles where username = ${data.to}`;
		if (!buyer[0] || buyer[0].user_id === context.userId) throw new Error("FORBIDDEN");
		if (!(await sql`
        select 1 from gig_messages
        where gig_id = ${data.id} and from_id = ${buyer[0].user_id} and to_id = ${context.userId}
        limit 1`).length) throw new Error("GIG_FIRST");
		other = buyer[0].user_id;
	} else {
		if (gig[0].hidden) {
			if (!(await sql`select 1 from gig_messages where gig_id = ${data.id} and (from_id = ${context.userId} or to_id = ${context.userId}) limit 1`).length) throw new Error("FORBIDDEN");
		}
		other = sellerId;
	}
	if ((await sql`select 1 from blocks where (blocker_id = ${context.userId} and blocked_id = ${other}) or (blocker_id = ${other} and blocked_id = ${context.userId})`).length) throw new Error("BLOCKED");
	const messageId = nid();
	if (sellerId === context.userId) await sql`
        insert into gig_messages (id, gig_id, from_id, to_id, body)
        values (${messageId}, ${data.id}, ${context.userId}, ${other}, ${data.body})`;
	else {
		if (!(await sql`
        insert into gig_messages (id, gig_id, from_id, to_id, body)
        select ${messageId}, ${data.id}, ${context.userId}, ${other}, ${data.body}
        where (
          exists (
            select 1 from gig_messages
            where gig_id = ${data.id} and from_id = ${sellerId} and to_id = ${context.userId}
          )
          or exists (
            select 1 from thread_flags
            where kind = 'gig' and listing_id = ${data.id} and owner_id = ${sellerId} and other_id = ${context.userId} and accepted = true and declined = false
          )
          or (
            (select count(*)::int from gig_messages where gig_id = ${data.id} and from_id = ${context.userId} and to_id = ${other}) < 2
            and not exists (
              select 1 from thread_flags
              where kind = 'gig' and listing_id = ${data.id} and owner_id = ${sellerId} and other_id = ${context.userId} and declined = true
            )
          )
        )
        returning id`).length) throw new Error("GIG_CAP");
		await sql`
        insert into gig_orders (id, gig_id, buyer_id, seller_id)
        values (${nid()}, ${data.id}, ${context.userId}, ${sellerId})
        on conflict (gig_id, buyer_id) do nothing`;
	}
	await sql`
      insert into notifications (id, user_id, kind, from_id, post_id)
      values (${nid()}, ${other}, ${sellerId === context.userId ? "gig_reply" : "gig_inquiry"}, ${""}, ${data.id})`;
	return { ok: true };
});
export const gigReport: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const raw = typeof input === "string" ? {
		id: input,
		reason: "other",
		note: ""
	} : input ?? {};
	return {
		id: clean(raw.id, 80),
		reason: reportReason(String(raw.reason ?? "")),
		note: clean(raw.note, 280)
	};
}).handler(async ({ context, data }) => {
	if (data.note && contactLeak(data.note)) throw new Error("GIG_LEAK");
	const sql = await open(context.userId);
	const gig = (await sql`select user_id, title, hidden from gigs where id = ${data.id} and removed_at is null`)[0];
	if (!gig) throw new Error("FORBIDDEN");
	if (gig.user_id === context.userId) throw new Error("OWN_LISTING");
	if ((await sql`select 1 from reports where post_id = ${data.id} and reporter_id = ${context.userId} limit 1`).length) return {
		ok: true,
		already: true,
		hidden: Boolean(gig.hidden)
	};
	await sql`insert into reports (id, reporter_id, target_user_id, post_id, reason, note) values (${nid()}, ${context.userId}, ${gig.user_id}, ${data.id}, ${data.reason}, ${data.note})`;
	const count = await sql`select count(distinct reporter_id)::int as n from reports where post_id = ${data.id}`;
	let hidden = Boolean(gig.hidden);
	if (!hidden && shouldHideForReports(count[0]?.n ?? 0)) {
		await sql`update gigs set hidden = true where id = ${data.id} and hidden = false`;
		hidden = true;
		await noteReports(sql, gig.user_id, data.id, gig.title);
	}
	return {
		ok: true,
		already: false,
		hidden
	};
});
export const reportAct: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: clean(input?.id, 80),
	action: clean(input?.action, 16),
	title: clean(input?.title, 80),
	body: String(input?.body ?? "").replace(/\s+/g, " ").trim().slice(0, 4000),
	span: clean(input?.span, 16)
})).handler(async ({ context, data }) => {
	const sql = await getSql();
	const me = await sql`select is_admin, is_founder from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_admin && !me[0]?.is_founder) throw new Error("FORBIDDEN");
	const row = (await sql`select post_id, target_user_id, reporter_id, reason from reports where id = ${data.id} and status = 'open'`)[0];
	if (!row) throw new Error("FORBIDDEN");
	async function tell(userId, body, kind) {
		if (!userId) return;
		await postSystem(sql, { userId, kind, body, ref: `${data.id}:${kind}`, appeal: false });
		await sql`insert into notifications (id, user_id, kind, from_id, post_id) values (${nid()}, ${userId}, ${kind}, ${context.userId}, ${row.post_id})`;
	}
	const gig = (await sql`select user_id, title from gigs where id = ${row.post_id}`)[0];
	const job = gig ? null : (await sql`select user_id, title from job_posts where id = ${row.post_id}`)[0];
	const ownerId = gig?.user_id || job?.user_id || row.target_user_id;
	const title = gig?.title || job?.title || "your listing";
	const reason = reasonName(row.reason);
	async function stamp(status, action, listingTitle) {
		try {
			if (status === "dismissed") await sql`update reports set status = 'dismissed', action = ${action}, listing_title = ${listingTitle} where id = ${data.id}`;
			else await sql`update reports set status = 'closed', action = ${action}, listing_title = ${listingTitle} where post_id = ${row.post_id} and status = 'open'`;
		} catch {
			if (status === "dismissed") await sql`update reports set status = 'dismissed' where id = ${data.id}`;
			else await sql`update reports set status = 'closed' where post_id = ${row.post_id} and status = 'open'`;
		}
	}
	if (data.action === "dismiss") {
		await stamp("dismissed", "dismissed", title);
		await tell(row.reporter_id, "Your report was dismissed. No action was taken.", "report_done");
		return { ok: true };
	}
	if (data.action === "edit") {
		if (data.title.length < 3 || data.title.length > 80) throw new Error("GIG_TITLE");
		if (words(data.body) > 400) throw new Error("GIG_BODY");
		if (containsContactInfoBio(data.title) || containsContactInfoBio(data.body)) throw new Error("GIG_LEAK");
		if (gig) await sql`update gigs set title = ${data.title}, body = ${data.body} where id = ${row.post_id}`;
		else if (job) await sql`update job_posts set title = ${data.title}, body = ${data.body} where id = ${row.post_id}`;
		else throw new Error("FORBIDDEN");
		try {
			await sql`update reports set status = 'closed', action = 'edit', listing_title = ${data.title} where id = ${data.id}`;
		} catch {
			await sql`update reports set status = 'closed' where id = ${data.id}`;
		}
		if (ownerId) await tell(ownerId, `Your listing '${data.title}' was edited by admin for compliance.`, "listing_edit");
		return { ok: true };
	}
	if (data.action === "hide") {
		if (gig) {
			try { await sql`update gigs set hidden = true, admin_hold = true where id = ${row.post_id}`; }
			catch { await sql`update gigs set hidden = true where id = ${row.post_id}`; }
		}
		if (job) {
			try { await sql`update job_posts set hidden_at = coalesce(hidden_at, now()), admin_hold = true where id = ${row.post_id}`; }
			catch { await sql`update job_posts set hidden_at = coalesce(hidden_at, now()) where id = ${row.post_id}`; }
		}
		if (ownerId) await tell(ownerId, `Your listing '${title}' has been temporarily hidden while under review.`, "listing_hidden");
	} else if (data.action === "delete") {
		if (ownerId) {
			const removed = `Listing Removed\n\nYour listing '${title}' was removed by Flare admin due to ${reason}. Contact support@flare.app externally. No in-app appeal.`;
			await tell(ownerId, removed, "listing_deleted");
		}
		if (gig) await eraseGig(sql, row.post_id);
		if (job) await eraseJob(sql, row.post_id);
		await tell(row.reporter_id, `Your report on '${title}' was reviewed. The listing was deleted.`, "report_done");
	} else if (data.action === "ban") {
		let banned = false;
		if (ownerId) {
			const founder = await sql`select is_founder from profiles where user_id = ${ownerId}`;
			if (!founder[0]?.is_founder) {
				banned = true;
				if (data.span === "month") await sql`update profiles set banned_forever = false, banned_until = now() + interval '30 days' where user_id = ${ownerId}`;
				else await sql`update profiles set banned_forever = true, banned_until = null where user_id = ${ownerId}`;
				const ownedGigs = await sql`select id from gigs where user_id = ${ownerId}`;
				for (const item of ownedGigs) await eraseGig(sql, item.id);
				const ownedJobs = await sql`select id from job_posts where user_id = ${ownerId}`;
				for (const item of ownedJobs) await eraseJob(sql, item.id);
				await tell(ownerId, "Your account has been restricted due to repeated community guideline violations. You can no longer post listings. Contact support@flare.app for external review.", "banned");
			}
		}
		if (banned) await tell(row.reporter_id, "Your report was reviewed. The reported user was banned.", "report_done");
	} else throw new Error("FORBIDDEN");
	await stamp("closed", data.action, title);
	return { ok: true };
});
export const modDesk: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await getSql();
	const me = await sql`select is_founder, is_admin from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_founder && !me[0]?.is_admin) throw new Error("FORBIDDEN");
	let reports = [];
	try {
		reports = await sql`
      select r.id, r.post_id, r.reason, r.status, coalesce(r.action, '') as action, r.created_at::text as at,
        coalesce(nullif(r.listing_title, ''), g.title, j.title, '') as title,
        left(coalesce(g.body, j.body, ''), 2000) as body,
        case
          when length(coalesce(g.thumb, '')) between 1 and 120000 then g.thumb
          when length(coalesce(j.photo, '')) between 1 and 120000 then j.photo
          else ''
        end as thumb,
        pr.username as reporter, pr.user_id as reporter_id,
        coalesce(ow.username, tw.username, '') as owner,
        coalesce(ow.user_id, tw.user_id, nullif(r.target_user_id, ''), '') as owner_id,
        case when g.id is not null then 'gig' when j.id is not null then 'board' else 'user' end as box
      from reports r
      join profiles pr on pr.user_id = r.reporter_id
      left join gigs g on g.id = r.post_id
      left join job_posts j on j.id = r.post_id
      left join profiles ow on ow.user_id = coalesce(g.user_id, j.user_id)
      left join profiles tw on tw.user_id = nullif(r.target_user_id, '')
      order by r.created_at desc
      limit 80`;
	} catch {
		reports = await sql`
      select r.id, r.post_id, r.reason, r.status, '' as action, r.created_at::text as at,
        coalesce(g.title, j.title, '') as title,
        left(coalesce(g.body, j.body, ''), 2000) as body,
        case
          when length(coalesce(g.thumb, '')) between 1 and 120000 then g.thumb
          when length(coalesce(j.photo, '')) between 1 and 120000 then j.photo
          else ''
        end as thumb,
        pr.username as reporter, pr.user_id as reporter_id,
        coalesce(ow.username, tw.username, '') as owner,
        coalesce(ow.user_id, tw.user_id, nullif(r.target_user_id, ''), '') as owner_id,
        case when g.id is not null then 'gig' when j.id is not null then 'board' else 'user' end as box
      from reports r
      join profiles pr on pr.user_id = r.reporter_id
      left join gigs g on g.id = r.post_id
      left join job_posts j on j.id = r.post_id
      left join profiles ow on ow.user_id = coalesce(g.user_id, j.user_id)
      left join profiles tw on tw.user_id = nullif(r.target_user_id, '')
      order by r.created_at desc
      limit 80`;
	}
	const hiddenGigs = await sql`
    select g.id, g.title, pr.username, pr.user_id as owner_id,
      case when length(coalesce(g.thumb, '')) between 1 and 120000 then g.thumb else '' end as thumb
    from gigs g join profiles pr on pr.user_id = g.user_id
    where g.hidden = true and g.removed_at is null
    order by g.created_at desc limit 40`;
	const hiddenBoards = await sql`
    select j.id, j.title, pr.username, pr.user_id as owner_id,
      case when length(coalesce(j.photo, '')) between 1 and 120000 then j.photo else '' end as thumb
    from job_posts j join profiles pr on pr.user_id = j.user_id
    where j.hidden_at is not null
    order by j.created_at desc limit 40`;
	return {
		reports: reports.map((row) => ({
			id: row.id,
			postId: row.post_id,
			reason: row.reason || "",
			status: row.status || "open",
			action: row.action || "",
			at: row.at || "",
			title: row.title || "",
			body: row.body || "",
			thumb: row.thumb || "",
			reporter: row.reporter || "",
			reporterId: row.reporter_id || "",
			owner: row.owner || "",
			ownerId: row.owner_id || "",
			box: row.box || "user"
		})),
		hidden: [
			...hiddenGigs.map((row) => ({ id: row.id, title: row.title || "Listing", box: "gig", username: row.username || "", ownerId: row.owner_id || "", thumb: row.thumb || "" })),
			...hiddenBoards.map((row) => ({ id: row.id, title: row.title || "Listing", box: "board", username: row.username || "", ownerId: row.owner_id || "", thumb: row.thumb || "" }))
		]
	};
});
export const modUnhide: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => clean(id, 80)).handler(async ({ context, data }) => {
	const sql = await getSql();
	const me = await sql`select is_founder, is_admin from profiles where user_id = ${context.userId}`;
	if (!me[0]?.is_founder && !me[0]?.is_admin) throw new Error("FORBIDDEN");
	const gig = await sql`select id from gigs where id = ${data}`;
	if (gig[0]) {
		try { await sql`update gigs set hidden = false, admin_hold = false where id = ${data}`; }
		catch { await sql`update gigs set hidden = false where id = ${data}`; }
		return { ok: true };
	}
	try { await sql`update job_posts set hidden_at = null, admin_hold = false where id = ${data}`; }
	catch { await sql`update job_posts set hidden_at = null where id = ${data}`; }
	return { ok: true };
});
export const gigBlock: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((username) => clean(username, 32).toLowerCase()).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const who = await sql`select user_id from profiles where username = ${data}`;
	if (!who[0] || who[0].user_id === context.userId) return { ok: true };
	await sql`insert into blocks (blocker_id, blocked_id) values (${context.userId}, ${who[0].user_id}) on conflict do nothing`;
	return { ok: true };
});
async function gigViewCut(sql, gigId, ownerId, own) {
	let thisGigViews = 0;
	let totalBefore = 0;
	let hadTick = false;
	if (own) {
		thisGigViews = Number((await sql`select count(*)::int as n from listing_views where listing_id = ${gigId} and kind = 'gig'`)[0]?.n) || 0;
		totalBefore = Number((await sql`select count(*)::int as n from listing_views where owner_id = ${ownerId} and kind = 'gig'`)[0]?.n) || 0;
		const person = await sql`select verified, tick_state, is_founder from profiles where user_id = ${ownerId}`;
		hadTick = !person[0]?.is_founder && (Boolean(person[0]?.verified) || person[0]?.tick_state === "active" || person[0]?.tick_state === "faded");
	}
	return {
		thisGigViews,
		totalBefore,
		totalAfter: Math.max(0, totalBefore - thisGigViews),
		hadTick
	};
}
export const gigDeletePreview: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((id) => clean(id, 80)).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const row = await sql`select user_id from gigs where id = ${data}`;
	if (!row[0]) return { thisGigViews: 0, totalBefore: 0, totalAfter: 0, hadTick: false };
	const staff = await isAdmin(sql, context.userId);
	if (!canManageGig(context.userId, row[0].user_id, staff)) throw new Error("FORBIDDEN");
	return gigViewCut(sql, data, row[0].user_id, row[0].user_id === context.userId);
});
export const deleteGig: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => clean(id, 80)).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const row = await sql`select user_id from gigs where id = ${data}`;
	if (!row[0]) return { ok: true, thisGigViews: 0, totalBefore: 0, totalAfter: 0, hadTick: false, tickRemoved: false };
	const staff = await isAdmin(sql, context.userId);
	if (!canManageGig(context.userId, row[0].user_id, staff)) throw new Error("FORBIDDEN");
	const own = row[0].user_id === context.userId;
	const cut = await gigViewCut(sql, data, row[0].user_id, own);
	if (staff && !own) await sql`insert into gig_audit (id, gig_id, actor_id, action, note) values (${nid()}, ${data}, ${context.userId}, ${"delete"}, ${"Deleted by Admin"})`;
	await eraseGig(sql, data);
	let tickRemoved = false;
	if (own && cut.hadTick && cut.totalAfter < TICK_FLOOR_VIEWS) {
		await sql`update profiles set verified = false, tick_state = 'none', faded_at = null where user_id = ${row[0].user_id} and is_founder = false`;
		try { await sql`update verify_requests set status = 'rejected', updated_at = now() where user_id = ${row[0].user_id}`; } catch { /* older database */ }
		tickRemoved = true;
	}
	return { ok: true, ...cut, tickRemoved };
});
export const gigsByName: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((username) => clean(username, 32).toLowerCase()).handler(async ({ context, data }) => {
	return (await (await open(context.userId)).query(cardSql("lower(pr.username) = $1", "$2"), [data, context.userId])).map((row) => mapCard(row, context.userId));
});
export const savedGigs: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	return (await (await open(context.userId)).query(cardSql("exists(select 1 from gig_saves s where s.gig_id = g.id and s.user_id = $1)", "$1"), [context.userId])).map((row) => mapCard(row, context.userId));
});
export const likedGigs: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	return (await (await open(context.userId)).query(cardSql("exists(select 1 from gig_likes s where s.gig_id = g.id and s.user_id = $1)", "$1"), [context.userId])).map((row) => mapCard(row, context.userId));
});
export const gigStaff: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await open(context.userId);
	if (!await isAdmin(sql, context.userId)) throw new Error("FORBIDDEN");
	const gigs = await sql`
      select g.id, g.title, pr.username, g.hidden, g.flagged, (g.removed_at is not null) as removed
      from gigs g join profiles pr on pr.user_id = g.user_id
      order by g.created_at desc
      limit 30`;
	const audit = await sql`
      select a.id, a.gig_id, a.action, a.note, a.created_at::text as at, pr.username
      from gig_audit a
      left join profiles pr on pr.user_id = a.actor_id
      order by a.created_at desc
      limit 30`;
	return {
		gigs: gigs.map((row) => ({
			id: row.id,
			title: maskContact(row.title),
			username: row.username,
			hidden: Boolean(row.hidden),
			flagged: Boolean(row.flagged),
			removed: Boolean(row.removed)
		})),
		audit: audit.map((row) => ({
			id: row.id,
			gigId: row.gig_id,
			action: row.action,
			note: row.note,
			at: row.at,
			username: row.username || ""
		}))
	};
});
export const gigModerate: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const action = clean(input?.action, 16);
	if (!MOD_ACTIONS.includes(action)) throw new Error("FORBIDDEN");
	return {
		id: clean(input?.id, 80),
		action
	};
}).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	if (!await isAdmin(sql, context.userId)) throw new Error("FORBIDDEN");
	const gig = (await sql`select user_id, title, flagged from gigs where id = ${data.id}`)[0];
	if (!gig) throw new Error("FORBIDDEN");
	if (data.action === "hide") await sql`update gigs set hidden = true where id = ${data.id}`;
	if (data.action === "show") await sql`update gigs set hidden = false where id = ${data.id}`;
	if (data.action === "flag") await sql`update gigs set flagged = true where id = ${data.id}`;
	if (data.action === "unflag") await sql`update gigs set flagged = false where id = ${data.id}`;
	if (data.action === "remove") await sql`update gigs set removed_at = now(), hidden = true where id = ${data.id}`;
	if (data.action === "restore") await sql`update gigs set removed_at = null, hidden = false where id = ${data.id}`;
	if (data.action === "hide" || data.action === "remove") await noteModeration(sql, gig.user_id, data.id, gig.title, data.action === "hide" ? "hidden" : "deleted", Boolean(gig.flagged));
	await sql`insert into gig_audit (id, gig_id, actor_id, action, note) values (${nid()}, ${data.id}, ${context.userId}, ${data.action}, ${""})`;
	return { ok: true };
});
export const inquiryInbox: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await open(context.userId);
	const me = context.userId;
	const owned = await sql`
      select g.id as gig_id, g.title, pr.username, pr.display_name,
        exists(
          select 1 from gig_messages m
          where m.gig_id = g.id and m.from_id = people.uid and m.to_id = ${me}
        ) as started
      from (
        select gig_id, buyer_id as uid from gig_orders where seller_id = ${me}
        union
        select gig_id, from_id as uid from gig_messages where to_id = ${me}
        union
        select gig_id, to_id as uid from gig_messages where from_id = ${me}
      ) people
      join gigs g on g.id = people.gig_id and g.user_id = ${me}
      join profiles pr on pr.user_id = people.uid
      where people.uid <> ${me}`;
	const buying = await sql`
      select g.id as gig_id, g.title, pr.username, pr.display_name,
        exists(
          select 1 from gig_messages m
          where m.gig_id = g.id and m.from_id = ${me} and m.to_id = g.user_id
        ) as started
      from (
        select gig_id from gig_orders where buyer_id = ${me}
        union
        select gig_id from gig_messages where from_id = ${me}
        union
        select gig_id from gig_messages where to_id = ${me}
      ) mine
      join gigs g on g.id = mine.gig_id and g.user_id <> ${me}
      join profiles pr on pr.user_id = g.user_id`;
	const map = (row, role) => ({
		id: row.gig_id,
		title: maskContact(row.title),
		role,
		withUsername: row.username,
		withName: row.display_name,
		started: Boolean(row.started)
	});
	return { threads: [...owned.map((row) => map(row, "owner")), ...buying.map((row) => map(row, "buyer"))] };
});
function mapInbox(row, box) {
	return {
		id: row.id,
		box,
		title: maskContact(row.title),
		name: row.display_name || row.username,
		username: row.username,
		avatar: row.avatar || "",
		verified: Boolean(row.verified),
		preview: maskContact(row.preview || ""),
		at: row.at || ""
	};
}
export const inboxDesk: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await open(context.userId);
	const me = context.userId;
	const gigIn = await sql`
      select g.id, g.title, pr.username, pr.display_name, pr.avatar, pr.verified,
        coalesce((select m.body from gig_messages m where m.gig_id = g.id and m.from_id = people.uid and m.to_id = ${me} order by m.created_at desc limit 1), '') as preview,
        coalesce((select max(m.created_at)::text from gig_messages m where m.gig_id = g.id and ((m.from_id = people.uid and m.to_id = ${me}) or (m.from_id = ${me} and m.to_id = people.uid))), '') as at
      from (
        select distinct gig_id, from_id as uid from gig_messages where to_id = ${me}
      ) people
      join gigs g on g.id = people.gig_id and g.user_id = ${me}
      join profiles pr on pr.user_id = people.uid
      where people.uid <> ${me}
        and not exists (select 1 from gig_messages m where m.gig_id = g.id and m.from_id = ${me} and m.to_id = people.uid)
        and not exists (select 1 from thread_flags f where f.kind = 'gig' and f.listing_id = g.id and f.owner_id = ${me} and f.other_id = people.uid and (f.accepted = true or f.declined = true))
        and not exists (select 1 from blocks b where (b.blocker_id = ${me} and b.blocked_id = people.uid) or (b.blocked_id = ${me} and b.blocker_id = people.uid))`;
	const jobIn = await sql`
      select j.id, j.title, pr.username, pr.display_name, pr.avatar, pr.verified,
        coalesce((select m.body from job_messages m where m.job_id = j.id and m.from_id = people.uid and m.to_id = ${me} order by m.created_at desc limit 1), '') as preview,
        coalesce((select max(m.created_at)::text from job_messages m where m.job_id = j.id and ((m.from_id = people.uid and m.to_id = ${me}) or (m.from_id = ${me} and m.to_id = people.uid))), '') as at
      from (
        select distinct job_id, from_id as uid from job_messages where to_id = ${me}
      ) people
      join job_posts j on j.id = people.job_id and j.user_id = ${me}
      join profiles pr on pr.user_id = people.uid
      where people.uid <> ${me}
        and not exists (select 1 from job_messages m where m.job_id = j.id and m.from_id = ${me} and m.to_id = people.uid)
        and not exists (select 1 from thread_flags f where f.kind = 'job' and f.listing_id = j.id and f.owner_id = ${me} and f.other_id = people.uid and (f.accepted = true or f.declined = true))
        and not exists (select 1 from blocks b where (b.blocker_id = ${me} and b.blocked_id = people.uid) or (b.blocked_id = ${me} and b.blocker_id = people.uid))`;
	const gigChats = await sql`
      select g.id, g.title, pr.username, pr.display_name, pr.avatar, pr.verified,
        coalesce((select m.body from gig_messages m where m.gig_id = g.id and ((m.from_id = people.uid and m.to_id = ${me}) or (m.from_id = ${me} and m.to_id = people.uid)) order by m.created_at desc limit 1), '') as preview,
        coalesce((select max(m.created_at)::text from gig_messages m where m.gig_id = g.id and ((m.from_id = people.uid and m.to_id = ${me}) or (m.from_id = ${me} and m.to_id = people.uid))), '') as at
      from (
        select gig_id, from_id as uid from gig_messages where to_id = ${me}
        union
        select gig_id, to_id as uid from gig_messages where from_id = ${me}
      ) people
      join gigs g on g.id = people.gig_id
      join profiles pr on pr.user_id = people.uid
      where people.uid <> ${me}
        and (
          exists (select 1 from gig_messages m where m.gig_id = g.id and m.from_id = g.user_id and m.to_id = people.uid and g.user_id = ${me})
          or exists (select 1 from gig_messages m where m.gig_id = g.id and m.from_id = g.user_id and m.to_id = ${me} and g.user_id <> ${me})
          or exists (select 1 from thread_flags f where f.kind = 'gig' and f.listing_id = g.id and f.owner_id = g.user_id and f.other_id = case when g.user_id = ${me} then people.uid else ${me} end and f.accepted = true and f.declined = false)
        )
        and not exists (select 1 from thread_flags f where f.kind = 'gig' and f.listing_id = g.id and f.owner_id = g.user_id and f.other_id = case when g.user_id = ${me} then people.uid else ${me} end and f.declined = true)
        and not exists (select 1 from blocks b where (b.blocker_id = ${me} and b.blocked_id = people.uid) or (b.blocked_id = ${me} and b.blocker_id = people.uid))`;
	const jobChats = await sql`
      select j.id, j.title, pr.username, pr.display_name, pr.avatar, pr.verified,
        coalesce((select m.body from job_messages m where m.job_id = j.id and ((m.from_id = people.uid and m.to_id = ${me}) or (m.from_id = ${me} and m.to_id = people.uid)) order by m.created_at desc limit 1), '') as preview,
        coalesce((select max(m.created_at)::text from job_messages m where m.job_id = j.id and ((m.from_id = people.uid and m.to_id = ${me}) or (m.from_id = ${me} and m.to_id = people.uid))), '') as at
      from (
        select job_id, from_id as uid from job_messages where to_id = ${me}
        union
        select job_id, to_id as uid from job_messages where from_id = ${me}
      ) people
      join job_posts j on j.id = people.job_id
      join profiles pr on pr.user_id = people.uid
      where people.uid <> ${me}
        and (
          exists (select 1 from job_messages m where m.job_id = j.id and m.from_id = j.user_id and m.to_id = people.uid and j.user_id = ${me})
          or exists (select 1 from job_messages m where m.job_id = j.id and m.from_id = j.user_id and m.to_id = ${me} and j.user_id <> ${me})
          or exists (select 1 from thread_flags f where f.kind = 'job' and f.listing_id = j.id and f.owner_id = j.user_id and f.other_id = case when j.user_id = ${me} then people.uid else ${me} end and f.accepted = true and f.declined = false)
        )
        and not exists (select 1 from thread_flags f where f.kind = 'job' and f.listing_id = j.id and f.owner_id = j.user_id and f.other_id = case when j.user_id = ${me} then people.uid else ${me} end and f.declined = true)
        and not exists (select 1 from blocks b where (b.blocker_id = ${me} and b.blocked_id = people.uid) or (b.blocked_id = ${me} and b.blocker_id = people.uid))`;
	const latest = await sql`
      select body, created_at::text as at from system_messages where user_id = ${me} order by created_at desc limit 1`;
	const systemUnread = await sql`select count(*)::int as n from system_messages where user_id = ${me} and read = false`;
	return {
		systemPreview: (latest[0]?.body || "").split("\n")[0],
		systemAt: latest[0]?.at || "",
		systemUnread: systemUnread[0]?.n ?? 0,
		requests: [
			...gigIn.map((row) => mapInbox(row, "gig")),
			...jobIn.map((row) => mapInbox(row, "job"))
		],
		chats: [...gigChats.map((row) => mapInbox(row, "gig")), ...jobChats.map((row) => mapInbox(row, "job"))]
	};
});
export const threadAct: ServerCall = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	kind: input?.kind === "job" ? "job" : "gig",
	id: clean(input?.id, 80),
	username: clean(input?.username, 32).toLowerCase(),
	accept: Boolean(input?.accept)
})).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const who = await sql`select user_id from profiles where username = ${data.username}`;
	if (!who[0] || who[0].user_id === context.userId) throw new Error("FORBIDDEN");
	if (!(data.kind === "gig" ? await sql`select 1 from gigs where id = ${data.id} and user_id = ${context.userId}` : await sql`select 1 from job_posts where id = ${data.id} and user_id = ${context.userId}`).length) throw new Error("FORBIDDEN");
	await sql`
      insert into thread_flags (kind, listing_id, owner_id, other_id, accepted, declined)
      values (${data.kind}, ${data.id}, ${context.userId}, ${who[0].user_id}, ${data.accept}, ${!data.accept})
      on conflict (kind, listing_id, owner_id, other_id)
      do update set accepted = ${data.accept}, declined = ${!data.accept}`;
	if (data.accept) await sql`insert into notifications (id, user_id, kind, from_id, post_id) values (${nid()}, ${who[0].user_id}, ${data.kind === "gig" ? "gig_reply" : "job_reply"}, ${""}, ${data.id})`;
	return { ok: true };
});
export const threadOpen: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((input) => ({
	kind: input?.kind === "job" ? "job" : "gig",
	id: clean(input?.id, 80),
	username: clean(input?.username, 32).toLowerCase()
})).handler(async ({ context, data }) => {
	const sql = await open(context.userId);
	const row = data.kind === "gig" ? await sql`select user_id from gigs where id = ${data.id}` : await sql`select user_id from job_posts where id = ${data.id}`;
	if (!row[0]) return { open: false };
	const ownerId = row[0].user_id;
	let other = "";
	if (ownerId === context.userId) other = (await sql`select user_id from profiles where username = ${data.username}`)[0]?.user_id ?? "";
	else other = ownerId;
	if (!other) return { open: false };
	return { open: (await sql`select 1 from thread_flags where kind = ${data.kind} and listing_id = ${data.id} and owner_id = ${ownerId} and other_id = ${ownerId === context.userId ? other : context.userId} and accepted = true and declined = false`).length > 0 };
});
export const inboxBadge: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await open(context.userId);
	const me = context.userId;
	const gigN = await sql`
      select count(*)::int as n from (
        select distinct m.gig_id, m.from_id
        from gig_messages m
        join gigs g on g.id = m.gig_id and g.user_id = ${me}
        where m.to_id = ${me} and m.from_id <> ${me}
          and not exists (select 1 from gig_messages r where r.gig_id = m.gig_id and r.from_id = ${me} and r.to_id = m.from_id)
          and not exists (select 1 from thread_flags f where f.kind = 'gig' and f.listing_id = m.gig_id and f.owner_id = ${me} and f.other_id = m.from_id and (f.accepted = true or f.declined = true))
          and not exists (select 1 from blocks b where (b.blocker_id = ${me} and b.blocked_id = m.from_id) or (b.blocked_id = ${me} and b.blocker_id = m.from_id))
      ) t`;
	const jobN = await sql`
      select count(*)::int as n from (
        select distinct m.job_id, m.from_id
        from job_messages m
        join job_posts j on j.id = m.job_id and j.user_id = ${me}
        where m.to_id = ${me} and m.from_id <> ${me}
          and not exists (select 1 from job_messages r where r.job_id = m.job_id and r.from_id = ${me} and r.to_id = m.from_id)
          and not exists (select 1 from thread_flags f where f.kind = 'job' and f.listing_id = m.job_id and f.owner_id = ${me} and f.other_id = m.from_id and (f.accepted = true or f.declined = true))
          and not exists (select 1 from blocks b where (b.blocker_id = ${me} and b.blocked_id = m.from_id) or (b.blocked_id = ${me} and b.blocker_id = m.from_id))
      ) t`;
	const system = await sql`select count(*)::int as n from system_messages where user_id = ${me} and read = false`;
	const chatReq = await sql`select count(*)::int as n from conversations where participant2 = ${me} and status = 'pending'`;
	const chatUnread = await sql`
      select count(*)::int as n
      from conversation_messages m
      join conversations c on c.id = m.conversation_id
      where c.status = 'accepted' and (c.participant1 = ${me} or c.participant2 = ${me}) and m.sender_id <> ${me} and m.status <> 'seen'`;
	const requests = (gigN[0]?.n ?? 0) + (jobN[0]?.n ?? 0) + (chatReq[0]?.n ?? 0);
	const unread = chatUnread[0]?.n ?? 0;
	return {
		requests,
		unread,
		system: system[0]?.n ?? 0,
		total: requests + unread
	};
});
export const followFeed: ServerCall = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async () => {
	return [];
});
//#endregion
