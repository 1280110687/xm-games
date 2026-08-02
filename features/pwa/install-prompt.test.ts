import { describe, expect, it } from "vitest"

import {
  detectPwaInstallPlatform,
  isPwaStandalone,
  isStoredTimestampActive,
  PWA_INSTALL_ACCEPTED_COOLDOWN_MS,
  PWA_INSTALL_DISMISS_COOLDOWN_MS,
  shouldOfferPwaInstall,
} from "./install-prompt"

const NOW = Date.UTC(2026, 7, 2)

function createOffer(overrides: Partial<Parameters<typeof shouldOfferPwaInstall>[0]> = {}) {
  return {
    isSecureContext: true,
    serviceWorkerSupported: true,
    isStandalone: false,
    platform: "android" as const,
    hasNativePrompt: true,
    supportsNativePromptEvent: true,
    dismissedAt: null,
    acceptedAt: null,
    now: NOW,
    ...overrides,
  }
}

describe("PWA install platform detection", () => {
  it("detects Android browsers", () => {
    expect(detectPwaInstallPlatform({
      userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/138 Mobile Safari/537.36",
    })).toBe("android")
  })

  it("detects iPhone and classic iPad user agents", () => {
    expect(detectPwaInstallPlatform({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)",
    })).toBe("ios")
    expect(detectPwaInstallPlatform({
      userAgent: "Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X)",
    })).toBe("ios")
  })

  it("detects iPadOS desktop user agents without misclassifying a Mac", () => {
    const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Safari/605.1.15"

    expect(detectPwaInstallPlatform({ userAgent, maxTouchPoints: 5 })).toBe("ios")
    expect(detectPwaInstallPlatform({ userAgent, maxTouchPoints: 0 })).toBe("other")
  })
})

describe("PWA standalone detection", () => {
  it("accepts standards-based and legacy iOS standalone signals", () => {
    expect(isPwaStandalone({ displayModeStandalone: true })).toBe(true)
    expect(isPwaStandalone({
      displayModeStandalone: false,
      navigatorStandalone: true,
    })).toBe(true)
    expect(isPwaStandalone({ displayModeStandalone: false })).toBe(false)
  })
})

describe("PWA install offer policy", () => {
  it("offers native Chromium installation and iOS manual installation", () => {
    expect(shouldOfferPwaInstall(createOffer())).toBe(true)
    expect(shouldOfferPwaInstall(createOffer({
      platform: "ios",
      hasNativePrompt: false,
      supportsNativePromptEvent: false,
    }))).toBe(true)
  })

  it("offers a manual fallback on Android browsers without the native event", () => {
    expect(shouldOfferPwaInstall(createOffer({
      hasNativePrompt: false,
      supportsNativePromptEvent: false,
    }))).toBe(true)
    expect(shouldOfferPwaInstall(createOffer({
      hasNativePrompt: false,
      supportsNativePromptEvent: true,
    }))).toBe(false)
  })

  it("does not offer installation in unsupported or already-installed contexts", () => {
    expect(shouldOfferPwaInstall(createOffer({ isSecureContext: false }))).toBe(false)
    expect(shouldOfferPwaInstall(createOffer({ serviceWorkerSupported: false }))).toBe(false)
    expect(shouldOfferPwaInstall(createOffer({ isStandalone: true }))).toBe(false)
    expect(shouldOfferPwaInstall(createOffer({
      platform: "other",
      hasNativePrompt: false,
    }))).toBe(false)
  })

  it("honors dismissal and accepted-install cooldowns", () => {
    expect(shouldOfferPwaInstall(createOffer({
      dismissedAt: String(NOW - PWA_INSTALL_DISMISS_COOLDOWN_MS + 1),
    }))).toBe(false)
    expect(shouldOfferPwaInstall(createOffer({
      dismissedAt: String(NOW - PWA_INSTALL_DISMISS_COOLDOWN_MS),
    }))).toBe(true)
    expect(shouldOfferPwaInstall(createOffer({
      acceptedAt: String(NOW - PWA_INSTALL_ACCEPTED_COOLDOWN_MS + 1),
    }))).toBe(false)
  })

  it("ignores malformed and future timestamps", () => {
    expect(isStoredTimestampActive("not-a-number", NOW, 1000)).toBe(false)
    expect(isStoredTimestampActive(String(NOW + 1), NOW, 1000)).toBe(false)
  })
})
