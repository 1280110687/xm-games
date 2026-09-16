"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { HOME_CATEGORIES } from "@/features/catalog/catalog"
import { getRetroCatalog, getRetroSection, RETRO_NAVIGATION_EVENT } from "./model"

const toolPaths = getRetroCatalog(HOME_CATEGORIES).tools.map(entry => entry.href)
export function useRetroSection() {
  const pathname = usePathname()
  const [hash, setHash] = useState("")
  useEffect(() => {
    const sync = () => setHash(window.location.hash)
    const navigate = (event: Event) => setHash((event as CustomEvent<string>).detail)
    sync()
    window.addEventListener("hashchange", sync)
    window.addEventListener("popstate", sync)
    window.addEventListener(RETRO_NAVIGATION_EVENT, navigate)
    return () => {
      window.removeEventListener("hashchange", sync)
      window.removeEventListener("popstate", sync)
      window.removeEventListener(RETRO_NAVIGATION_EVENT, navigate)
    }
  }, [pathname])
  return getRetroSection(pathname, hash, toolPaths)
}
export function navigateRetro(hash: string) {
  window.dispatchEvent(new CustomEvent(RETRO_NAVIGATION_EVENT, { detail: hash }))
  window.scrollTo({ top: 0, behavior: "auto" })
}
