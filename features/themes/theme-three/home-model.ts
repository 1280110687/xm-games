import type { LucideIcon } from "lucide-react"
import type { TranslationKey } from "@/lib/i18n"

export type ThemeThreeCategory = {
  titleKey: TranslationKey
  games: {
    href: string
    titleKey: TranslationKey
    descKey: TranslationKey
    icon: LucideIcon
  }[]
}

/** Keep the shared catalog order and search localized names, descriptions and categories. */
export function filterThemeThreeCatalog(
  categories: readonly ThemeThreeCategory[],
  query: string,
  translate: (key: TranslationKey) => string,
) {
  const normalized = query.trim().toLocaleLowerCase()
  return categories
    .map((category) => ({
      ...category,
      games: category.games.filter(
        (game) =>
          !normalized ||
          [
            translate(category.titleKey),
            translate(game.titleKey),
            translate(game.descKey),
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(normalized),
      ),
    }))
    .filter((category) => category.games.length > 0)
}
