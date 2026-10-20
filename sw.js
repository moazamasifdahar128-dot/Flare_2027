const DB_NAME = "flare-upload";
const STORE = "jobs";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function allJobs(db) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function deleteJob(db, id) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function tell(type, id, error) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) client.postMessage({ type, id, error: error || "" });
}

async function sendQueued() {
  const db = await openDb();
  const jobs = await allJobs(db);
  for (const job of jobs) {
    if (!job.body || job.mode === "fetch") continue;
    const res = await fetch("/api/flare-upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: job.body,
    });
    const text = await res.text();
    if (res.ok || text.includes("DUPLICATE")) {
      await deleteJob(db, job.id);
      await tell("flare-upload-done", job.id, "");
    } else {
      await tell("flare-upload-fail", job.id, text.slice(0, 180));
      throw new Error("NETWORK");
    }
  }
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || event.request.headers.get("x-tsr-serverfn") === "true") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response("Offline", { status: 504, headers: { "content-type": "text/plain; charset=utf-8" } }),
    ),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "flare-upload") event.waitUntil(sendQueued().catch(() => undefined));
});

self.addEventListener("backgroundfetchsuccess", (event) => {
  event.waitUntil((async () => {
    const db = await openDb();
    await deleteJob(db, event.registration.id);
    await tell("flare-upload-done", event.registration.id, "");
  })());
});

self.addEventListener("backgroundfetchfail", (event) => {
  event.waitUntil((async () => {
    const db = await openDb();
    const jobs = await allJobs(db);
    const row = jobs.find((job) => job.id === event.registration.id);
    if (row) {
      await new Promise((resolve, reject) => {
        const req = db.transaction(STORE, "readwrite").objectStore(STORE).put({ ...row, mode: "page" });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
    await tell("flare-upload-fail", event.registration.id, "NETWORK");
    if (self.registration.sync) {
      try {
        await self.registration.sync.register("flare-upload");
      } catch {
        /* sync is not available in every browser */
      }
    }
  })());
});
