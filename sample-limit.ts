export const SAMPLE_MAX_SECONDS = 30;
export const SAMPLE_MAX_BYTES = 60 * 1024 * 1024;
const SAMPLE_SLACK_SECONDS = 0.5;

export function canManageGig(viewerId: string, ownerId: string, isAdmin: boolean) {
  return viewerId === ownerId || isAdmin === true;
}

export function publicGigCounts(views: number, likes: number, hideCounts: boolean, viewerIsOwner: boolean) {
  const isHidden = Boolean(hideCounts) && !viewerIsOwner;
  const gigViews = isHidden ? null : views;
  const gigLikes = isHidden ? null : likes;
  return { views: gigViews, likes: gigLikes, gigViews, gigLikes, isHidden };
}

export function overSampleLimit(seconds: number) {
  return Number.isFinite(seconds) && seconds > SAMPLE_MAX_SECONDS + SAMPLE_SLACK_SECONDS;
}

export function nextUploadPercent(previous: number, next: number) {
  const prior = Number.isFinite(previous) ? previous : 0;
  if (!Number.isFinite(next)) return prior;
  const clamped = Math.max(0, Math.min(100, Math.round(next)));
  return Math.max(prior, clamped);
}

function u32(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function readVint(bytes: Uint8Array, offset: number) {
  if (offset >= bytes.length) return null;
  const first = bytes[offset];
  let width = 1;
  let mask = 0x80;
  while (width <= 8 && (first & mask) === 0) {
    width += 1;
    mask >>= 1;
  }
  if (width > 8 || offset + width > bytes.length) return null;
  let value = first & (mask - 1);
  for (let i = 1; i < width; i += 1) value = value * 256 + bytes[offset + i];
  return { value, next: offset + width };
}

const MOVIE_BOXES = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts", "udta", "mvex"]);

function boxType(bytes: Uint8Array, offset: number) {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function readBox(bytes: Uint8Array, offset: number, limit: number) {
  if (offset + 8 > limit) return null;
  const type = boxType(bytes, offset + 4);
  if (!/^[A-Za-z0-9 ]{4}$/.test(type)) return null;
  const size32 = u32(bytes, offset);
  let size = size32;
  let header = 8;
  if (size32 === 1) {
    if (offset + 16 > limit) return null;
    size = u32(bytes, offset + 8) * 4294967296 + u32(bytes, offset + 12);
    header = 16;
  }
  if (size < header || offset + size > limit) return null;
  return { size, header, type };
}

function mvhdSeconds(bytes: Uint8Array, payload: number, end: number) {
  if (payload >= end) return null;
  const version = bytes[payload];
  if (version === 0) {
    if (payload + 20 > end) return null;
    const timescale = u32(bytes, payload + 12);
    const duration = u32(bytes, payload + 16);
    if (timescale < 1 || timescale > 1_000_000_000) return null;
    const seconds = duration / timescale;
    if (seconds > 0 && seconds < 24 * 3600) return seconds;
  } else if (version === 1) {
    if (payload + 32 > end) return null;
    const timescale = u32(bytes, payload + 20);
    const hi = u32(bytes, payload + 24);
    const lo = u32(bytes, payload + 28);
    if (timescale < 1 || timescale > 1_000_000_000) return null;
    const seconds = (hi * 4294967296 + lo) / timescale;
    if (seconds > 0 && seconds < 24 * 3600) return seconds;
  }
  return null;
}

function findMvhd(bytes: Uint8Array, start: number, end: number): number | null {
  let offset = start;
  while (offset + 8 <= end) {
    const box = readBox(bytes, offset, end);
    if (!box) return null;
    const payload = offset + box.header;
    const boxEnd = offset + box.size;
    if (box.type === "mvhd") return mvhdSeconds(bytes, payload, boxEnd);
    if (MOVIE_BOXES.has(box.type)) {
      const nested = findMvhd(bytes, payload, boxEnd);
      if (nested != null) return nested;
    }
    offset = boxEnd;
  }
  return null;
}

function scanExactMvhd(bytes: Uint8Array) {
  for (let i = 4; i + 24 < bytes.length; i += 1) {
    if (bytes[i] !== 0x6d || bytes[i + 1] !== 0x76 || bytes[i + 2] !== 0x68 || bytes[i + 3] !== 0x64) continue;
    const size = u32(bytes, i - 4);
    const version = bytes[i + 4];
    if (version === 0 && size !== 108) continue;
    if (version === 1 && size !== 120) continue;
    if (version !== 0 && version !== 1) continue;
    const seconds = mvhdSeconds(bytes, i + 4, Math.min(bytes.length, i - 4 + size));
    if (seconds != null) return seconds;
  }
  return null;
}

function readMvhd(bytes: Uint8Array) {
  const aligned = bytes.length >= 8 && boxType(bytes, 4) === "ftyp";
  if (aligned) {
    const walked = findMvhd(bytes, 0, bytes.length);
    if (walked != null) return walked;
  }
  return scanExactMvhd(bytes);
}

function looksLikeWebm(bytes: Uint8Array) {
  const limit = Math.min(bytes.length, 64);
  for (let i = 0; i + 3 < limit; i += 1) {
    if (bytes[i] === 0x1a && bytes[i + 1] === 0x45 && bytes[i + 2] === 0xdf && bytes[i + 3] === 0xa3) return true;
  }
  return false;
}

function readWebm(bytes: Uint8Array) {
  const limit = Math.min(bytes.length, 256 * 1024);
  let scale = 1_000_000;
  for (let i = 0; i < limit - 12; i += 1) {
    if (bytes[i] !== 0x2a || bytes[i + 1] !== 0xd7 || bytes[i + 2] !== 0xb1) continue;
    const size = readVint(bytes, i + 3);
    if (!size || size.value < 1 || size.value > 4 || size.next + size.value > limit) continue;
    let n = 0;
    for (let k = 0; k < size.value; k += 1) n = n * 256 + bytes[size.next + k];
    if (n > 0) scale = n;
  }
  for (let i = 0; i < limit - 12; i += 1) {
    if (bytes[i] !== 0x44 || bytes[i + 1] !== 0x89) continue;
    const size = readVint(bytes, i + 2);
    if (!size || (size.value !== 4 && size.value !== 8) || size.next + size.value > limit) continue;
    const view = new DataView(bytes.buffer, bytes.byteOffset + size.next, size.value);
    const raw = size.value === 8 ? view.getFloat64(0, false) : view.getFloat32(0, false);
    if (!Number.isFinite(raw) || raw <= 0) continue;
    const seconds = (raw * scale) / 1e9;
    if (seconds > 0 && seconds < 24 * 3600) return seconds;
  }
  return null;
}

export function readContainerSeconds(bytes: Uint8Array, scope: "all" | "movie" = "all") {
  const movie = readMvhd(bytes);
  if (movie != null) return movie;
  if (scope === "movie" || !looksLikeWebm(bytes)) return null;
  return readWebm(bytes);
}

export function sampleRejected(seconds: number | null, fileBytes = 0) {
  if (fileBytes > SAMPLE_MAX_BYTES) return "GIG_HEAVY";
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0 || overSampleLimit(seconds)) return "GIG_LONG";
  return "";
}
