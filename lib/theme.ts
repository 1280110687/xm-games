export const themes = ["theme-one", "theme-two"] as const

export type ThemeId = (typeof themes)[number]

export const DEFAULT_THEME: ThemeId = "theme-one"
export const THEME_STORAGE_KEY = "xm-games-theme:v1"

export const THEME_CONFIG: Record<
  ThemeId,
  {
    colorScheme: "dark" | "light"
    themeColor: string
  }
> = {
  "theme-one": {
    colorScheme: "dark",
    themeColor: "#101421",
  },
  "theme-two": {
    colorScheme: "light",
    themeColor: "#f3f5f8",
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

export const themeBootstrapScript = `(() => {
  const fallback = ${JSON.stringify(DEFAULT_THEME)};
  const key = ${JSON.stringify(THEME_STORAGE_KEY)};
  const allowed = ${JSON.stringify(themes)};
  const themeColors = ${JSON.stringify({
    "theme-one": THEME_CONFIG["theme-one"].themeColor,
    "theme-two": THEME_CONFIG["theme-two"].themeColor,
  })};
  let theme = fallback;
  try {
    const stored = localStorage.getItem(key);
    if (stored && allowed.includes(stored)) theme = stored;
  } catch {}
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "theme-one");
  root.style.colorScheme = theme === "theme-one" ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", themeColors[theme]);
})();`
