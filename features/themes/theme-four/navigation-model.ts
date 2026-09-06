export function getThemeFourActiveSection(pathname: string) {
  if (pathname === "/") return null
  if (pathname === "/anime-tracker") return "tracker"
  if (pathname === "/settings") return "settings"
  return "rooms"
}
