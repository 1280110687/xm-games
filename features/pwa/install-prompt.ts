export type PwaInstallPlatform = "android" | "ios" | "other"

export const PWA_INSTALL_DISMISSED_AT_KEY = "xm-games-pwa-install-dismissed-at:v1"
export const PWA_INSTALL_ACCEPTED_AT_KEY = "xm-games-pwa-install-accepted-at:v1"
export const PWA_INSTALL_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000
export const PWA_INSTALL_ACCEPTED_COOLDOWN_MS = 180 * 24 * 60 * 60 * 1000

type PlatformInput = {
  userAgent: string
  maxTouchPoints?: number
}

type StandaloneInput = {
  displayModeStandalone: boolean
  navigatorStandalone?: boolean
}

type InstallOfferInput = {
  isSecureContext: boolean
  serviceWorkerSupported: boolean
  isStandalone: boolean
  platform: PwaInstallPlatform
  hasNativePrompt: boolean
  supportsNativePromptEvent: boolean
  dismissedAt: string | null
  acceptedAt: string | null
  now: number
}

export function detectPwaInstallPlatform({
  userAgent,
  maxTouchPoints = 0,
}: PlatformInput): PwaInstallPlatform {
  const isIosDevice = /iPad|iPhone|iPod/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)

  if (isIosDevice) return "ios"
  if (/Android/i.test(userAgent)) return "android"
  return "other"
}

export function isPwaStandalone({
  displayModeStandalone,
  navigatorStandalone = false,
}: StandaloneInput): boolean {
  return displayModeStandalone || navigatorStandalone
}

export function isStoredTimestampActive(
  value: string | null,
  now: number,
  durationMs: number,
): boolean {
  if (value === null) return false

  const timestamp = Number(value)
  if (!Number.isFinite(timestamp)) return false

  const elapsed = now - timestamp
  return elapsed >= 0 && elapsed < durationMs
}

export function shouldOfferPwaInstall({
  isSecureContext,
  serviceWorkerSupported,
  isStandalone,
  platform,
  hasNativePrompt,
  supportsNativePromptEvent,
  dismissedAt,
  acceptedAt,
  now,
}: InstallOfferInput): boolean {
  if (!isSecureContext || !serviceWorkerSupported || isStandalone) return false
  if (isStoredTimestampActive(dismissedAt, now, PWA_INSTALL_DISMISS_COOLDOWN_MS)) return false
  if (isStoredTimestampActive(acceptedAt, now, PWA_INSTALL_ACCEPTED_COOLDOWN_MS)) return false

  if (hasNativePrompt) return true
  if (platform === "ios") return true
  if (platform === "android") return !supportsNativePromptEvent
  return false
}
