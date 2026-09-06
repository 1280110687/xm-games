/** Same-origin host/world protocol. The host retains the route allowlist. */
export const EXPERIENCE_MESSAGES = {
  ready: "xm-games:theme-four-ready",
  context: "xm-games:theme-four-context",
  navigate: "xm-games:theme-four-navigate",
} as const

export type ExperienceContext = {
  locale: "zh" | "en" | "th"
  categories: {
    id: string
    label: string
    description: string
    games: { href: string; label: string; description: string }[]
  }[]
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function isExperienceContext(value: unknown): value is ExperienceContext {
  if (!record(value) || typeof value.locale !== "string" || !["zh", "en", "th"].includes(value.locale)) return false
  return Array.isArray(value.categories) && value.categories.every((category) =>
    record(category) && typeof category.id === "string" &&
    typeof category.label === "string" && typeof category.description === "string" &&
    Array.isArray(category.games) && category.games.every((game) =>
      record(game) && typeof game.href === "string" && game.href.startsWith("/") &&
      !game.href.startsWith("//") && !game.href.includes("\\") &&
      typeof game.label === "string" && typeof game.description === "string",
    ),
  )
}

export function isContextMessage(event: MessageEvent, origin: string, source: MessageEventSource | null) {
  return source !== null && event.origin === origin && event.source === source &&
    event.data?.type === EXPERIENCE_MESSAGES.context && isExperienceContext(event.data.payload)
}
