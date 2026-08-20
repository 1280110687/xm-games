const CACHE_VERSION = "v13"
const SHELL_CACHE = `xm-games-shell-${CACHE_VERSION}`
const RUNTIME_CACHE = `xm-games-runtime-${CACHE_VERSION}`
const OWNED_CACHE_PREFIX = "xm-games-"
const OFFLINE_ASSET_MANIFEST = "/offline-assets.json"

// Keep this list aligned with every non-API app/**/page.tsx route. The test in
// app/manifest.test.ts protects future pages from being omitted accidentally.
const APP_ROUTES = [
  "/",
  "/2048",
  "/alternating-trail",
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
  OFFLINE_ASSET_MANIFEST,
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
const OFFLINE_WARM_CONCURRENCY = 2

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

async function fetchAndCacheIfMissing(cache, resource) {
  const request =
    resource instanceof Request
      ? resource
      : createSameOriginRequest(resource)
  const cached = await cache.match(request)
  return cached ?? fetchAndCache(cache, request)
}

async function mapWithConcurrency(items, concurrency, task) {
  let nextIndex = 0
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex]
        nextIndex += 1
        await task(item)
      }
    },
  )

  await Promise.all(workers)
}

async function precacheCoreShell() {
  const cache = await caches.open(SHELL_CACHE)
  const homeResponse = await fetchAndCacheIfMissing(cache, "/")
  const contentType = homeResponse.headers.get("content-type") ?? ""
  const homeHtml = contentType.includes("text/html")
    ? await homeResponse.text()
    : ""

  await mapWithConcurrency(
    STATIC_SHELL,
    OFFLINE_WARM_CONCURRENCY,
    (resource) => fetchAndCacheIfMissing(cache, resource),
  )
  await mapWithConcurrency(
    [...extractNextStaticResources(homeHtml)],
    OFFLINE_WARM_CONCURRENCY,
    (resource) => fetchAndCacheIfMissing(cache, resource),
  )
}

async function warmApplicationShell() {
  await precacheCoreShell()
  const cache = await caches.open(SHELL_CACHE)
  const nextStaticResources = new Set()
  const failures = []

  // Full offline coverage is prepared after the page is interactive. Keeping
  // this work out of install prevents dozens of route and chunk requests from
  // competing with hydration on a cold load.
  await mapWithConcurrency(
    APP_ROUTES.filter((route) => route !== "/"),
    OFFLINE_WARM_CONCURRENCY,
    async (route) => {
      try {
        const response = await fetchAndCacheIfMissing(cache, route)
        const contentType = response.headers.get("content-type") ?? ""
        if (!contentType.includes("text/html")) return

        const html = await response.text()
        for (const resource of extractNextStaticResources(html)) {
          nextStaticResources.add(resource)
        }
      } catch (error) {
        failures.push({ resource: route, error })
      }
    },
  )

  await mapWithConcurrency(
    [...nextStaticResources],
    OFFLINE_WARM_CONCURRENCY,
    async (resource) => {
      try {
        await fetchAndCacheIfMissing(cache, resource)
      } catch (error) {
        failures.push({ resource, error })
      }
    },
  )

  if (failures.length > 0) {
    throw new Error(
      `Unable to prepare ${failures.length} core offline resources: ${failures
        .slice(0, 3)
        .map(({ resource }) => resource)
        .join(", ")}`,
    )
  }

  return {
    scope: "core",
    routeCount: APP_ROUTES.length,
    resourceCount: (await cache.keys()).length,
  }
}

async function readOfflineAssetManifest(cache) {
  const response = await fetchAndCacheIfMissing(cache, OFFLINE_ASSET_MANIFEST)
  const manifest = await response.clone().json()

  if (
    manifest?.version !== 1 ||
    !Array.isArray(manifest.assets) ||
    manifest.assets.some(
      (asset) => typeof asset !== "string" || !asset.startsWith("/"),
    )
  ) {
    throw new Error("Offline asset manifest is invalid.")
  }

  return manifest.assets
}

async function warmFullOfflinePackage() {
  await warmApplicationShell()
  const cache = await caches.open(SHELL_CACHE)
  const offlineAssets = await readOfflineAssetManifest(cache)
  const failures = []

  await mapWithConcurrency(
    offlineAssets,
    OFFLINE_WARM_CONCURRENCY,
    async (resource) => {
      try {
        await fetchAndCacheIfMissing(cache, resource)
      } catch (error) {
        failures.push({ resource, error })
      }
    },
  )

  if (failures.length > 0) {
    throw new Error(
      `Unable to prepare ${failures.length} full offline resources: ${failures
        .slice(0, 3)
        .map(({ resource }) => resource)
        .join(", ")}`,
    )
  }

  return {
    scope: "full",
    routeCount: APP_ROUTES.length,
    resourceCount: (await cache.keys()).length,
  }
}

let corePreparation
let fullPreparation

function prepareOfflinePackage(scope) {
  if (scope === "full") {
    if (!fullPreparation) {
      fullPreparation = Promise.resolve(corePreparation)
        .catch(() => undefined)
        .then(() => warmFullOfflinePackage())
        .catch((error) => {
          fullPreparation = undefined
          throw error
        })
    }
    return fullPreparation
  }

  if (fullPreparation) return fullPreparation
  if (!corePreparation) {
    corePreparation = warmApplicationShell().catch((error) => {
      corePreparation = undefined
      throw error
    })
  }
  return corePreparation
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
  const exactMatch = await matchCachedNavigation(request)
  if (exactMatch) return exactMatch

  return (
    (await matchCurrentCaches(createSameOriginRequest("/"), true)) ??
    Response.error()
  )
}

async function matchCachedNavigation(request) {
  const exactMatch = await matchCurrentCaches(request, true)
  if (exactMatch) return exactMatch

  const url = new URL(request.url)
  if (!url.search) return undefined

  return matchCurrentCaches(createSameOriginRequest(url.pathname), true)
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

async function cachedFirstNavigation(request, event) {
  const cached = await matchCachedNavigation(request)
  if (!cached) return networkFirstNavigation(request)

  event.waitUntil(
    fetchNavigation(request)
      .then((response) => updateCache(RUNTIME_CACHE, request, response))
      .catch(() => undefined),
  )
  return cached
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
  // A worker is not install-ready until every app route and its Next.js chunks
  // can open offline. Heavy Theme Four assets are still prepared separately.
  event.waitUntil(warmApplicationShell())
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting())
    return
  }

  if (event.data?.type === "WARM_OFFLINE_CACHE") {
    event.waitUntil(
      prepareOfflinePackage("core").catch((error) => {
        console.warn("[pwa] Core offline cache preparation failed:", error)
      }),
    )
    return
  }

  if (event.data?.type === "PREPARE_OFFLINE_PACKAGE") {
    const scope = event.data.scope === "full" ? "full" : "core"
    const replyPort = event.ports[0]

    event.waitUntil(
      prepareOfflinePackage(scope)
        .then((result) => {
          replyPort?.postMessage({ type: "OFFLINE_PACKAGE_READY", ...result })
        })
        .catch((error) => {
          replyPort?.postMessage({
            type: "OFFLINE_PACKAGE_ERROR",
            message: error instanceof Error ? error.message : String(error),
          })
        }),
    )
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
    event.respondWith(cachedFirstNavigation(request, event))
    return
  }

  const isStaticAsset =
    STATIC_SHELL.includes(url.pathname) ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/theme-four-experience/") ||
    url.pathname.startsWith("/theme-four/") ||
    ["audio", "font", "image", "script", "style", "video", "worker"].includes(
      request.destination,
    )

  if (isStaticAsset) {
    event.respondWith(cacheFirst(request))
  }
})
