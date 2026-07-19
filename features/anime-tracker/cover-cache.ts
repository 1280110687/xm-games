export const ANIME_COVER_CACHE_NAME = "xm-games-anime-covers-v1"
const ANIME_COVER_DB_NAME = "xm-games-anime-covers"
const ANIME_COVER_STORE_NAME = "covers"

/**
 * Native shells can register an implementation backed by their filesystem or
 * HTTP client. Returning null lets the browser CORS downloader run as a
 * best-effort fallback.
 */
export interface CoverDownloadAdapter {
  download(url: string, signal?: AbortSignal): Promise<Blob | null>
}

let registeredDownloadAdapter: CoverDownloadAdapter | null = null

export function registerCoverDownloadAdapter(
  adapter: CoverDownloadAdapter,
): () => void {
  const previous = registeredDownloadAdapter
  registeredDownloadAdapter = adapter
  return () => {
    if (registeredDownloadAdapter === adapter) {
      registeredDownloadAdapter = previous
    }
  }
}

export interface CoverCacheEnvironment {
  cacheStorage?: CacheStorage | null
  indexedDb?: IDBFactory | null
  fetcher?: typeof fetch
  downloadAdapter?: CoverDownloadAdapter | null
}

function getCacheStorage(environment?: CoverCacheEnvironment): CacheStorage | null {
  if (environment && "cacheStorage" in environment) {
    return environment.cacheStorage ?? null
  }
  return typeof caches === "undefined" ? null : caches
}

function getIndexedDb(environment?: CoverCacheEnvironment): IDBFactory | null {
  if (environment && "indexedDb" in environment) {
    return environment.indexedDb ?? null
  }
  return typeof indexedDB === "undefined" ? null : indexedDB
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(ANIME_COVER_DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(ANIME_COVER_STORE_NAME)) {
        request.result.createObjectStore(ANIME_COVER_STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readIndexedDbBlob(
  url: string,
  factory: IDBFactory,
): Promise<Blob | null> {
  const database = await openDatabase(factory)
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(ANIME_COVER_STORE_NAME, "readonly")
      const request = transaction.objectStore(ANIME_COVER_STORE_NAME).get(url)
      request.onsuccess = () =>
        resolve(request.result instanceof Blob ? request.result : null)
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

async function writeIndexedDbBlob(
  url: string,
  blob: Blob,
  factory: IDBFactory,
): Promise<boolean> {
  const database = await openDatabase(factory)
  try {
    return await new Promise((resolve) => {
      const transaction = database.transaction(ANIME_COVER_STORE_NAME, "readwrite")
      transaction.objectStore(ANIME_COVER_STORE_NAME).put(blob, url)
      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => resolve(false)
      transaction.onabort = () => resolve(false)
    })
  } finally {
    database.close()
  }
}

export function isCacheableCoverUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function isKnownBrowserCorsBlockedCoverUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "lain.bgm.tv"
  } catch {
    return false
  }
}

export async function readCachedCoverBlob(
  url: string,
  environment?: CoverCacheEnvironment,
): Promise<Blob | null> {
  if (!isCacheableCoverUrl(url)) return null

  const cacheStorage = getCacheStorage(environment)
  if (cacheStorage) {
    try {
      const cache = await cacheStorage.open(ANIME_COVER_CACHE_NAME)
      const response = await cache.match(url)
      if (response) {
        const blob = await response.blob()
        if (blob.size > 0) return blob
      }
    } catch {
      // IndexedDB remains available as a fallback in many packaged WebViews.
    }
  }

  const factory = getIndexedDb(environment)
  if (!factory) return null
  try {
    return await readIndexedDbBlob(url, factory)
  } catch {
    return null
  }
}

export async function cacheCoverImage(
  url: string,
  environment?: CoverCacheEnvironment,
  signal?: AbortSignal,
): Promise<boolean> {
  if (!isCacheableCoverUrl(url)) return false
  if (await readCachedCoverBlob(url, environment)) return true

  const fetcher = environment?.fetcher ?? fetch
  const adapter =
    environment && "downloadAdapter" in environment
      ? environment.downloadAdapter
      : registeredDownloadAdapter
  let blob: Blob | null = null

  if (adapter) {
    try {
      blob = await adapter.download(url, signal)
      if (blob && blob.size === 0) blob = null
    } catch {
      if (signal?.aborted) return false
      // Fall back to the browser downloader when a native adapter declines or
      // temporarily fails to download a cover.
    }
  }

  if (!blob) {
    // Bangumi's public cover CDN currently allows normal <img> display but
    // does not opt in to browser CORS downloads. Avoid a guaranteed noisy
    // request here; a packaged app's native adapter above can still persist it.
    if (!environment?.fetcher && isKnownBrowserCorsBlockedCoverUrl(url)) {
      return false
    }
    try {
      const response = await fetcher(url, {
        cache: "force-cache",
        mode: "cors",
        signal,
      })
      if (!response.ok || response.type === "opaque") return false
      blob = await response.blob()
      if (blob.size === 0) return false
    } catch {
      // Some cover CDNs do not opt in to CORS. The original remote URL remains
      // usable online and the legacy imageUrl field is never rewritten.
      return false
    }
  }

  const cacheStorage = getCacheStorage(environment)
  if (cacheStorage) {
    try {
      const cache = await cacheStorage.open(ANIME_COVER_CACHE_NAME)
      await cache.put(
        url,
        new Response(blob, {
          headers: { "Content-Type": blob.type || "application/octet-stream" },
        }),
      )
      return true
    } catch {
      // Fall through to IndexedDB for WebViews without Cache Storage support.
    }
  }

  const factory = getIndexedDb(environment)
  if (!factory) return false
  try {
    return await writeIndexedDbBlob(url, blob, factory)
  } catch {
    return false
  }
}
