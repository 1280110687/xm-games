import { afterEach, describe, expect, it, vi } from "vitest"
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants.js"
import configureNext from "../next.config.mjs"
import { buildThemeAssets } from "../scripts/build-theme-assets.mjs"

vi.mock("../scripts/build-theme-assets.mjs", () => ({ buildThemeAssets: vi.fn() }))
afterEach(() => vi.clearAllMocks())

describe("generated theme asset lifecycle", () => {
  it.each([PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD])("prepares assets in %s", async phase => {
    await configureNext(phase)
    expect(buildThemeAssets).toHaveBeenCalledOnce()
  })

  it("serves built assets without regenerating them on production startup", async () => {
    const config = await configureNext(PHASE_PRODUCTION_SERVER)
    expect(config.devIndicators).toBe(false)
    expect(buildThemeAssets).not.toHaveBeenCalled()
  })
})
