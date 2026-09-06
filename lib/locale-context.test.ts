import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parse } from "postcss"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/gomoku" }))

import { LocaleProvider, useLocale } from "./locale-context"

describe("locale first render", () => {
  it("renders a language-neutral placeholder, not default-English page content", () => {
    const renderChild = vi.fn()
    function Page() {
      renderChild()
      return createElement("h1", null, useLocale().t("gomoku"))
    }

    const html = renderToStaticMarkup(createElement(LocaleProvider, null, createElement(Page)))

    expect(renderChild).not.toHaveBeenCalled()
    expect(html).toContain('data-locale-pending="true"')
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain("Gomoku")
    expect(html).not.toContain("五子棋")
    expect(html.replace(/<[^>]*>/g, "")).toBe("XM-GAMES")
  })

  it("keeps startup motion decorative, compositor-only and opt-in", () => {
    const styles = parse(readFileSync(join(process.cwd(), "app/globals.css"), "utf8"))
    const animations: string[] = []
    styles.walkRules(".locale-startup-placeholder > span", (rule) => {
      rule.walkDecls("animation", (declaration) => {
        animations.push(declaration.value)
        expect(rule.parent?.type).toBe("atrule")
        expect(rule.parent).toMatchObject({ name: "media", params: "(prefers-reduced-motion: no-preference)" })
      })
    })
    expect(animations).toEqual(["locale-tile-pulse 1.6s ease-in-out infinite"])
    const animatedProperties = new Set<string>()
    styles.walkAtRules("keyframes", (rule) => {
      if (rule.params === "locale-tile-pulse") {
        rule.walkDecls((declaration) => { animatedProperties.add(declaration.prop) })
      }
    })
    expect([...animatedProperties].sort()).toEqual(["opacity", "transform"])
  })
})
