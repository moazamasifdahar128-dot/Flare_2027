import { createFileRoute } from "@tanstack/react-router";
import type { Sql } from "@/lib/db";
import { overSampleLimit, readContainerSeconds, SAMPLE_MAX_BYTES, SAMPLE_MAX_SECONDS } from "@/lib/shola/sample-limit";

const DEFAULT_CHUNK = 700_000;
const NEW_CHUNK = 5 * 1024 * 1024;
const MAX_CHUNK = 8 * 1024 * 1024;

function videoOk(mime: string) {
  return mime.startsWith("video/");
}

function nid() {
  return crypto.randomUUID();
}

async function viewer(request: Request) {
  const { auth, authConfigured } = await import("@/lib/auth/server");
  const { gateIdentityEnabled } = await import("@/lib/auth/gate-identity.server");
  const { DEV_USER_ID } = await import("@/lib/auth/verify.server");
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  const token = url.searchParams.get("token");
  if (token && !headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
  if (authConfigured || gateIdentityEnabled()) {
    const session = await auth.api.getSession({ headers });
    if (!session?.user) return "";
    return session.user.id;
  }
  if (process.env.DATABASE_URL?.trim()) return "";
  return DEV_USER_ID;
}

function decodePart(value: string) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function textReply(body: string, status: number) {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

function asCount(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

type UploadBody = {
  action: string;
  mime: string;
  bytes: number;
  id: string;
  idx: number;
  data: string;
  chunk: number;
  seconds: number;
};

async function readUpload(request: Request): Promise<UploadBody> {
  const type = (request.headers.get("content-type") || "").toLowerCase();
  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    let data = "";
    let mime = cleanMime(String(form.get("mime") || ""));
    if (file && typeof file !== "string" && typeof file.arrayBuffer === "function") {
      const raw = new Uint8Array(await file.arrayBuffer());
      data = Buffer.from(raw).toString("base64");
      const hinted = cleanMime(mime || ("type" in file ? String((file as Blob).type || "") : ""));
      const sniffed = sniffedMime(raw);
      mime = hinted.startsWith("video/") ? hinted : sniffed || "video/mp4";
    }
    return {
      action: String(form.get("action") || ""),
      mime,
      bytes: Number(form.get("bytes") || 0),
      id: String(form.get("id") || ""),
      idx: Number(form.get("idx") || 0),
      data,
      chunk: Number(form.get("chunk") || 0),
      seconds: Number(form.get("seconds") || form.get("duration") || 0),
    };
  }
  const raw = type.includes("application/json") || type.includes("text/plain") || !type ? await request.text() : "";
  if (!raw) throw new Error("GIG_VIDEO");
  const parsed = JSON.parse(raw) as Partial<UploadBody>;
  return {
    action: String(parsed.action || ""),
    mime: String(parsed.mime || "").toLowerCase(),
    bytes: Number(parsed.bytes || 0),
    id: String(parsed.id || ""),
    idx: Number(parsed.idx || 0),
    data: String(parsed.data || ""),
    chunk: Number(parsed.chunk || 0),
    seconds: Number(parsed.seconds || 0),
  };
}

function sniffedMime(bytes: Uint8Array) {
  const end = Math.min(bytes.length, 65536);
  const text = Buffer.from(bytes.subarray(0, end)).toString("latin1");
  const at = text.indexOf("ftyp");
  if (at >= 0) {
    const brand = text.slice(at + 4, at + 8).toLowerCase();
    if (brand.startsWith("3g")) return "video/3gpp";
    if (brand.trim() === "qt") return "video/quicktime";
    return "video/mp4";
  }
  for (let i = 0; i < end - 3; i += 1) {
    if (bytes[i] === 0x1a && bytes[i + 1] === 0x45 && bytes[i + 2] === 0xdf && bytes[i + 3] === 0xa3) return "video/webm";
  }
  return "";
}

function cleanMime(value: string) {
  return value.toLowerCase().split(";")[0].trim();
}

function blobChunk(value: number | null | undefined) {
  const chunk = Math.floor(Number(value) || DEFAULT_CHUNK);
  if (chunk < 256_000 || chunk > MAX_CHUNK) return DEFAULT_CHUNK;
  return chunk;
}

function playType(mime: string) {
  const clean = cleanMime(mime || "");
  if (clean === "video/webm") return "video/webm";
  if (clean === "video/3gpp") return "video/3gpp";
  if (clean.startsWith("video/")) return "video/mp4";
  return "video/mp4";
}

function mediaHeaders(mime: string, total: number, start: number, end: number, status: number) {
  const headers = new Headers({
    "content-type": mime,
    "accept-ranges": "bytes",
    "content-length": String(Math.max(0, end - start + 1)),
    "cache-control": "private, max-age=3600",
    "content-disposition": "inline",
    "x-content-type-options": "nosniff",
  });
  if (status === 206) headers.set("content-range", `bytes ${start}-${end}/${total}`);
  return headers;
}

async function readSpan(sql: Sql, id: string, start: number, end: number, chunkSize?: number) {
  const chunk = blobChunk(chunkSize);
  const fromIdx = Math.floor(start / chunk);
  const toIdx = Math.floor(end / chunk);
  const parts = await sql<{ idx: number; data: string }>`select idx, data from gig_blob_parts where blob_id = ${id} and idx >= ${fromIdx} and idx <= ${toIdx} order by idx`;
  const out = new Uint8Array(Math.max(0, end - start + 1));
  let filled = 0;
  for (const part of parts) {
    const raw = decodePart(part.data);
    const partStart = part.idx * chunk;
    const partEnd = partStart + raw.byteLength;
    if (partEnd <= start || partStart > end) continue;
    const from = Math.max(start, partStart);
    const to = Math.min(end + 1, partEnd);
    out.set(raw.subarray(from - partStart, to - partStart), from - start);
    filled += to - from;
  }
  const body = filled === out.byteLength ? out : out.subarray(0, filled);
  return body.byteOffset === 0 && body.byteLength === body.buffer.byteLength ? body : body.slice();
}

async function mediaResponse(request: Request, headOnly: boolean) {
  const userId = await viewer(request);
  if (!userId) return textReply("Unauthorized", 401);
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return textReply("Not found", 404);
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const blob = await sql<{ mime: string; bytes: number; done: boolean; chunk: number }>`select mime, bytes, done, chunk from gig_blobs where id = ${id}`;
  if (!blob[0]?.done) return textReply("Not found", 404);
  const total = asCount(blob[0].bytes);
  if (total < 1) return textReply("Not found", 404);
  const mime = playType(blob[0].mime);
  const header = request.headers.get("range");
  let start = 0;
  let end = total - 1;
  let status = 200;
  if (header?.startsWith("bytes=")) {
    const [rawStart, rawEnd] = header.slice(6).split("-");
    if (!rawStart && rawEnd) {
      const tail = Math.min(total, Number(rawEnd) || 0);
      start = Math.max(0, total - tail);
      end = total - 1;
    } else {
      start = Math.max(0, Number(rawStart) || 0);
      end = rawEnd ? Math.min(total - 1, Number(rawEnd)) : total - 1;
    }
    if (start > end || start >= total) return textReply("Range not satisfiable", 416);
    status = 206;
  }
  if (headOnly) return new Response(null, { status, headers: mediaHeaders(mime, total, start, end, status) });
  const body = await readSpan(sql, id, start, end, blob[0].chunk);
  if (body.byteLength < 1) return textReply("Not found", 404);
  const actualEnd = start + body.byteLength - 1;
  const http = body.byteLength === end - start + 1 ? status : 206;
  return new Response(body, { status: http, headers: mediaHeaders(mime, total, start, actualEnd, http) });
}

export const Route = createFileRoute("/api/gig-media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const site = request.headers.get("sec-fetch-site");
        if (site && site !== "same-origin" && site !== "none") return reply({ error: "Forbidden" }, 403);
        try {
          const userId = await viewer(request);
          if (!userId) return reply({ error: "Unauthorized" }, 401);
          const body = await readUpload(request);
          if (!body.action || body.action === "file") {
            if (!body.data) return reply({ error: "No file provided" }, 400);
            body.action = "whole";
          }
          const { getSql } = await import("@/lib/db");
          const sql = await getSql();
          if (body.action === "start") {
            const mime = cleanMime(body.mime === "video/x-m4v" ? "video/mp4" : body.mime);
            const bytes = Math.floor(body.bytes || 0);
            const chunk = Math.floor(body.chunk || NEW_CHUNK);
            const seconds = Number(body.seconds);
            if (!videoOk(mime) || bytes < 1 || !Number.isFinite(bytes)) return reply({ error: "GIG_VIDEO" }, 400);
            if (!Number.isFinite(seconds) || seconds <= 0 || overSampleLimit(seconds)) return reply({ error: "GIG_LONG" }, 400);
            if (bytes > SAMPLE_MAX_BYTES) return reply({ error: "GIG_HEAVY" }, 400);
            if (chunk < 524_288 || chunk > MAX_CHUNK) return reply({ error: "GIG_VIDEO" }, 400);
            const id = nid();
            try {
              await sql`insert into gig_blobs (id, user_id, mime, bytes, chunk, seconds) values (${id}, ${userId}, ${mime}, ${bytes}, ${chunk}, ${Math.round(seconds)})`;
            } catch (err) {
              const message = err instanceof Error ? err.message : "";
              if (/out of range/i.test(message)) {
                await sql`alter table gig_blobs alter column bytes type bigint`;
                await sql`insert into gig_blobs (id, user_id, mime, bytes, chunk, seconds) values (${id}, ${userId}, ${mime}, ${bytes}, ${chunk}, ${Math.round(seconds)})`;
              } else if (!/seconds/i.test(message)) throw err;
              else {
                await sql`alter table gig_blobs add column if not exists seconds integer not null default 0`;
                await sql`insert into gig_blobs (id, user_id, mime, bytes, chunk, seconds) values (${id}, ${userId}, ${mime}, ${bytes}, ${chunk}, ${Math.round(seconds)})`;
              }
            }
            return reply({ id, chunk });
          }
          if (body.action === "whole") {
            const raw = body.data ? decodePart(body.data) : new Uint8Array();
            if (raw.byteLength < 1) return reply({ error: "GIG_READ" }, 400);
            let mime = cleanMime(body.mime === "video/x-m4v" ? "video/mp4" : body.mime);
            if (!videoOk(mime)) mime = sniffedMime(raw) || "video/mp4";
            if (!videoOk(mime)) return reply({ error: "GIG_VIDEO" }, 400);
            const seconds = Number(body.seconds);
            if (!Number.isFinite(seconds) || seconds <= 0 || overSampleLimit(seconds)) return reply({ error: "GIG_LONG" }, 400);
            if (raw.byteLength > SAMPLE_MAX_BYTES) return reply({ error: "GIG_HEAVY" }, 400);
            const windowBytes = 8 * 1024 * 1024;
            const headView = raw.subarray(0, Math.min(raw.byteLength, windowBytes));
            const tailView = raw.subarray(Math.max(0, raw.byteLength - windowBytes));
            const seen = mime === "video/webm" ? readContainerSeconds(headView) : readContainerSeconds(headView, "movie") ?? readContainerSeconds(tailView, "movie");
            if (seen != null && overSampleLimit(seen)) return reply({ error: "GIG_LONG" }, 400);
            const wholeId = nid();
            const wholeChunk = NEW_CHUNK;
            const wholeBytes = raw.byteLength;
            try {
              await sql`insert into gig_blobs (id, user_id, mime, bytes, chunk, seconds) values (${wholeId}, ${userId}, ${mime}, ${wholeBytes}, ${wholeChunk}, ${Math.round(seconds)})`;
            } catch (err) {
              const message = err instanceof Error ? err.message : "";
              if (/out of range/i.test(message)) {
                await sql`alter table gig_blobs alter column bytes type bigint`;
                await sql`insert into gig_blobs (id, user_id, mime, bytes, chunk, seconds) values (${wholeId}, ${userId}, ${mime}, ${wholeBytes}, ${wholeChunk}, ${Math.round(seconds)})`;
              } else if (!/seconds/i.test(message)) throw err;
              else {
                await sql`alter table gig_blobs add column if not exists seconds integer not null default 0`;
                await sql`insert into gig_blobs (id, user_id, mime, bytes, chunk, seconds) values (${wholeId}, ${userId}, ${mime}, ${wholeBytes}, ${wholeChunk}, ${Math.round(seconds)})`;
              }
            }
            const expect = Math.max(1, Math.ceil(wholeBytes / wholeChunk));
            for (let idx = 0; idx < expect; idx++) {
              const piece = raw.subarray(idx * wholeChunk, Math.min(wholeBytes, (idx + 1) * wholeChunk));
              const data = Buffer.from(piece).toString("base64");
              await sql`
                insert into gig_blob_parts (blob_id, idx, data) values (${wholeId}, ${idx}, ${data})
                on conflict (blob_id, idx) do update set data = excluded.data`;
            }
            await sql`update gig_blobs set done = true where id = ${wholeId}`;
            const stamped = Math.max(1, Math.min(SAMPLE_MAX_SECONDS, Math.round(seconds)));
            return reply({ id: wholeId, url: `/api/gig-media?id=${wholeId}&s=${stamped}`, type: mime });
          }
          const id = body.id;
          if (!/^[0-9a-f-]{36}$/i.test(id)) return reply({ error: "FORBIDDEN" }, 400);
          const blob = await sql<{ user_id: string; bytes: number; done: boolean; chunk: number; mime: string }>`select user_id, bytes, done, chunk, mime from gig_blobs where id = ${id}`;
          if (!blob[0] || blob[0].user_id !== userId) return reply({ error: "FORBIDDEN" }, 403);
          const chunk = blobChunk(blob[0].chunk);
          if (body.action === "status") {
            const parts = await sql<{ idx: number }>`select idx from gig_blob_parts where blob_id = ${id} order by idx`;
            return reply({ id, done: Boolean(blob[0].done), chunk, idxs: parts.map((row) => row.idx) });
          }
          if (body.action === "part") {
            if (blob[0].done) return reply({ error: "FORBIDDEN" }, 400);
            const partMime = cleanMime(body.mime);
            if (partMime && !videoOk(partMime) && partMime !== "application/octet-stream") return reply({ error: "GIG_VIDEO" }, 400);
            const idx = Math.floor(Number(body.idx));
            const data = body.data;
            const totalBytes = asCount(blob[0].bytes);
            const expect = Math.max(1, Math.ceil(totalBytes / chunk));
            const maxChars = Math.min(12_000_000, Math.ceil(chunk / 3) * 4 + 256);
            if (!Number.isInteger(idx) || idx < 0 || idx >= expect || data.length < 4 || data.length > maxChars) return reply({ error: "GIG_VIDEO" }, 400);
            await sql`
              insert into gig_blob_parts (blob_id, idx, data) values (${id}, ${idx}, ${data})
              on conflict (blob_id, idx) do update set data = excluded.data`;
            return reply({ ok: true });
          }
          if (body.action === "finish") {
            const totalBytes = asCount(blob[0].bytes);
            if (totalBytes > SAMPLE_MAX_BYTES) {
              await sql`delete from gig_blob_parts where blob_id = ${id}`;
              await sql`delete from gig_blobs where id = ${id}`;
              return reply({ error: "GIG_HEAVY" }, 400);
            }
            const expect = Math.max(1, Math.ceil(totalBytes / chunk));
            const got = await sql<{ n: number }>`select count(*)::int as n from gig_blob_parts where blob_id = ${id}`;
            if ((got[0]?.n ?? 0) !== expect) return reply({ error: "INCOMPLETE" }, 409);
            const windowBytes = 8 * 1024 * 1024;
            const edge = Math.max(1, Math.ceil(windowBytes / chunk));
            const tailFrom = Math.max(0, expect - edge);
            const parts = await sql<{ idx: number; data: string }>`select idx, data from gig_blob_parts where blob_id = ${id} and (idx < ${edge} or idx >= ${tailFrom}) order by idx`;
            const head = new Uint8Array(Math.min(totalBytes, windowBytes));
            let headUsed = 0;
            const tailPieces: Uint8Array[] = [];
            for (const part of parts) {
              const raw = decodePart(part.data);
              if (part.idx < edge && headUsed < head.length) {
                const take = Math.min(raw.length, head.length - headUsed);
                head.set(raw.subarray(0, take), headUsed);
                headUsed += take;
              }
              if (part.idx >= tailFrom) tailPieces.push(raw);
            }
            const tailLength = tailPieces.reduce((sum, piece) => sum + piece.byteLength, 0);
            const tail = new Uint8Array(Math.min(windowBytes, tailLength));
            let skip = Math.max(0, tailLength - tail.length);
            let tailUsed = 0;
            for (const raw of tailPieces) {
              if (tailUsed >= tail.length) break;
              if (skip >= raw.length) {
                skip -= raw.length;
                continue;
              }
              const piece = raw.subarray(skip);
              skip = 0;
              const room = tail.length - tailUsed;
              tail.set(piece.subarray(0, room), tailUsed);
              tailUsed += Math.min(piece.length, room);
            }
            const headView = head.subarray(0, headUsed);
            const tailView = tail.subarray(0, tailUsed);
            const seen = blob[0].mime === "video/webm" ? readContainerSeconds(headView) : readContainerSeconds(headView, "movie") ?? readContainerSeconds(tailView, "movie");
            if (seen != null && overSampleLimit(seen)) {
              await sql`delete from gig_blob_parts where blob_id = ${id}`;
              await sql`delete from gig_blobs where id = ${id}`;
              return reply({ error: "GIG_LONG" }, 400);
            }
            await sql`update gig_blobs set done = true where id = ${id}`;
            return reply({ ok: true });
          }
          return reply({ error: "FORBIDDEN" }, 400);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          if (/chunk/i.test(message) && /does not exist|column/i.test(message)) {
            try {
              const { getSql } = await import("@/lib/db");
              const sql = await getSql();
              await sql`alter table gig_blobs add column if not exists chunk integer not null default 700000`;
            } catch {
              /* the client retries this part */
            }
            return reply({ error: "RETRY" }, 503);
          }
          return reply({ error: message.includes("content-type") ? "GIG_VIDEO" : message }, 400);
        }
      },
      GET: async ({ request }) => {
        try {
          return await mediaResponse(request, false);
        } catch (err) {
          const message = err instanceof Error ? err.message : "";
          if (/chunk/i.test(message) && /does not exist|column/i.test(message)) {
            try {
              const { getSql } = await import("@/lib/db");
              const sql = await getSql();
              await sql`alter table gig_blobs add column if not exists chunk integer not null default 700000`;
            } catch {
              /* the next play uses the new column */
            }
          }
          return textReply("Not found", 404);
        }
      },
      HEAD: async ({ request }) => {
        try {
          return await mediaResponse(request, true);
        } catch {
          return textReply("Not found", 404);
        }
      },
    },
  },
});
