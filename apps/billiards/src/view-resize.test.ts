import { afterEach, describe, expect, it, vi } from "vitest"
import { Camera } from "../upstream/src/view/camera"
import { View } from "../upstream/src/view/view"
import { AimEvent } from "../upstream/src/events/aimevent"

afterEach(() => vi.unstubAllGlobals())

function fixture(observer: boolean) {
  if (observer) vi.stubGlobal("ResizeObserver", class {})
  else vi.stubGlobal("ResizeObserver", undefined)
  const camera = new Camera(1280 / 600)
  const renderer = {
    setSize: vi.fn(), setViewport: vi.fn(), setScissor: vi.fn(),
    setScissorTest: vi.fn(), render: vi.fn(),
  }
  const view = Object.assign(Object.create(View.prototype), {
    camera, renderer, scene: {}, element: { offsetWidth: 333, offsetHeight: 462 },
    windowWidth: 1280, windowHeight: 600,
    cachedWidth: 333, cachedHeight: 462,
  }) as View
  return { view, camera, renderer }
}

describe("idle table viewport rotation", () => {
  it.each([true, false])("fits the first resized frame before consuming its render signal (observer=%s)", observer => {
    const { view, camera, renderer } = fixture(observer)
    const aim = new AimEvent()
    camera.update(0, aim)
    expect(camera.camera.position.y).toBeLessThan(0)

    view.update(0, aim)
    expect(camera.camera.aspect).toBeCloseTo(333 / 462)
    expect(Math.abs(camera.camera.position.x)).toBeGreaterThan(Math.abs(camera.camera.position.y))
    // Keep the resize dirty until drawing so the idle render gate still fires.
    expect(view.sizeChanged()).toBe(true)
    view.renderCamera(camera)
    expect(renderer.setSize).toHaveBeenCalledWith(333, 462)
    expect(renderer.render).toHaveBeenCalledOnce()
    expect(view.sizeChanged()).toBe(false)
  })

  it("invalidates the fitted aim distance only when the viewport changes", () => {
    const camera = new Camera(2)
    const cached = camera as unknown as { computedAimzDistance: number | undefined }
    cached.computedAimzDistance = 4
    camera.setAspect(2)
    expect(cached.computedAimzDistance).toBe(4)
    camera.setAspect(.7)
    expect(cached.computedAimzDistance).toBeUndefined()
    camera.setAspect(0)
    expect(camera.camera.aspect).toBe(.7)
  })
})
