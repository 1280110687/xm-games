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
    request(range?: string) {
      let response: Promise<Response> | undefined
      handlers.fetch({
        request: new Request("https://host.test/theme-four-experience/sounds/test.mp3", {
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
