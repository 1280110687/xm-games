/** Numeric equivalents of the active theme's CSS colors for canvas renderers. */
export interface GameRenderPalette {
  readonly canvas: number
  readonly canvasGrid: number
  readonly accent: number
  readonly ink: number
  readonly muted: number
  readonly border: number
  readonly light: number
  readonly success: number
  readonly danger: number
  readonly bricks: readonly [number, number, number, number, number]
}

// A safe neutral fallback for missing/invalid CSS, rather than a second theme map.
export const DEFAULT_GAME_RENDER_PALETTE: GameRenderPalette = {
  canvas: 0xf0f0eb,
  canvasGrid: 0xd3d5cf,
  accent: 0x4b6250,
  ink: 0x26382d,
  muted: 0x69756b,
  border: 0xaab4aa,
  light: 0xffffff,
  success: 0x3c7153,
  danger: 0xa8443e,
  bricks: [0x637967, 0x839386, 0x9ca99a, 0xb4beb0, 0x536b59],
}

export function parseGameRenderColor(value: string, fallback: number): number {
  const hex = value.trim()
  if (/^#[\da-f]{6}$/i.test(hex)) return Number.parseInt(hex.slice(1), 16)
  if (/^#[\da-f]{3}$/i.test(hex)) {
    return Number.parseInt([...hex.slice(1)].map(char => char + char).join(""), 16)
  }
  return fallback
}

export function readGameRenderPalette(element?: Element): GameRenderPalette {
  const target = element ?? (typeof document === "undefined" ? undefined : document.documentElement)
  if (!target || typeof getComputedStyle !== "function") return DEFAULT_GAME_RENDER_PALETTE
  const css = getComputedStyle(target)
  const color = (token: string, fallback: number) =>
    parseGameRenderColor(css.getPropertyValue(`--game-${token}`), fallback)
  const fallback = DEFAULT_GAME_RENDER_PALETTE

  return {
    canvas: color("canvas", fallback.canvas),
    canvasGrid: color("canvas-grid", fallback.canvasGrid),
    accent: color("accent", fallback.accent),
    ink: color("ink", fallback.ink),
    muted: color("muted", fallback.muted),
    border: color("border", fallback.border),
    light: color("light", fallback.light),
    success: color("success", fallback.success),
    danger: color("danger", fallback.danger),
    bricks: [
      color("brick-1", fallback.bricks[0]),
      color("brick-2", fallback.bricks[1]),
      color("brick-3", fallback.bricks[2]),
      color("brick-4", fallback.bricks[3]),
      color("brick-5", fallback.bricks[4]),
    ],
  }
}
