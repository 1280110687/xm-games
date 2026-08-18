"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

import { useLocale } from "@/lib/locale-context"

const ROUTE_PROGRESS_TIMEOUT_MS = 12_000

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
  const { t } = useLocale()
  const [targetPathname, setTargetPathname] = useState<string | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const visible = targetPathname !== null && targetPathname !== pathname

  useEffect(() => {
    const clearProgressTimeout = () => {
      if (timeoutRef.current === null) return
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
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

      setTargetPathname(nextUrl.pathname)
      clearProgressTimeout()
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null
        setTargetPathname(null)
      }, ROUTE_PROGRESS_TIMEOUT_MS)
    }

    document.addEventListener("click", handleClick, true)
    return () => {
      document.removeEventListener("click", handleClick, true)
      clearProgressTimeout()
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
