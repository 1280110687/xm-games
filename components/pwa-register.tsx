"use client"

import { useEffect } from "react"

import { prepareOfflinePackage } from "@/features/pwa/offline-package"

const PWA_CACHE_PREFIX = "xm-games-"
const DEVELOPMENT_CLEANUP_KEY = "xm-games-pwa-development-cleaned:v1"
const WEB_OFFLINE_WARMUP_DELAY_MS = 30_000
const OFFLINE_WARMUP_IDLE_TIMEOUT_MS = 15_000

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

function isInstalledPwa(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  )
}

function isXmGamesWorker(worker: ServiceWorker | null): boolean {
  if (!worker) return false

  try {
    const scriptUrl = new URL(worker.scriptURL)
    return scriptUrl.origin === window.location.origin && scriptUrl.pathname === "/sw.js"
  } catch {
    return false
  }
}

function isXmGamesRegistration(registration: ServiceWorkerRegistration): boolean {
  return [registration.active, registration.waiting, registration.installing]
    .some(isXmGamesWorker)
}

async function cleanupDevelopmentPwa() {
  const controlledByXmGames = isXmGamesWorker(navigator.serviceWorker.controller)
  const registrations = await navigator.serviceWorker.getRegistrations()
  const xmGamesRegistrations = registrations.filter(isXmGamesRegistration)

  await Promise.all(xmGamesRegistrations.map((registration) => registration.unregister()))

  if ("caches" in window) {
    const cacheNames = await window.caches.keys()
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(PWA_CACHE_PREFIX))
        .map((cacheName) => window.caches.delete(cacheName)),
    )
  }

  if (controlledByXmGames) {
    if (window.sessionStorage.getItem(DEVELOPMENT_CLEANUP_KEY) !== "1") {
      window.sessionStorage.setItem(DEVELOPMENT_CLEANUP_KEY, "1")
      window.location.reload()
    }
    return
  }

  window.sessionStorage.removeItem(DEVELOPMENT_CLEANUP_KEY)
}

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    if (process.env.NODE_ENV !== "production") {
      void cleanupDevelopmentPwa().catch((error: unknown) => {
        console.warn("[pwa] Development service worker cleanup failed:", error)
      })
      return
    }

    let cancelled = false
    let warmupTimer: number | null = null
    let idleCallback: number | null = null
    const prepare = (
      registration: ServiceWorkerRegistration,
      scope: "core" | "full",
    ) => {
      document.documentElement.dataset.offlinePackage = "preparing"
      void prepareOfflinePackage(scope, registration)
        .then((result) => {
          document.documentElement.dataset.offlinePackage = result.scope === "full"
            ? "full"
            : "core"
        })
        .catch((error: unknown) => {
          document.documentElement.dataset.offlinePackage = "error"
          console.warn("[pwa] Offline package preparation failed:", error)
        })
    }

    const scheduleOfflineWarmup = (registration: ServiceWorkerRegistration) => {
      const installed = isInstalledPwa()
      warmupTimer = window.setTimeout(() => {
        if (cancelled) return

        const warm = () => {
          if (cancelled) return
          prepare(registration, installed ? "full" : "core")
        }

        if (typeof window.requestIdleCallback === "function") {
          idleCallback = window.requestIdleCallback(warm, {
            timeout: OFFLINE_WARMUP_IDLE_TIMEOUT_MS,
          })
        } else {
          warm()
        }
      }, installed ? 0 : WEB_OFFLINE_WARMUP_DELAY_MS)
    }

    let readyRegistration: ServiceWorkerRegistration | null = null
    const handleInstalled = () => {
      if (cancelled || !readyRegistration) return
      prepare(readyRegistration, "full")
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        readyRegistration = await navigator.serviceWorker.ready
        if (!cancelled) scheduleOfflineWarmup(readyRegistration)
      } catch (error: unknown) {
        console.warn("[pwa] Service worker registration failed:", error)
      }
    }

    if (document.readyState === "complete") {
      void register()
    } else {
      window.addEventListener("load", register, { once: true })
    }
    window.addEventListener("appinstalled", handleInstalled)

    return () => {
      cancelled = true
      window.removeEventListener("load", register)
      window.removeEventListener("appinstalled", handleInstalled)
      if (warmupTimer !== null) window.clearTimeout(warmupTimer)
      if (idleCallback !== null) window.cancelIdleCallback?.(idleCallback)
    }
  }, [])

  return null
}
