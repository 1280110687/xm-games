const CACHE_VERSION = "v5"
const SHELL_CACHE = `xm-games-shell-${CACHE_VERSION}`
const RUNTIME_CACHE = `xm-games-runtime-${CACHE_VERSION}`
const OWNED_CACHE_PREFIX = "xm-games-"

// Keep this list aligned with every non-API app/**/page.tsx route. The test in
// app/manifest.test.ts protects future pages from being omitted accidentally.
const APP_ROUTES = [
  "/",
  "/2048",
  "/anime-tracker",
  "/base64-tool",
  "/bingo",
  "/bingo-cards",
  "/chess",
  "/chinese-chess",
  "/go",
  "/gomoku",
  "/json-tool",
  "/memory-match",
  "/minesweeper",
  "/neon-breaker",
  "/qr-code",
  "/reversi",
  "/schulte-grid",
  "/settings",
  "/snake",
  "/sudoku",
  "/tetris",
  "/text-crypto",
  "/text-tool",
]

const STATIC_SHELL = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/apple-touch-icon.png",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/pwa-icon-maskable-512.png",
]

const SENSITIVE_SEARCH_PATTERN =
  /(?:sdp|ice|candidate|token|credential|offer|answer)/i
const NEXT_STATIC_PATTERN = /\/_next\/static\/[^"'\\\s<>()]+/g
const NAVIGATION_TIMEOUT_MS = 4_000

function isSensitiveRequest(request, url) {
  if (url.pathname.startsWith("/api/")) return true
  if (url.search && SENSITIVE_SEARCH_PATTERN.test(url.search)) return true
  if (request.headers.has("authorization")) return true
  if (request.headers.has("rsc")) return true
  if (request.headers.has("next-router-prefetch")) return true
  return false
}

function canCacheResponse(response) {
  const cacheControl = response.headers.get("cache-control") ?? ""
  return (
    response.ok &&
    (response.type === "basic" || response.type === "default") &&
    !/(?:^|,)\s*(?:private|no-store)\b/i.test(cacheControl)
  )
}

function createSameOriginRequest(resource) {
  const url = new URL(resource, self.location.origin)
  return new Request(url.href, { credentials: "same-origin" })
}

function extractNextStaticResources(html) {
  const resources = new Set()

  for (const match of html.matchAll(NEXT_STATIC_PATTERN)) {
    const rawPath = match[0].replaceAll("&amp;", "&")
    const url = new URL(rawPath, self.location.origin)

    if (
      url.origin === self.location.origin &&
      url.pathname.startsWith("/_next/static/")
    ) {
      resources.add(`${url.pathname}${url.search}`)
    }
  }

  return resources
}

async function fetchAndCache(cache, resource) {
  const request =
    resource instanceof Request
      ? resource
      : createSameOriginRequest(resource)
  const response = await fetch(request)

  if (!canCacheResponse(response)) {
    throw new Error(`Unable to precache ${request.url}: ${response.status}`)
  }

  await cache.put(request, response.clone())
  return response
}

async function precacheApplicationShell() {
  const cache = await caches.open(SHELL_CACHE)
  const nextStaticResources = new Set()

  // Fetching every route document lets the worker discover the exact hashed
  // Next.js CSS, JavaScript, font and media URLs emitted by this deployment.
  const routeDocuments = await Promise.all(
    APP_ROUTES.map(async (route) => {
      const response = await fetchAndCache(cache, route)
      const contentType = response.headers.get("content-type") ?? ""
      return contentType.includes("text/html") ? response.text() : ""
    }),
  )

  for (const html of routeDocuments) {
    for (const resource of extractNextStaticResources(html)) {
      nextStaticResources.add(resource)
    }
  }

  await Promise.all(
    STATIC_SHELL.map((resource) => fetchAndCache(cache, resource)),
  )
  await Promise.all(
    [...nextStaticResources].map((resource) => fetchAndCache(cache, resource)),
  )
}

async function updateCache(cacheName, request, response) {
  if (!canCacheResponse(response)) return
  const cache = await caches.open(cacheName)
  await cache.put(request, response.clone())
}

async function matchCurrentCaches(request, runtimeFirst = false) {
  const [shellCache, runtimeCache] = await Promise.all([
    caches.open(SHELL_CACHE),
    caches.open(RUNTIME_CACHE),
  ])
  const cachesInOrder = runtimeFirst
    ? [runtimeCache, shellCache]
    : [shellCache, runtimeCache]

  for (const cache of cachesInOrder) {
    const response = await cache.match(request)
    if (response) return response
  }

  return undefined
}

async function offlineNavigationFallback(request) {
  const exactMatch = await matchCurrentCaches(request, true)
  if (exactMatch) return exactMatch

  const url = new URL(request.url)
  if (url.search) {
    const routeMatch = await matchCurrentCaches(
      createSameOriginRequest(url.pathname),
      true,
    )
    if (routeMatch) return routeMatch
  }

  return (
    (await matchCurrentCaches(createSameOriginRequest("/"), true)) ??
    Response.error()
  )
}

async function fetchNavigation(request) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT_MS)

  try {
    return await fetch(request, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetchNavigation(request)
    await updateCache(RUNTIME_CACHE, request, response)
    return response
  } catch {
    return offlineNavigationFallback(request)
  }
}

async function cacheFirst(request) {
  const cached = await matchCurrentCaches(request)
  if (cached) return cached

  const response = await fetch(request)
  await updateCache(RUNTIME_CACHE, request, response)
  return response
}

self.addEventListener("install", (event) => {
  // Do not call skipWaiting here. An update must stay waiting until existing
  // tabs using the previous Next.js chunks have closed or accepted an update.
  event.waitUntil(precacheApplicationShell())
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting())
  }
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
