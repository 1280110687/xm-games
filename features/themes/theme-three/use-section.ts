"use client"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { getThemeThreeNavigationSection, THEME_THREE_HOME_NAVIGATION } from "./navigation-model"
export function useThemeThreeSection() {
  const pathname = usePathname()
  const [hash, setHash] = useState("")
  useEffect(() => {
    const sync = () => setHash(window.location.hash)
    const navigate = (event: Event) => setHash((event as CustomEvent<string>).detail)
    sync()
    window.addEventListener("hashchange", sync)
    window.addEventListener("popstate", sync)
    window.addEventListener(THEME_THREE_HOME_NAVIGATION, navigate)
    return () => {
      window.removeEventListener("hashchange", sync)
      window.removeEventListener("popstate", sync)
      window.removeEventListener(THEME_THREE_HOME_NAVIGATION, navigate)
    }
  }, [pathname])
  return getThemeThreeNavigationSection(pathname, hash)
}
export function navigateThemeThree(hash: string) {
  window.dispatchEvent(new CustomEvent(THEME_THREE_HOME_NAVIGATION, { detail: hash }))
  window.scrollTo({ top: 0, behavior: "auto" })
}
