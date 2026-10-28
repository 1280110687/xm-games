"use client"

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { ArrowLeft, LoaderCircle } from "lucide-react"
import { useTheme } from "@/features/themes/shared/theme-provider"
import { useLocale } from "@/lib/locale-context"
import { parseGameRenderColor, readGameRenderPalette } from "@/lib/game-render-palette"
import type { ArcadeGameId } from "../../packages/arcade-bridge/src/index"
import { clampExitPosition, IMMERSIVE_GAMES, immersiveGameExitHref } from "./manifest"
import styles from "./immersive-game.module.css"

const COPY = {
  zh: { exit: "退出游戏", move: "拖动可移动退出按钮", loading: "正在加载游戏…", error: "游戏暂时未能启动，请退出后重试。" },
  en: { exit: "Exit game", move: "Drag to move the exit button", loading: "Loading game…", error: "The game could not start. Please exit and try again." },
  th: { exit: "ออกจากเกม", move: "ลากเพื่อย้ายปุ่มออก", loading: "กำลังโหลดเกม…", error: "เปิดเกมไม่ได้ โปรดออกแล้วลองใหม่" },
}

export function ImmersiveGame({ gameId }: { gameId: ArcadeGameId }) {
  const router = useRouter()
  const { theme, isResolved } = useTheme()
  const { locale, t } = useLocale()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const boundsRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null)
  const blockClick = useRef(false)
  const copy = COPY[locale]
  const title = t(IMMERSIVE_GAMES[gameId].titleKey)

  const send = useCallback((data: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage({ channel: "xm-arcade", gameId, ...data }, window.location.origin)
  }, [gameId])
  const sendContext = useCallback(() => {
    const palette = readGameRenderPalette()
    const css = getComputedStyle(document.documentElement)
    send({ type: "context", theme, locale, palette: {
      ...palette,
      surface: parseGameRenderColor(css.getPropertyValue("--game-surface"), palette.light),
      onAccent: parseGameRenderColor(css.getPropertyValue("--game-on-accent"), palette.light),
    } })
  }, [theme, locale, send])
  const sendPause = useCallback(() => send({ type: "pause", paused: document.hidden }), [send])
  const loaded = useCallback(() => { sendContext(); sendPause(); send({ type: "ping" }) }, [send, sendContext, sendPause])

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const previousOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    const saved = new Map<HTMLElement, boolean>()
    const makeBackgroundInert = () => {
      for (const child of document.body.children) {
        if (!(child instanceof HTMLElement) || child === stageRef.current || saved.has(child)) continue
        saved.set(child, child.inert)
        child.inert = true
      }
    }
    makeBackgroundInert()
    const observer = new MutationObserver(makeBackgroundInert)
    observer.observe(document.body, { childList: true })
    return () => {
      observer.disconnect()
      saved.forEach((inert, element) => { element.inert = inert })
      document.body.style.overflow = previousOverflow
      document.documentElement.style.overflow = previousRootOverflow
    }
  }, [mounted])
  useEffect(() => {
    const message = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow || event.origin !== window.location.origin || event.data?.channel !== "xm-arcade" || event.data.gameId !== gameId) return
      if (event.data.type === "ready") { setStatus("ready"); sendContext(); sendPause() }
      if (event.data.type === "error") setStatus("error")
    }
    window.addEventListener("message", message)
    document.addEventListener("visibilitychange", sendPause)
    return () => { window.removeEventListener("message", message); document.removeEventListener("visibilitychange", sendPause) }
  }, [gameId, sendContext, sendPause])
  useEffect(() => { if (mounted && isResolved) loaded() }, [mounted, isResolved, loaded])
  useEffect(() => {
    if (!mounted || status !== "loading") return
    const timeout = window.setTimeout(() => setStatus("error"), 45000)
    return () => window.clearTimeout(timeout)
  }, [mounted, status])
  useEffect(() => {
    if (!mounted) return
    const fit = () => {
      const bounds = boundsRef.current?.getBoundingClientRect()
      if (bounds) setPosition(value => value ? clampExitPosition(value, bounds) : value)
    }
    const observer = new ResizeObserver(fit)
    if (stageRef.current) observer.observe(stageRef.current)
    window.visualViewport?.addEventListener("resize", fit)
    window.visualViewport?.addEventListener("scroll", fit)
    return () => { observer.disconnect(); window.visualViewport?.removeEventListener("resize", fit); window.visualViewport?.removeEventListener("scroll", fit) }
  }, [mounted])

  const pointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top }
    blockClick.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const pointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const start = drag.current
    const bounds = boundsRef.current?.getBoundingClientRect()
    if (!start || start.id !== event.pointerId || !bounds) return
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    if (!blockClick.current && Math.hypot(dx, dy) < 7) return
    blockClick.current = true
    setPosition(clampExitPosition({ x: start.left + dx, y: start.top + dy }, bounds))
  }
  const exit = () => {
    send({ type: "pause", paused: true })
    router.replace(immersiveGameExitHref(theme))
  }

  if (!mounted) return null
  return createPortal(<div ref={stageRef} className={styles.stage} data-immersive-game={gameId} data-status={status}>
    <span ref={boundsRef} className={styles.safeBounds} aria-hidden="true" />
    {isResolved && <iframe ref={frameRef} className={styles.frame} src={`/arcade-games/${gameId}/index.html`} title={title} onLoad={loaded} allow="autoplay; fullscreen" />}
    {status !== "ready" && <div className={styles.cover} role={status === "error" ? "alert" : "status"}>
      {status === "loading" && <LoaderCircle aria-hidden="true" />}
      <p className={styles.error}>{status === "error" ? copy.error : copy.loading}</p>
    </div>}
    <button ref={buttonRef} type="button" className={styles.exit} aria-label={copy.exit} title={`${copy.exit} · ${copy.move}`}
      style={position ? { left: position.x, top: position.y, right: "auto" } : undefined}
      onPointerDown={pointerDown} onPointerMove={pointerMove}
      onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null; blockClick.current = true }}
      onClick={event => { if (blockClick.current && event.detail !== 0) { blockClick.current = false; return } exit() }}>
      <ArrowLeft aria-hidden="true" />
    </button>
  </div>, document.body)
}
