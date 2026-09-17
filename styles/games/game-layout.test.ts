import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import postcss from "postcss"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")
const declarations = (path: string, selector: string) => {
  const values: Record<string, string> = {}
  postcss.parse(read(path)).walkRules(selector, (rule) => {
    rule.walkDecls((decl) => { values[decl.prop] = decl.value })
  })
  return values
}

describe("responsive game layout contracts", () => {
  it("sizes a non-stretching 10 by 20 grid instead of clipping fixed-size cells", () => {
    expect(declarations("app/classic-games.css", ".tetris-board")).toMatchObject({
      "flex": "0 0 auto",
      "align-self": "flex-start",
      "aspect-ratio": "1 / 2",
      "grid-template-columns": "repeat(10, minmax(0, 1fr))",
      "grid-template-rows": "repeat(20, minmax(0, 1fr))",
    })
    expect(read("features/tetris/components/tetris-game.tsx")).not.toContain("repeat(${BOARD_WIDTH}")
  })

  it.each(["arcade", "pocket", "three", "four", "retro"])(
    "lets theme %s cells follow the board tracks",
    (theme) => {
      expect(declarations(
        `styles/themes/theme-${theme}/classic-games.css`,
        `html[data-theme='theme-${theme}'] .tetris-cell`,
      )).toMatchObject({ width: "100%", height: "100%" })
    },
  )

  it("gives the 3D room LCD a definite width for percentage track sizing", () => {
    expect(declarations(
      "styles/themes/theme-four/classic-games.css",
      "html[data-theme='theme-four'] .tetris-screen-frame",
    ).width).toBe("100%")
  })

  it.each(["pocket", "retro"])("caps theme %s handhelds with max-width", (theme) => {
    const css = read(`styles/themes/theme-${theme}/classic-games.css`)
    expect(css).toMatch(/\.classic-2048-content[^}]*max-width:\s*470px/)
    expect(css).toMatch(/\.classic-tetris-content[^}]*max-width:\s*470px/)
  })

  it("uses the same fixed size for minesweeper tracks and their hit targets", () => {
    const source = read("features/minesweeper/components/minesweeper-game.tsx")
    expect(source).toContain('className="minesweeper-grid grid w-max gap-px"')
    expect(source).toContain("repeat(${cols}, var(--mine-cell-size))")
    expect(source).toContain("h-[var(--mine-cell-size)] w-[var(--mine-cell-size)]")
    expect(source).toContain('className="game-stage overflow-auto')
  })
})
