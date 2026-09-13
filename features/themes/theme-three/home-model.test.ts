import { describe, expect, it } from "vitest"
import { Gamepad2 } from "lucide-react"
import { filterThemeThreeCatalog, type ThemeThreeCategory } from "./home-model"

const catalog: ThemeThreeCategory[] = [
  {
    titleKey: "categoryBingo",
    games: [
      {
        href: "/bingo",
        titleKey: "bingo",
        descKey: "bingoDescription",
        icon: Gamepad2,
      },
    ],
  },
  {
    titleKey: "categoryTools",
    games: [
      {
        href: "/text-tool",
        titleKey: "textTool",
        descKey: "textToolDescription",
        icon: Gamepad2,
      },
    ],
  },
]
const messages: Record<string, string> = {
  categoryBingo: "Bingo 游戏",
  bingo: "BINGO",
  bingoDescription: "抽数字",
  categoryTools: "实用工具",
  textTool: "文本整理",
  textToolDescription: "清理重复行",
}
const t = (key: string) => messages[key]

describe("Theme Three sample catalog", () => {
  it("retains all routes and category order with a blank query", () => {
    expect(filterThemeThreeCatalog(catalog, "  ", t)).toEqual(catalog)
  })
  it("searches translated category labels", () => {
    expect(filterThemeThreeCatalog(catalog, "实用", t)[0].games[0].href).toBe(
      "/text-tool",
    )
  })
  it("matches names case-insensitively and trims input", () => {
    expect(
      filterThemeThreeCatalog(catalog, " bingo ", t)[0].games[0].href,
    ).toBe("/bingo")
  })
  it("matches descriptions without mutating the source catalog", () => {
    const result = filterThemeThreeCatalog(catalog, "重复", t)
    expect(result).toHaveLength(1)
    expect(result[0]).not.toBe(catalog[1])
    expect(catalog).toHaveLength(2)
  })
  it("returns an empty state for unmatched input", () => {
    expect(filterThemeThreeCatalog(catalog, "zzzz", t)).toEqual([])
  })
})
