"use client"

import { useEffect, useRef } from "react"

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
  const hostRef = useRef<HTMLDivElement>(null)
  const initialHighScoreRef = useRef(initialHighScore)
  const callbacksRef = useRef({ onReady, onSnapshot, onError })

  useEffect(() => {
    callbacksRef.current = { onReady, onSnapshot, onError }
  }, [onError, onReady, onSnapshot])

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
          signal: abortController.signal,
          onSnapshot: (snapshot) => callbacksRef.current.onSnapshot(snapshot),
        })
        if (abortController.signal.aborted) {
          controller.destroy()
          return
        }
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
      callbacksRef.current.onReady(null)
    }
  }, [retryKey])

  return (
    <div
      ref={hostRef}
      role="application"
      tabIndex={0}
      aria-label={ariaLabel}
      className="size-full touch-pan-y overflow-hidden rounded-[1.35rem] outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
    />
  )
}
