import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

describe("deferred service worker registration", () => {
  it("does no registration merely by importing the offline preparation module", async () => {
    const register = vi.fn()
    vi.stubGlobal("navigator", { serviceWorker: { register } })
    await import("./offline-package")
    expect(register).not.toHaveBeenCalled()
  })

  it("shares one registration between background and explicit install intent", async () => {
    const registration = { active: {} }
    const register = vi.fn().mockResolvedValue(registration)
    vi.stubGlobal("navigator", { serviceWorker: { register, ready: Promise.resolve(registration) } })
    const { ensurePwaRegistration } = await import("./registration")
    const first = ensurePwaRegistration()
    expect(ensurePwaRegistration()).toBe(first)
    expect(await first).toBe(registration)
    expect(register).toHaveBeenCalledTimes(1)
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/", updateViaCache: "none" })
  })

  it("allows retry after a transient registration failure", async () => {
    const registration = { active: {} }
    const register = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(registration)
    vi.stubGlobal("navigator", { serviceWorker: { register, ready: Promise.resolve(registration) } })
    const { ensurePwaRegistration } = await import("./registration")
    await expect(ensurePwaRegistration()).rejects.toThrow("offline")
    expect(await ensurePwaRegistration()).toBe(registration)
    expect(register).toHaveBeenCalledTimes(2)
  })
})
