import { describe, expect, it, vi } from "vitest"

import {
  cacheCoverImage,
  readCachedCoverBlob,
  registerCoverDownloadAdapter,
  type CoverCacheEnvironment,
} from "./cover-cache"

class MemoryCache {
  readonly values = new Map<string, Response>()

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    const key = request instanceof Request ? request.url : String(request)
    return this.values.get(key)?.clone()
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    const key = request instanceof Request ? request.url : String(request)
    this.values.set(key, response.clone())
  }
}

describe("anime cover cache", () => {
  it("persists a fetched Blob and reads it again without network access", async () => {
    const cache = new MemoryCache()
    const fetcher = vi.fn().mockResolvedValue(
      new Response(new Blob(["cover-bytes"], { type: "image/jpeg" }), {
        status: 200,
      }),
    )
    const environment: CoverCacheEnvironment = {
      cacheStorage: {
        open: vi.fn().mockResolvedValue(cache),
      } as unknown as CacheStorage,
      indexedDb: null,
      fetcher,
    }
    const url = "https://example.com/cover.jpg"

    expect(await cacheCoverImage(url, environment)).toBe(true)
    const cached = await readCachedCoverBlob(url, {
      ...environment,
      fetcher: vi.fn().mockRejectedValue(new Error("offline")),
    })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(cached?.size).toBeGreaterThan(0)
    expect(cached?.type).toBe("image/jpeg")
  })

  it("leaves non-CORS or failed cover requests untouched", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    const environment: CoverCacheEnvironment = {
      cacheStorage: null,
      indexedDb: null,
      fetcher,
    }

    expect(
      await cacheCoverImage("https://example.com/no-cors.jpg", environment),
    ).toBe(false)
  })

  it("lets a packaged app inject a native cover downloader", async () => {
    const cache = new MemoryCache()
    const download = vi.fn().mockResolvedValue(
      new Blob(["native-cover"], { type: "image/jpeg" }),
    )
    const unregister = registerCoverDownloadAdapter({ download })
    const fetcher = vi.fn().mockRejectedValue(new TypeError("CORS blocked"))
    const environment: CoverCacheEnvironment = {
      cacheStorage: {
        open: vi.fn().mockResolvedValue(cache),
      } as unknown as CacheStorage,
      indexedDb: null,
      fetcher,
    }
    const url = "https://lain.bgm.tv/non-cors.jpg"

    try {
      expect(await cacheCoverImage(url, environment)).toBe(true)
      expect(download).toHaveBeenCalledWith(url, undefined)
      expect(fetcher).not.toHaveBeenCalled()
      expect((await readCachedCoverBlob(url, environment))?.size).toBeGreaterThan(0)
    } finally {
      unregister()
    }
  })

  it("does not issue a guaranteed-failing browser fetch for Bangumi covers", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("CORS blocked"))
    vi.stubGlobal("fetch", fetcher)

    try {
      expect(
        await cacheCoverImage("https://lain.bgm.tv/pic/cover/l/example.jpg", {
          cacheStorage: null,
          indexedDb: null,
        }),
      ).toBe(false)
      expect(fetcher).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
