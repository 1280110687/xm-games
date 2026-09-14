export const themes = [
  "theme-arcade",
  "theme-three",
  "theme-four",
] as const

export type ThemeId = (typeof themes)[number]

export const DEFAULT_THEME: ThemeId = "theme-three"
export const THEME_STORAGE_KEY = "xm-games-theme:v1"
// Keep retired IDs only at the persistence boundary, never in active UI options.
export const RETIRED_THEME_IDS = ["theme-one", "theme-two"] as const

export const THEME_CONFIG: Record<
  ThemeId,
  {
    colorScheme: "dark" | "light"
    themeColor: string
  }
> = {
  "theme-arcade": {
    colorScheme: "light",
    themeColor: "#faf9f6",
  },
  "theme-three": {
    colorScheme: "dark",
    themeColor: "#142d35",
  },
  "theme-four": {
    colorScheme: "light",
    themeColor: "#e9e1d2",
  },
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && themes.includes(value as ThemeId)
}

export function normalizeTheme(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME
}

export function themeUsesDarkChrome(theme: ThemeId): boolean {
  return THEME_CONFIG[theme].colorScheme === "dark"
}

export function themeLoadsWebglExperience(theme: ThemeId): boolean {
  return theme === "theme-four"
}

export const themeBootstrapScript = `(() => {
  const fallback = ${JSON.stringify(DEFAULT_THEME)};
  const key = ${JSON.stringify(THEME_STORAGE_KEY)};
  const allowed = ${JSON.stringify(themes)};
  const retired = ${JSON.stringify(RETIRED_THEME_IDS)};
  const config = ${JSON.stringify(THEME_CONFIG)};
  let theme = fallback;
  try {
    const stored = localStorage.getItem(key);
    if (stored && allowed.includes(stored)) theme = stored;
    else if (retired.includes(stored)) localStorage.setItem(key, fallback);
  } catch {}
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", config[theme].colorScheme === "dark");
  root.style.colorScheme = config[theme].colorScheme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", config[theme].themeColor);
})();`
