import type { TranslationKey } from "@/lib/i18n"
import type { ThemeId } from "@/lib/theme"
import type { ArcadeGameId } from "../../packages/arcade-bridge/src/index"

export const IMMERSIVE_GAMES = {
  "galaga": { titleKey: "galaga", descKey: "galagaDescription", source: "https://github.com/C0deWiz4rd010/retro-pocket-games" },
  "bubbo-bubbo": { titleKey: "bubboBubbo", descKey: "bubboBubboDescription", source: "https://github.com/pixijs/open-games/tree/main/bubbo-bubbo" },
  "puzzling-potions": { titleKey: "puzzlingPotions", descKey: "puzzlingPotionsDescription", source: "https://github.com/pixijs/open-games/tree/main/puzzling-potions" },
  "deep-field": { titleKey: "deepField", descKey: "deepFieldDescription", source: "https://github.com/cbhead/deep-field-td" },
  "pinball-schminball": { titleKey: "pinballSchminball", descKey: "pinballSchminballDescription", source: "https://github.com/igorski/pinball-schminball" },
  "radius-raid": { titleKey: "radiusRaid", descKey: "radiusRaidDescription", source: "https://github.com/jackrugile/radius-raid" },
} as const satisfies Record<ArcadeGameId, { titleKey: TranslationKey; descKey: TranslationKey; source: string }>

export function immersiveGameExitHref(theme: ThemeId) {
  if (theme === "theme-pocket") return "/#pocket-games"
  if (theme === "theme-three") return "/#theme-three-game-library"
  if (theme === "theme-retro") return "/#retro-games"
  return "/"
}

export function clampExitPosition(position: { x: number; y: number }, bounds: { left: number; top: number; right: number; bottom: number }, size = 44) {
  return {
    x: Math.max(bounds.left, Math.min(position.x, Math.max(bounds.left, bounds.right - size))),
    y: Math.max(bounds.top, Math.min(position.y, Math.max(bounds.top, bounds.bottom - size))),
  }
}
