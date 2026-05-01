// public/sw.js — DG HelpMate Service Worker (Fixed)
const CACHE_NAME = "dghelpmate-v1";
const OFFLINE_URL = "/";

const STATIC_ASSETS = [
  "/",
  "/images/logo.png",
  "/images/govardhan.jpg",
  "/manifest.json",
];

// ── Install ──────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets");
      // Individual fetch so one failure doesn't break all
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(e => console.warn("[SW] Cache skip:", url)))
      );
    })
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch — FIX: response clone karo pehle ───────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // External services — bypass karo
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("razorpay") ||
    url.hostname.includes("youtube") ||
    url.hostname.includes("youtu.be") ||
    url.hostname.includes("firestore") ||
    request.method !== "GET"  // Only GET cache karo
  ) {
    return; // SW bypass — normal network request
  }

  // HTML navigate — network first, offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Images — cache first, network fallback
  if (request.destination === "image") {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        // ✅ FIX: response aane ke baad clone karo, phir cache mein daalo
        return fetch(request).then((response) => {
          if (!response || response.status !== 200) return response;
          const toCache = response.clone(); // ← pehle clone
          caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
          return response; // ← original return
        }).catch(() => caches.match(OFFLINE_URL));
      })
    );
    return;
  }

  // JS/CSS — stale while revalidate
  if (request.destination === "script" || request.destination === "style") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (!response || response.status !== 200) return response;
          const toCache = response.clone(); // ← pehle clone
          caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
          return response;
        });
        return cached || networkFetch;
      })
    );
    return;
  }
});

// ── Push Notifications ────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || "DG HelpMate", {
    body: data.body || "",
    icon: "/images/logo.png",
    badge: "/images/logo.png",
    tag: data.tag || "dghelpmate",
    data: { url: data.url || "/" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});