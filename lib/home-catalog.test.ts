import { describe, expect, it } from "vitest"

import { HOME_CATEGORY_ORDER, orderHomeCategories } from "./home-catalog"

describe("home catalog order", () => {
  it("keeps Bingo in the first category position", () => {
    expect(HOME_CATEGORY_ORDER[0]).toBe("categoryBingo")

    const ordered = orderHomeCategories([
      { titleKey: "categoryTools" },
      { titleKey: "categoryBoard" },
      { titleKey: "categoryBingo" },
    ])

    expect(ordered.map((category) => category.titleKey)).toEqual([
      "categoryBingo",
      "categoryBoard",
      "categoryTools",
    ])
  })

  it("keeps unknown categories after the known catalog order", () => {
    const ordered = orderHomeCategories([
      { titleKey: "futureTools" },
      { titleKey: "categoryPuzzle" },
    ])

    expect(ordered.map((category) => category.titleKey)).toEqual([
      "categoryPuzzle",
      "futureTools",
    ])
  })
})
