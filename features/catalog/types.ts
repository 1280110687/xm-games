import type { LucideIcon } from "lucide-react"
import type { TranslationKey } from "@/lib/i18n"

/** Shared navigation content; color, priority and layout belong to each theme. */
export type CatalogEntry = {
  href: string
  titleKey: TranslationKey
  descKey: TranslationKey
  icon: LucideIcon
}

export type CatalogCategory = {
  titleKey: TranslationKey
  games: CatalogEntry[]
}
