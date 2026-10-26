import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import postcss from "postcss"
import { describe, expect, it } from "vitest"

import { themes } from "../../lib/theme"

const read = (path: string) => readFileSync(resolve(path), "utf8")

function palette(theme: string) {
  const values = new Map<string, string>()
  postcss.parse(read(`styles/themes/${theme}/game-palette.css`)).walkDecls(decl => {
    values.set(decl.prop, decl.value)
  })
  return values
}

function luminance(hex: string) {
  const rgb = hex.slice(1).match(/.{2}/g)!.map(channel => {
    const value = parseInt(channel, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
}

function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

function mix(first: string, second: string, amount: number) {
  const channels = [1, 3, 5].map(offset => Math.round(
    parseInt(first.slice(offset, offset + 2), 16) * amount
    + parseInt(second.slice(offset, offset + 2), 16) * (1 - amount),
  ).toString(16).padStart(2, "0"))
  return `#${channels.join("")}`
}

function skinStyle(file: string, selectors: string[]) {
  const declarations = new Map<string, string>()
  postcss.parse(read(`styles/games/${file}`)).walkRules(rule => {
    if (!selectors.includes(rule.selector)) return
    rule.walkDecls(decl => { declarations.set(decl.prop, decl.value) })
  })
  return declarations
}

function resolveColor(value: string | undefined, values: Map<string, string>): string {
  if (!value) throw new Error("Expected a gameplay color declaration")
  const resolved = value.replace(/var\((--game-[a-z\d-]+)\)/g, (_, token: string) => {
    const color = values.get(token)
    if (!color) throw new Error(`Missing gameplay color: ${token}`)
    return color
  })
  if (/^#[\da-f]{6}$/i.test(resolved)) return resolved
  const blend = resolved.match(/^color-mix\(in srgb, (#[\da-f]{6}) (\d+)%, (#[\da-f]{6})\)$/i)
  if (blend) return mix(blend[1], blend[3], Number(blend[2]) / 100)
  throw new Error(`Unsupported gameplay color: ${resolved}`)
}

describe("game skin contract across every selectable theme", () => {
  it.each(themes)("supplies every token consumed by the shared game skins in %s", theme => {
    const values = palette(theme)
    for (const file of ["board-skin.css", "puzzle-skin.css", "bingo-skin.css", "arcade-skin.css"]) {
      const references = [...read(`styles/games/${file}`).matchAll(/var\((--game-[a-z\d-]+)/g)]
      for (const [, token] of references) {
        expect(values.has(token), `${theme} must supply ${token} used by ${file}`).toBe(true)
      }
    }
    expect(read(`styles/themes/${theme}/index.css`)).toContain("@import './game-palette.css'")
  })

  it.each(themes)("keeps text and opposing pieces distinct in %s", theme => {
    const values = palette(theme)
    for (const [foreground, background] of [
      ["--game-ink", "--game-surface"],
      ["--game-muted", "--game-surface"],
      ["--game-dark", "--game-light"],
      ["--game-on-accent", "--game-accent"],
      ["--game-on-danger", "--game-danger"],
    ]) {
      expect(contrast(values.get(foreground)!, values.get(background)!)).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrast(values.get("--game-square-light")!, values.get("--game-square-dark")!)).toBeGreaterThanOrEqual(2)
    for (let letter = 1; letter <= 5; letter += 1) {
      const ink = mix(values.get(`--game-brick-${letter}`)!, values.get("--game-ink")!, 0.3)
      expect(contrast(ink, values.get("--game-surface")!)).toBeGreaterThanOrEqual(4.5)
    }
    const success = values.get("--game-success")!
    expect(contrast(success, mix(success, values.get("--game-surface")!, 0.15))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(themes)("keeps small gameplay labels readable in actual states in %s", theme => {
    const values = palette(theme)
    const verify = (label: string, foreground: string | undefined, background: string | undefined) => {
      expect(
        contrast(resolveColor(foreground, values), resolveColor(background, values)),
        `${theme}: ${label}`,
      ).toBeGreaterThanOrEqual(4.5)
    }

    for (const state of ["selected", "related"]) {
      const style = skinStyle("puzzle-skin.css", [
        "html[data-theme] .sudoku-cell",
        `html[data-theme] .sudoku-cell[data-state='${state}']`,
      ])
      verify(`Sudoku ${state} input`, style.get("color"), style.get("background"))
    }

    const error = skinStyle("puzzle-skin.css", ["html[data-theme] .sudoku-cell[data-error='true']"])
    verify("Sudoku incorrect input", error.get("color"), error.get("background"))

    const number = skinStyle("puzzle-skin.css", ["html[data-theme] .mine-number[data-count='8']"])
    const revealed = skinStyle("puzzle-skin.css", ["html[data-theme] .minesweeper-cell[data-state='revealed']"])
    verify("Minesweeper eight", number.get("color"), revealed.get("background"))

    const ball = skinStyle("bingo-skin.css", ["html[data-theme] .bingo-call-ball"])
    verify("Bingo empty ball hint", ball.get("color"), ball.get("background"))
  })
})
