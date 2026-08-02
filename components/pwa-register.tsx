"use client"

import { useEffect } from "react"

const PWA_CACHE_PREFIX = "xm-games-"
const DEVELOPMENT_CLEANUP_KEY = "xm-games-pwa-development-cleaned:v1"

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

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      }).catch((error: unknown) => {
        console.warn("[pwa] Service worker registration failed:", error)
      })
    }

    if (document.readyState === "complete") {
      register()
      return
    }

    window.addEventListener("load", register, { once: true })
    return () => window.removeEventListener("load", register)
  }, [])

  return null
}
