import { describe, expect, it } from "vitest"
import { INITIAL_SCENE_LOAD, sceneLoadReducer } from "./scene-loading"

describe("Theme Four startup lifecycle", () => {
  it("accepts application readiness without an iframe load event", () => {
    expect(sceneLoadReducer(INITIAL_SCENE_LOAD, "ready").phase).toBe("ready")
  })
  it("provides recovery for a missing bundle or a stalled scene", () => {
    for (const state of [INITIAL_SCENE_LOAD, sceneLoadReducer(INITIAL_SCENE_LOAD, "booted")]) {
      const failed = sceneLoadReducer(state, "timeout")
      expect(failed.phase).toBe("failed")
      expect(sceneLoadReducer(failed, "retry")).toEqual({ phase: "starting", attempt: 1 })
      expect(sceneLoadReducer(failed, "ready").phase).toBe("ready")
      expect(sceneLoadReducer(failed, "booted")).toBe(failed)
    }
  })
  it("does not regress a ready scene on delayed boot or timeout", () => {
    const ready = sceneLoadReducer(INITIAL_SCENE_LOAD, "ready")
    expect(sceneLoadReducer(ready, "booted")).toBe(ready)
    expect(sceneLoadReducer(ready, "timeout")).toBe(ready)
    expect(sceneLoadReducer(ready, "failed").phase).toBe("failed")
  })
  it("requires a new iframe after a runtime failure even if an old ready message arrives", () => {
    const failed = sceneLoadReducer(INITIAL_SCENE_LOAD, "failed")
    expect(sceneLoadReducer(failed, "ready")).toBe(failed)
    expect(sceneLoadReducer(failed, "timeout")).toBe(failed)
    expect(sceneLoadReducer(failed, "retry")).toEqual({ phase: "starting", attempt: 1 })
  })
})
