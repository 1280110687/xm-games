import { describe, expect, it } from "vitest"

import { locales, translations } from "./i18n"
import { getPageMetadata, PAGE_METADATA_KEYS } from "./page-metadata"

describe("page metadata", () => {
  it("uses valid translation keys for every static route", () => {
    for (const keys of Object.values(PAGE_METADATA_KEYS)) {
      expect(keys.titleKey).toBeTypeOf("string")
      expect(keys.descriptionKey).toBeTypeOf("string")
      expect(translations.zh[keys.titleKey]).toBeTruthy()
      expect(translations.zh[keys.descriptionKey]).toBeTruthy()
    }
  })

  it("returns complete localized metadata for every route and locale", () => {
    for (const pathname of Object.keys(PAGE_METADATA_KEYS)) {
      for (const locale of locales) {
        const metadata = getPageMetadata(pathname, locale)

        expect(metadata.title.trim()).not.toBe("")
        expect(metadata.description.trim()).not.toBe("")
      }
    }
  })

  it("normalizes trailing slashes and falls back to the homepage", () => {
    expect(getPageMetadata("/2048/", "zh")).toEqual(
      getPageMetadata("/2048", "zh"),
    )
    expect(getPageMetadata("/not-found", "zh")).toEqual(
      getPageMetadata("/", "zh"),
    )
  })
})
