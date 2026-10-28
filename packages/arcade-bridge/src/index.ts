/** Same-origin context and lifecycle shared by the isolated arcade games. */
export const ARCADE_GAME_IDS = ["galaga", "bubbo-bubbo", "puzzling-potions", "deep-field", "pinball-schminball", "radius-raid"] as const
export type ArcadeGameId = typeof ARCADE_GAME_IDS[number]
export type ArcadeLocale = "zh" | "en" | "th"
export type ArcadeTheme = "theme-pocket" | "theme-three" | "theme-four" | "theme-retro"
export interface ArcadePalette {
  canvas: number
  canvasGrid: number
  accent: number
  ink: number
  muted: number
  border: number
  light: number
  surface: number
  onAccent: number
  success: number
  danger: number
  bricks: readonly number[]
}
export interface ArcadeContext {
  theme: ArcadeTheme
  locale: ArcadeLocale
  palette: ArcadePalette
}
export const DEFAULT_ARCADE_CONTEXT: ArcadeContext = {
  theme: "theme-pocket", locale: "zh",
  palette: { canvas: 0xf3f6fc, canvasGrid: 0xdbe4f4, accent: 0x2860ed, ink: 0x17243b, muted: 0x61738c, border: 0xcdd9ee, light: 0xffffff, surface: 0xffffff, onAccent: 0xffffff, success: 0x277f69, danger: 0xe44868, bricks: [0x2860ed, 0x8362de, 0x239bb0, 0xe49b2c, 0xe44868] },
}
const themes = new Set(["theme-pocket", "theme-three", "theme-four", "theme-retro"])
const colors = ["canvas", "canvasGrid", "accent", "ink", "muted", "border", "light", "surface", "onAccent", "success", "danger"] as const
const color = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xffffff

export function parseArcadeContext(value: unknown): ArcadeContext | null {
  if (!value || typeof value !== "object") return null
  const data = value as Record<string, unknown>
  if (!themes.has(String(data.theme)) || !["zh", "en", "th"].includes(String(data.locale))) return null
  if (!data.palette || typeof data.palette !== "object") return null
  const palette = data.palette as Record<string, unknown>
  if (!colors.every(key => color(palette[key])) || !Array.isArray(palette.bricks) || palette.bricks.length !== 5 || !palette.bricks.every(color)) return null
  return { theme: data.theme as ArcadeTheme, locale: data.locale as ArcadeLocale,
    palette: { ...Object.fromEntries(colors.map(key => [key, palette[key]])), bricks: [...palette.bricks] } as unknown as ArcadePalette }
}

interface BridgeOptions {
  gameId: ArcadeGameId
  onContext?: (context: ArcadeContext) => void
  onPause?: (paused: boolean) => void
  getState?: () => Record<string, unknown>
}

declare global {
  interface Window {
    readonly xmArcadeState?: Readonly<Record<string, unknown>>
  }
}

export function connectArcadeHost(options: BridgeOptions) {
  let context: ArcadeContext = { ...DEFAULT_ARCADE_CONTEXT, palette: { ...DEFAULT_ARCADE_CONTEXT.palette, bricks: [...DEFAULT_ARCADE_CONTEXT.palette.bricks] } }
  let started = false
  let disposed = false
  let hostPaused = false
  let pageHidden = false
  let paused: boolean | undefined
  const post = (type: string, extra: Record<string, unknown> = {}) => {
    if (window.parent !== window && !disposed) window.parent.postMessage({ channel: "xm-arcade", gameId: options.gameId, type, ...extra }, window.location.origin)
  }
  const syncPause = () => {
    const next = hostPaused || pageHidden || document.hidden || disposed
    if (next === paused) return
    paused = next
    options.onPause?.(next)
  }
  const applyContext = () => {
    const root = document.documentElement
    root.dataset.theme = context.theme
    root.lang = context.locale
    for (const key of colors) {
      const cssKey = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
      const value = `#${context.palette[key].toString(16).padStart(6, "0")}`
      root.style.setProperty(`--${cssKey}`, value)
      root.style.setProperty(`--game-${cssKey}`, value)
    }
    root.style.setProperty("--panel", `#${context.palette.surface.toString(16).padStart(6, "0")}`)
    options.onContext?.(context)
  }
  const message = (event: MessageEvent) => {
    if (disposed || event.source !== window.parent || event.origin !== window.location.origin || event.data?.channel !== "xm-arcade" || event.data.gameId !== options.gameId) return
    if (event.data.type === "ping" && started) post("ready")
    if (event.data.type === "context") {
      const next = parseArcadeContext(event.data)
      if (next) { context = next; applyContext() }
    }
    if (event.data.type === "pause" && typeof event.data.paused === "boolean") { hostPaused = event.data.paused; syncPause() }
  }
  const hide = () => { pageHidden = true; syncPause() }
  const show = () => { pageHidden = false; syncPause(); if (started) post("ready") }
  window.addEventListener("message", message)
  window.addEventListener("pagehide", hide)
  window.addEventListener("pageshow", show)
  document.addEventListener("visibilitychange", syncPause)
  Object.defineProperty(window, "xmArcadeState", { configurable: true, get: () => ({
    ...options.getState?.(), gameId: options.gameId, ready: started && !disposed,
    paused: !!paused, theme: context.theme, locale: context.locale,
  }) })
  queueMicrotask(() => { if (!disposed) { applyContext(); syncPause() } })
  return {
    get context() { return context },
    ready() { if (disposed) return; started = true; applyContext(); syncPause(); post("ready") },
    fail(message = "Game could not start") { post("error", { message }) },
    dispose() {
      if (disposed) return
      disposed = true
      syncPause()
      window.removeEventListener("message", message)
      window.removeEventListener("pagehide", hide)
      window.removeEventListener("pageshow", show)
      document.removeEventListener("visibilitychange", syncPause)
    },
  }
}
