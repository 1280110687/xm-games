import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_GAME_RENDER_PALETTE } from "../../lib/game-render-palette"

const pixi = vi.hoisted(() => ({ applications: [] as MockApplication[] }))

interface MockApplication {
  canvas: { style: { touchAction?: string } }
  renderer: { background: { color: number } }
  ticker: { started: boolean; advance: () => void }
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

vi.mock("pixi.js", () => {
  class Container {
    visible = true
    children: Container[] = []
    position = { set: vi.fn() }
    scale = { set: vi.fn() }
    pivot = { set: vi.fn() }
    addChild(...children: Container[]) { this.children.push(...children) }
  }
  class Graphics extends Container {
    clear() { return this }
    rect() { return this }
    roundRect() { return this }
    circle() { return this }
    fill() { return this }
    stroke() { return this }
    moveTo() { return this }
    lineTo() { return this }
    on() { return this }
    off() { return this }
  }
  class Application {
    canvas = { style: {}, setAttribute: vi.fn() }
    stage = new Container()
    renderer = { background: { color: 0 }, resize: vi.fn() }
    tick: ((ticker: { deltaMS: number }) => void) | undefined
    ticker = {
      started: false,
      add: (callback: typeof this.tick) => { this.tick = callback },
      remove: vi.fn(),
      advance: () => this.tick?.({ deltaMS: 1000 / 60 }),
    }
    init = vi.fn(async (options: { background: number }) => { this.renderer.background.color = options.background })
    render = vi.fn()
    start = vi.fn(() => { this.ticker.started = true })
    stop = vi.fn(() => { this.ticker.started = false })
    destroy = vi.fn()
    constructor() { pixi.applications.push(this) }
  }
  return { Application, Container, Graphics, Rectangle: class {}, UPDATE_PRIORITY: { HIGH: 50 } }
})

import { createNeonBreakerScene, type NeonBreakerSnapshot } from "./pixi-scene"

beforeEach(() => {
  pixi.applications.length = 0
  vi.stubGlobal("window", { devicePixelRatio: 1, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  vi.stubGlobal("document", { visibilityState: "visible", addEventListener: vi.fn(), removeEventListener: vi.fn() })
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("live Pixi theme changes", () => {
  it("recolors the existing canvas and keeps an earned score, bricks, phase and ticker intact", async () => {
    const host = {
      clientWidth: 390,
      clientHeight: 640,
      replaceChildren: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      focus: vi.fn(),
    }
    const snapshots: NeonBreakerSnapshot[] = []
    const onSnapshot = vi.fn((snapshot: NeonBreakerSnapshot) => snapshots.push(snapshot))
    const scene = await createNeonBreakerScene({ host: host as unknown as HTMLDivElement, onSnapshot })
    const app = pixi.applications[0]
    scene.launch()
    for (let frame = 0; frame < 180 && snapshots.at(-1)?.score === 0; frame += 1) app.ticker.advance()
    scene.pause()
    const before = snapshots.at(-1)!
    expect(before.phase).toBe("paused")
    expect(before.score).toBeGreaterThan(0)
    expect(before.bricksLeft).toBeLessThan(snapshots[0].bricksLeft)
    const snapshotsBefore = onSnapshot.mock.calls.length
    const startsBefore = app.start.mock.calls.length
    const stopsBefore = app.stop.mock.calls.length

    scene.setPalette({ ...DEFAULT_GAME_RENDER_PALETTE, canvas: 0xd8ddbe, ink: 0x34442b })

    expect(pixi.applications).toHaveLength(1)
    expect(host.replaceChildren).toHaveBeenCalledExactlyOnceWith(app.canvas)
    expect(app.renderer.background.color).toBe(0xd8ddbe)
    expect(onSnapshot).toHaveBeenCalledTimes(snapshotsBefore)
    expect(snapshots.at(-1)).toBe(before)
    expect(app.start).toHaveBeenCalledTimes(startsBefore)
    expect(app.stop).toHaveBeenCalledTimes(stopsBefore)
    expect(app.ticker.started).toBe(false)

    scene.resume()
    expect(snapshots.at(-1)).toMatchObject({ phase: "playing", score: before.score, bricksLeft: before.bricksLeft, lives: before.lives })
    scene.setPalette(DEFAULT_GAME_RENDER_PALETTE)
    expect(app.ticker.started).toBe(true)
    expect(snapshots.at(-1)?.phase).toBe("playing")
    scene.destroy()
    expect(app.destroy).toHaveBeenCalledOnce()
  })

  it("restores gameplay focus and releases gestures whenever play stops", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    const host = {
      clientWidth: 390,
      clientHeight: 640,
      replaceChildren: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      focus: vi.fn(),
    }
    const snapshots: NeonBreakerSnapshot[] = []
    const scene = await createNeonBreakerScene({
      host: host as unknown as HTMLDivElement,
      onSnapshot: snapshot => snapshots.push(snapshot),
    })
    const app = pixi.applications[0]
    expect(app.canvas.style.touchAction).toBe("pan-y")
    expect(host.focus).not.toHaveBeenCalled()

    scene.launch()
    expect(app.canvas.style.touchAction).toBe("none")
    expect(host.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true })
    for (let frame = 0; frame < 180 && snapshots.at(-1)?.score === 0; frame += 1) app.ticker.advance()
    scene.pause()
    const earned = snapshots.at(-1)!
    expect(earned.score).toBeGreaterThan(0)
    expect(app.canvas.style.touchAction).toBe("pan-y")
    expect(host.focus).toHaveBeenCalledTimes(1)

    scene.resume()
    expect(app.canvas.style.touchAction).toBe("none")
    expect(host.focus).toHaveBeenCalledTimes(2)
    expect(snapshots.at(-1)).toMatchObject({ phase: "playing", score: earned.score, lives: earned.lives, bricksLeft: earned.bricksLeft })

    scene.restart()
    expect(app.canvas.style.touchAction).toBe("pan-y")
    expect(host.focus).toHaveBeenCalledTimes(3)
    expect(snapshots.at(-1)?.phase).toBe("ready")
    scene.nextLevel()
    expect(host.focus).toHaveBeenCalledTimes(3)

    const keyDown = host.addEventListener.mock.calls.find(([name]) => name === "keydown")![1] as (event: KeyboardEvent) => void
    const preventDefault = vi.fn()
    keyDown({ key: " ", repeat: true, preventDefault } as unknown as KeyboardEvent)
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(snapshots.at(-1)?.phase).toBe("ready")

    scene.launch()
    keyDown({ key: "ArrowLeft", repeat: false, preventDefault } as unknown as KeyboardEvent)
    for (let frame = 0; frame < 1_800 && snapshots.at(-1)?.phase !== "ready"; frame += 1) app.ticker.advance()
    expect(snapshots.at(-1)).toMatchObject({ phase: "ready", lives: 2 })
    expect(app.canvas.style.touchAction).toBe("pan-y")
    scene.destroy()
  })
})
