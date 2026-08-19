"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

import { useLocale } from "@/lib/locale-context"

const ROUTE_PROGRESS_TIMEOUT_MS = 12_000
const ROUTE_PROGRESS_DELAY_MS = 150

function isPlainPrimaryClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  )
}

export function RouteProgress() {
  const pathname = usePathname()

  return <RouteProgressForPath key={pathname} pathname={pathname} />
}

function RouteProgressForPath({ pathname }: { pathname: string }) {
  const { t } = useLocale()
  const [targetPathname, setTargetPathname] = useState<string | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const delayRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const visible =
    showProgress && targetPathname !== null && targetPathname !== pathname

  useEffect(() => {
    const clearProgressTimers = () => {
      if (delayRef.current !== null) {
        window.clearTimeout(delayRef.current)
        delayRef.current = null
      }
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    const handleClick = (event: MouseEvent) => {
      if (!isPlainPrimaryClick(event)) return

      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest<HTMLAnchorElement>("a[href]")
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return
      }

      const nextUrl = new URL(anchor.href, window.location.href)
      if (nextUrl.origin !== window.location.origin) return

      const currentUrl = new URL(window.location.href)
      const routeIsUnchanged =
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search
      if (routeIsUnchanged) return

      // Next.js client navigations request an RSC response. Those responses are
      // intentionally not cached because they can carry request-specific data.
      // A full document navigation lets the service worker serve the prepared
      // static route while the installed app is offline.
      if (!navigator.onLine) {
        event.preventDefault()
        window.location.assign(nextUrl.href)
        return
      }

      setTargetPathname(nextUrl.pathname)
      setShowProgress(false)
      clearProgressTimers()
      delayRef.current = window.setTimeout(() => {
        delayRef.current = null
        setShowProgress(true)
      }, ROUTE_PROGRESS_DELAY_MS)
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null
        setTargetPathname(null)
        setShowProgress(false)
      }, ROUTE_PROGRESS_TIMEOUT_MS)
    }

    document.addEventListener("click", handleClick, true)
    return () => {
      document.removeEventListener("click", handleClick, true)
      clearProgressTimers()
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading__bar" aria-hidden="true" />
      <span className="route-loading__label">{t("routeLoading")}</span>
    </div>
  )
}
