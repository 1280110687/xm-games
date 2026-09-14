import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { HOME_CATEGORY_ORDER } from "../../lib/home-catalog"
import { getTranslation, locales } from "../../lib/i18n"
import { HOME_CATEGORIES } from "./catalog"

describe("shared experience catalog", () => {
  it("preserves all six categories and the existing 22 destinations", () => {
    expect(HOME_CATEGORIES.map((category) => category.titleKey)).toEqual(HOME_CATEGORY_ORDER)
    expect(HOME_CATEGORIES.flatMap((category) => category.games.map((game) => game.href)).sort()).toEqual([
      "/2048", "/alternating-trail", "/anime-tracker", "/base64-tool",
      "/bingo", "/bingo-cards", "/chess", "/chinese-chess", "/go", "/gomoku",
      "/json-tool", "/memory-match", "/minesweeper", "/neon-breaker", "/qr-code",
      "/reversi", "/schulte-grid", "/snake", "/sudoku", "/tetris", "/text-crypto", "/text-tool",
    ])
  })

  it("keeps route and translation contracts without theme presentation fields", () => {
    for (const category of HOME_CATEGORIES) {
      for (const locale of locales) expect(getTranslation(locale, category.titleKey)).toBeTruthy()
      for (const game of category.games) {
        expect(existsSync(resolve(`app${game.href}/page.tsx`))).toBe(true)
        expect(game).not.toHaveProperty("tone")
        expect(game).not.toHaveProperty("featured")
        for (const locale of locales) {
          expect(getTranslation(locale, game.titleKey)).toBeTruthy()
          expect(getTranslation(locale, game.descKey)).toBeTruthy()
        }
      }
    }
  })
})
