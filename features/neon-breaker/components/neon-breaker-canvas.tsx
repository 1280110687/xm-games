"use client"

import { useEffect, useRef } from "react"

import { useTheme } from "@/features/themes/shared/theme-provider"
import { readGameRenderPalette } from "@/lib/game-render-palette"

import type {
  NeonBreakerController,
  NeonBreakerSnapshot,
} from "@/features/neon-breaker/pixi-scene"

interface NeonBreakerCanvasProps {
  ariaLabel: string
  initialHighScore: number
  retryKey: number
  onReady: (controller: NeonBreakerController | null) => void
  onSnapshot: (snapshot: NeonBreakerSnapshot) => void
  onError: (error: Error) => void
}

export function NeonBreakerCanvas({
  ariaLabel,
  initialHighScore,
  retryKey,
  onReady,
  onSnapshot,
  onError,
}: NeonBreakerCanvasProps) {
  const { theme } = useTheme()
  const hostRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<NeonBreakerController | null>(null)
  const initialHighScoreRef = useRef(initialHighScore)
  const callbacksRef = useRef({ onReady, onSnapshot, onError })

  useEffect(() => {
    callbacksRef.current = { onReady, onSnapshot, onError }
  }, [onError, onReady, onSnapshot])

  useEffect(() => {
    const host = hostRef.current
    if (host) controllerRef.current?.setPalette(readGameRenderPalette(host))
  }, [theme])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const abortController = new AbortController()
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    let controller: NeonBreakerController | null = null

    const initialize = async () => {
      try {
        const { createNeonBreakerScene } = await import(
          "@/features/neon-breaker/pixi-scene"
        )
        if (abortController.signal.aborted) return

        controller = await createNeonBreakerScene({
          host,
          highScore: initialHighScoreRef.current,
          reducedMotion: reducedMotionQuery.matches,
          palette: readGameRenderPalette(host),
          signal: abortController.signal,
          onSnapshot: (snapshot) => callbacksRef.current.onSnapshot(snapshot),
        })
        if (abortController.signal.aborted) {
          controller.destroy()
          return
        }
        controllerRef.current = controller
        // The theme may have changed while Pixi was loading/initializing.
        controller.setPalette(readGameRenderPalette(host))
        callbacksRef.current.onReady(controller)
      } catch (cause) {
        if (abortController.signal.aborted) return
        const error = cause instanceof Error
          ? cause
          : new Error("Unknown Pixi initialization error")
        callbacksRef.current.onError(error)
      }
    }

    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      controller?.setReducedMotion(event.matches)
    }

    reducedMotionQuery.addEventListener("change", handleReducedMotionChange)
    void initialize()

    return () => {
      abortController.abort()
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange)
      controller?.destroy()
      if (controllerRef.current === controller) controllerRef.current = null
      callbacksRef.current.onReady(null)
    }
  }, [retryKey])

  return (
    <div
      ref={hostRef}
      role="application"
      tabIndex={0}
      aria-label={ariaLabel}
      className="neon-canvas-host size-full touch-pan-y overflow-hidden outline-none"
    />
  )
}
