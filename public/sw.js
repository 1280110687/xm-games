const CACHE_VERSION = "v1"
const SHELL_CACHE = `xm-games-shell-${CACHE_VERSION}`
const RUNTIME_CACHE = `xm-games-runtime-${CACHE_VERSION}`
const OWNED_CACHE_PREFIX = "xm-games-"

const APP_SHELL = [
  "/",
  "/gomoku",
  "/manifest.webmanifest",
  "/icon.svg",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/pwa-icon-maskable-512.png",
]

const SENSITIVE_SEARCH_PATTERN =
  /(?:sdp|ice|candidate|token|credential|offer|answer)/i

function isSensitiveRequest(request, url) {
  if (url.pathname.startsWith("/api/")) return true
  if (url.search && SENSITIVE_SEARCH_PATTERN.test(url.search)) return true
  if (request.headers.has("authorization")) return true
  if (request.headers.has("rsc")) return true
  if (request.headers.has("next-router-prefetch")) return true
  return false
}

function canCacheResponse(response) {
  return response.ok && (response.type === "basic" || response.type === "default")
}

async function updateCache(cacheName, request, response) {
  if (!canCacheResponse(response)) return
  const cache = await caches.open(cacheName)
  await cache.put(request, response.clone())
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request)
    await updateCache(RUNTIME_CACHE, request, response)
    return response
  } catch {
    return (
      (await caches.match(request)) ??
      (await caches.match("/gomoku")) ??
      (await caches.match("/")) ??
      Response.error()
    )
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  await updateCache(RUNTIME_CACHE, request, response)
  return response
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(OWNED_CACHE_PREFIX) &&
                cacheName !== SHELL_CACHE &&
                cacheName !== RUNTIME_CACHE,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (isSensitiveRequest(request, url)) return

  if (request.mode === "navigate") {
    if (url.search) return
    event.respondWith(networkFirstNavigation(request))
    return
  }

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    ["font", "image", "script", "style"].includes(request.destination)

  if (isStaticAsset) {
    event.respondWith(cacheFirst(request))
  }
})
