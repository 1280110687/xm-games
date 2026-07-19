import { describe, expect, it } from "vitest"

import { getTranslation, locales, translations } from "./i18n"

describe("translations", () => {
  it("keeps every locale aligned with the Chinese source keys", () => {
    const sourceKeys = Object.keys(translations.zh).sort()

    for (const locale of locales) {
      expect(Object.keys(translations[locale]).sort()).toEqual(sourceKeys)
    }
  })

  it("returns the localized value for a known key", () => {
    expect(getTranslation("en", "start")).toBe("Start")
  })
})
