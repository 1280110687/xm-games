import { describe, expect, it } from "vitest"

import { DEFAULT_LOCALE, resolveInitialLocale } from "./i18n"

describe("locale initialization", () => {
  it("keeps a supported language previously selected by the user", () => {
    expect(resolveInitialLocale("th", ["zh-CN"])).toBe("th")
  })

  it.each([
    ["zh-CN", "zh"],
    ["zh-Hant-TW", "zh"],
    ["en-US", "en"],
    ["th-TH", "th"],
    ["th_TH", "th"],
  ] as const)("matches the system language and region %s", (languageTag, expected) => {
    expect(resolveInitialLocale(null, [languageTag])).toBe(expected)
  })

  it("uses the first supported language in the system preference list", () => {
    expect(resolveInitialLocale(null, ["fr-FR", "th-TH", "en-US"])).toBe("th")
  })

  it("defaults to English when no system language is supported", () => {
    expect(resolveInitialLocale(null, ["ja-JP", "de-DE"])).toBe(DEFAULT_LOCALE)
    expect(resolveInitialLocale("legacy-locale", [])).toBe(DEFAULT_LOCALE)
  })
})
