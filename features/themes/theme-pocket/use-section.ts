"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { getPocketSection, POCKET_NAVIGATION_EVENT } from "./model"

export function usePocketSection() {
  const pathname = usePathname()
  const [hash, setHash] = useState("")
  useEffect(() => {
    const sync = () => setHash(window.location.hash)
    const navigate = (event: Event) => setHash((event as CustomEvent<string>).detail)
    sync()
    window.addEventListener("hashchange", sync)
    window.addEventListener("popstate", sync)
    window.addEventListener(POCKET_NAVIGATION_EVENT, navigate)
    return () => {
      window.removeEventListener("hashchange", sync)
      window.removeEventListener("popstate", sync)
      window.removeEventListener(POCKET_NAVIGATION_EVENT, navigate)
    }
  }, [pathname])
  return getPocketSection(pathname, hash)
}

export function navigatePocket(hash: string) {
  window.dispatchEvent(new CustomEvent(POCKET_NAVIGATION_EVENT, { detail: hash }))
  window.scrollTo({ top: 0, behavior: "auto" })
}
