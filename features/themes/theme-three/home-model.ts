import type { CatalogCategory } from "@/features/catalog/types"
import type { TranslationKey } from "@/lib/i18n"

export type ThemeThreeCategory = CatalogCategory

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
