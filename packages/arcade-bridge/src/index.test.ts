import { afterEach, describe, expect, it, vi } from "vitest"
import { connectArcadeHost, DEFAULT_ARCADE_CONTEXT, parseArcadeContext } from "./index"

afterEach(() => vi.unstubAllGlobals())

describe("arcade context validation", () => {
  it("copies a complete palette without retaining a sender's mutable array", () => {
    const input = structuredClone(DEFAULT_ARCADE_CONTEXT)
    const result = parseArcadeContext(input)!
    input.palette.bricks = [1, 2, 3, 4, 5]
    expect(result.palette.bricks).toEqual(DEFAULT_ARCADE_CONTEXT.palette.bricks)
  })
  it.each([
    { ...DEFAULT_ARCADE_CONTEXT, theme: "theme-one" },
    { ...DEFAULT_ARCADE_CONTEXT, locale: "unknown" },
    { ...DEFAULT_ARCADE_CONTEXT, palette: { ...DEFAULT_ARCADE_CONTEXT.palette, canvas: -1 } },
    { ...DEFAULT_ARCADE_CONTEXT, palette: { ...DEFAULT_ARCADE_CONTEXT.palette, accent: 0x1000000 } },
    { ...DEFAULT_ARCADE_CONTEXT, palette: { ...DEFAULT_ARCADE_CONTEXT.palette, bricks: [1] } },
  ])("rejects an unsupported theme, locale, or invalid palette", value => {
    expect(parseArcadeContext(value)).toBeNull()
  })
})

function fixture() {
  const doc = Object.assign(new EventTarget(), {
    hidden: false,
    documentElement: { dataset: {} as Record<string, string>, lang: "", style: { setProperty: vi.fn() } },
  })
  const parent = { postMessage: vi.fn() }
  const win = Object.assign(new EventTarget(), { parent, location: { origin: "https://xm.example" } })
  vi.stubGlobal("window", win)
  vi.stubGlobal("document", doc)
  const paused = vi.fn()
  const changed = vi.fn()
  const bridge = connectArcadeHost({ gameId: "galaga", onPause: paused, onContext: changed, getState: () => ({ score: 12 }) })
  const message = (data: object, origin = win.location.origin, source: object = parent) => {
    const event = new Event("message")
    Object.defineProperties(event, { data: { value: { channel: "xm-arcade", gameId: "galaga", ...data } }, origin: { value: origin }, source: { value: source } })
    win.dispatchEvent(event)
  }
  return { doc, win, parent, bridge, message, paused, changed }
}

describe("isolated game lifecycle", () => {
  it("answers readiness and applies context only from the same-origin parent and matching game", async () => {
    const f = fixture()
    await Promise.resolve()
    f.bridge.ready()
    expect(f.parent.postMessage).toHaveBeenCalledWith({ channel: "xm-arcade", gameId: "galaga", type: "ready" }, "https://xm.example")
    const context = { type: "context", ...DEFAULT_ARCADE_CONTEXT, theme: "theme-three" }
    f.message(context, "https://other.example")
    f.message(context, undefined, {})
    f.message({ ...context, gameId: "radius-raid" })
    expect(f.doc.documentElement.dataset.theme).toBe("theme-pocket")
    f.message(context)
    expect(f.doc.documentElement.dataset.theme).toBe("theme-three")
    expect(window.xmArcadeState).toMatchObject({ gameId: "galaga", ready: true, theme: "theme-three", score: 12 })
    f.bridge.dispose()
  })
  it("does not resume a game until both the host and document are visible", async () => {
    const f = fixture()
    await Promise.resolve()
    f.bridge.ready()
    f.message({ type: "pause", paused: true })
    f.doc.hidden = true
    f.doc.dispatchEvent(new Event("visibilitychange"))
    f.message({ type: "pause", paused: false })
    expect(window.xmArcadeState?.paused).toBe(true)
    f.doc.hidden = false
    f.doc.dispatchEvent(new Event("visibilitychange"))
    expect(f.paused.mock.calls.map(([value]) => value)).toEqual([false, true, false])
    f.win.dispatchEvent(new Event("pagehide"))
    expect(window.xmArcadeState?.paused).toBe(true)
    f.win.dispatchEvent(new Event("pageshow"))
    expect(window.xmArcadeState?.paused).toBe(false)
    f.bridge.dispose()
  })
  it("pauses on disposal and ignores subsequent host messages", async () => {
    const f = fixture()
    await Promise.resolve()
    f.bridge.ready()
    f.bridge.dispose()
    f.message({ type: "pause", paused: false })
    f.message({ type: "context", ...DEFAULT_ARCADE_CONTEXT, theme: "theme-three" })
    expect(f.paused).toHaveBeenLastCalledWith(true)
    expect(window.xmArcadeState).toMatchObject({ ready: false, paused: true, theme: "theme-pocket" })
  })
})
