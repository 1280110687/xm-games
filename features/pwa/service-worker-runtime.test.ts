import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"

function worker(cached?: Response, network = new Response("network")) {
  const put = vi.fn(async (_request, response: Response) => {
    if (response.status === 206) throw new TypeError("Response is a 206 partial")
  })
  const fetch = vi.fn(async () => network)
  const handlers: Record<string, (event: unknown) => void> = {}
  const context = {
    Request, Response, Headers, URL, Blob, AbortController, setTimeout, clearTimeout,
    fetch,
    caches: { open: async () => ({ match: async () => cached?.clone(), put }) },
    self: { location: { origin: "https://host.test" }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler } },
  }
  runInNewContext(readFileSync("public/sw.js", "utf8"), context)
  return {
    fetch, put,
    request(range?: string, pathname = "/theme-four-experience/sounds/test.mp3") {
      let response: Promise<Response> | undefined
      handlers.fetch({
        request: new Request(`https://host.test${pathname}`, {
          headers: range ? { Range: range } : {},
        }),
        respondWith(value: Promise<Response>) { response = value },
      })
      return response!
    },
  }
}

describe("PWA media range responses", () => {
  it("passes network partial responses through without trying to cache them", async () => {
    const runtime = worker(undefined, new Response("ab", { status: 206 }))
    expect((await runtime.request("bytes=0-1")).status).toBe(206)
    expect(runtime.put).not.toHaveBeenCalled()
  })

  it.each([
    ["bytes=0-1", "ab", "bytes 0-1/6"],
    ["bytes=2-", "cdef", "bytes 2-5/6"],
    ["bytes=-2", "ef", "bytes 4-5/6"],
    ["bytes=3-99", "def", "bytes 3-5/6"],
  ])("serves %s from the complete offline file", async (range, body, contentRange) => {
    const runtime = worker(new Response("abcdef", { headers: { "Content-Type": "audio/mpeg" } }))
    const response = await runtime.request(range)
    expect(response.status).toBe(206)
    expect(response.headers.get("Content-Range")).toBe(contentRange)
    expect(response.headers.get("Content-Length")).toBe(String(body.length))
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg")
    expect(await response.text()).toBe(body)
    expect(runtime.fetch).not.toHaveBeenCalled()
  })

  it.each(["bytes=6-", "bytes=4-2", "bytes=-0"])("rejects unsatisfiable %s", async (range) => {
    const response = await worker(new Response("abcdef")).request(range)
    expect(response.status).toBe(416)
    expect(response.headers.get("Content-Range")).toBe("bytes */6")
  })

  it("ignores unsupported multiple ranges and returns the complete cached file", async () => {
    const response = await worker(new Response("abcdef")).request("bytes=0-1,4-5")
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("abcdef")
  })
})

describe("self-hosted game offline resources", () => {
  it.each(["/billiards-game/worker.js", "/billiards-game/source.tar.gz", "/arcade-games/galaga/game.js", "/arcade-games/deep-field/index.html", "/licenses/oh-hi.txt"])(
    "serves %s from cache even when fetch() has no destination", async (pathname) => {
      const runtime = worker(new Response("offline resource"))
      expect(await (await runtime.request(undefined, pathname)).text()).toBe("offline resource")
      expect(runtime.fetch).not.toHaveBeenCalled()
    },
  )

  it("caches a first successful local game asset for later offline use", async () => {
    const runtime = worker(undefined, new Response("game worker"))
    expect(await (await runtime.request(undefined, "/billiards-game/worker.js")).text()).toBe("game worker")
    expect(runtime.put).toHaveBeenCalledOnce()
  })
})

function offlinePreparation(css: string, cachedStylesheet = false, fontStatus = 200) {
  const origin = "https://host.test"
  const stylesheet = `${origin}/_next/static/chunks/app.css`
  const entries = new Map<string, Response>()
  if (cachedStylesheet) entries.set(stylesheet, new Response(css, { headers: { "Content-Type": "text/css" } }))
  const fetch = vi.fn(async (request: Request) => {
    const url = new URL(request.url)
    if (url.pathname === "/offline-assets.json") return Response.json({ version: 1, assets: [] })
    if (request.url === stylesheet) return new Response(css, { headers: { "Content-Type": "text/css" } })
    if (url.pathname.endsWith(".woff2")) return new Response("font", { status: fontStatus })
    return new Response('<link rel="stylesheet" href="/_next/static/chunks/app.css">', { headers: { "Content-Type": "text/html" } })
  })
  const handlers: Record<string, (event: unknown) => void> = {}
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    Request, Response, Headers, URL, Blob, AbortController, setTimeout, clearTimeout, fetch,
    caches: { open: async () => ({
      match: async (request: Request) => entries.get(request.url)?.clone(),
      put: async (request: Request, response: Response) => { entries.set(request.url, response.clone()) },
      keys: async () => [...entries.keys()].map(url => new Request(url)),
    }) },
    self: { location: { origin }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler } },
  })
  return {
    entries, fetch,
    async prepare() {
      let completion: Promise<unknown> | undefined
      const replies: { type: string; message?: string }[] = []
      handlers.message({
        data: { type: "PREPARE_OFFLINE_PACKAGE", scope: "full" },
        ports: [{ postMessage: (reply: { type: string; message?: string }) => replies.push(reply) }],
        waitUntil(value: Promise<unknown>) { completion = value },
      })
      await completion
      return replies
    },
  }
}

describe("offline Next stylesheet font dependencies", () => {
  const font = "/_next/static/media/797e433ab948586e-s.0r6juujl39pe6.woff2"
  const css = '@font-face{font-family:Geist Mono;src:url(../media/797e433ab948586e-s.0r6juujl39pe6.woff2)format("woff2")}'

  it.each([false, true])("prepares CSS-relative fonts when the stylesheet was cached: %s", async (cached) => {
    const runtime = offlinePreparation(css, cached)
    expect(await runtime.prepare()).toEqual([expect.objectContaining({ type: "OFFLINE_PACKAGE_READY" })])
    expect(runtime.entries.has(`https://host.test${font}`)).toBe(true)
    expect(runtime.fetch.mock.calls.filter(([request]) => new URL(request.url).pathname === font)).toHaveLength(1)
  })

  it("resolves quoted font URLs without fetching external or non-Next dependencies", async () => {
    const runtime = offlinePreparation(`
      @font-face{src:url("../media/first.woff2"),url('../media/second.woff2')}
      @font-face{src:url(https://other.test/_next/static/media/external.woff2)}
      @font-face{src:url(//other.test/_next/static/media/protocol-relative.woff2)}
      @font-face{src:url(/api/private.woff2),url(../../../private.woff2),url(data:font/woff2;base64,AAAA)}
      .icon{background:url(../media/icon.png)}
    `)
    await runtime.prepare()
    expect([...runtime.entries.keys()].filter(url => url.endsWith(".woff2"))).toEqual([
      "https://host.test/_next/static/media/first.woff2",
      "https://host.test/_next/static/media/second.woff2",
    ])
    expect(runtime.fetch.mock.calls.every(([request]) => new URL(request.url).origin === "https://host.test")).toBe(true)
  })

  it("reports incomplete offline preparation if a required font cannot be cached", async () => {
    const runtime = offlinePreparation(css, false, 404)
    expect(await runtime.prepare()).toEqual([expect.objectContaining({ type: "OFFLINE_PACKAGE_ERROR" })])
    expect(runtime.entries.has(`https://host.test${font}`)).toBe(false)
  })
})
