"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { ARCADE_NAVIGATION_EVENT, getArcadeRouteSection } from "./home-model"

export function useArcadeSection() {
  const pathname = usePathname()
  const [hash, setHash] = useState("")
  useEffect(() => {
    const sync = () => setHash(window.location.hash)
    const navigate = (event: Event) => setHash((event as CustomEvent<string>).detail)
    sync()
    window.addEventListener("hashchange", sync)
    window.addEventListener("popstate", sync)
    window.addEventListener(ARCADE_NAVIGATION_EVENT, navigate)
    return () => {
      window.removeEventListener("hashchange", sync)
      window.removeEventListener("popstate", sync)
      window.removeEventListener(ARCADE_NAVIGATION_EVENT, navigate)
    }
  }, [pathname])
  return getArcadeRouteSection(pathname, hash)
}

export function navigateArcade(hash: string) {
  window.dispatchEvent(new CustomEvent(ARCADE_NAVIGATION_EVENT, { detail: hash }))
  window.scrollTo({ top: 0, behavior: "auto" })
}
