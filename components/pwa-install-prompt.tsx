"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import {
  Check,
  Download,
  Maximize2,
  MoreVertical,
  Share2,
  Smartphone,
  SquarePlus,
  WifiOff,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  detectPwaInstallPlatform,
  isPwaStandalone,
  PWA_INSTALL_ACCEPTED_AT_KEY,
  PWA_INSTALL_DISMISSED_AT_KEY,
  shouldOfferPwaInstall,
  type PwaInstallPlatform,
} from "@/features/pwa/install-prompt"
import { useLocale } from "@/lib/locale-context"

type InstallChoice = {
  outcome: "accepted" | "dismissed"
  platform: string
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<InstallChoice>
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

const PROMPT_DELAY_MS = 12_000
const STANDALONE_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: fullscreen)",
  "(display-mode: minimal-ui)",
] as const

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Installation remains available when storage is blocked.
  }
}

function getStandaloneMediaQueries(): MediaQueryList[] {
  return STANDALONE_QUERIES.map((query) => window.matchMedia(query))
}

function getStandaloneState(mediaQueries: readonly MediaQueryList[]): boolean {
  return isPwaStandalone({
    displayModeStandalone: mediaQueries.some((query) => query.matches),
    navigatorStandalone: (navigator as NavigatorWithStandalone).standalone === true,
  })
}

function addMediaQueryChangeListener(
  query: MediaQueryList,
  listener: () => void,
): void {
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", listener)
    return
  }

  query.addListener(listener)
}

function removeMediaQueryChangeListener(
  query: MediaQueryList,
  listener: () => void,
): void {
  if (typeof query.removeEventListener === "function") {
    query.removeEventListener("change", listener)
    return
  }

  query.removeListener(listener)
}

export function PwaInstallPrompt() {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<PwaInstallPlatform>("other")
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const revealTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return

    const mediaQueries = getStandaloneMediaQueries()
    if (getStandaloneState(mediaQueries)) return

    const detectedPlatform = detectPwaInstallPlatform({
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints,
    })
    const supportsNativePromptEvent = "onbeforeinstallprompt" in window
    const serviceWorkerSupported = "serviceWorker" in navigator
    setPlatform(detectedPlatform)

    const canOffer = (hasNativePrompt: boolean) => shouldOfferPwaInstall({
      isSecureContext: window.isSecureContext,
      serviceWorkerSupported,
      isStandalone: getStandaloneState(mediaQueries),
      platform: detectedPlatform,
      hasNativePrompt,
      supportsNativePromptEvent,
      dismissedAt: readStorage(PWA_INSTALL_DISMISSED_AT_KEY),
      acceptedAt: readStorage(PWA_INSTALL_ACCEPTED_AT_KEY),
      now: Date.now(),
    })

    const scheduleReveal = (hasNativePrompt: boolean) => {
      if (!canOffer(hasNativePrompt) || revealTimerRef.current !== null) return
      revealTimerRef.current = window.setTimeout(() => {
        revealTimerRef.current = null
        if (canOffer(hasNativePrompt)) setOpen(true)
      }, PROMPT_DELAY_MS)
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      const installEvent = event as BeforeInstallPromptEvent
      if (!canOffer(true)) return
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current)
        revealTimerRef.current = null
      }
      setDeferredPrompt(installEvent)
      setInstallError(false)
      scheduleReveal(true)
    }

    const handleInstalled = () => {
      writeStorage(PWA_INSTALL_ACCEPTED_AT_KEY, String(Date.now()))
      setDeferredPrompt(null)
      setGuideOpen(false)
      setOpen(false)
    }

    const handleDisplayModeChange = () => {
      if (!getStandaloneState(mediaQueries)) return
      setDeferredPrompt(null)
      setGuideOpen(false)
      setOpen(false)
    }

    const scheduleManualPrompt = () => scheduleReveal(false)

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)
    for (const query of mediaQueries) {
      addMediaQueryChangeListener(query, handleDisplayModeChange)
    }

    if (document.readyState === "complete") {
      scheduleManualPrompt()
    } else {
      window.addEventListener("load", scheduleManualPrompt, { once: true })
    }

    return () => {
      if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
      window.removeEventListener("load", scheduleManualPrompt)
      for (const query of mediaQueries) {
        removeMediaQueryChangeListener(query, handleDisplayModeChange)
      }
    }
  }, [])

  const hasNativePrompt = deferredPrompt !== null
  const isIos = platform === "ios"
  const promptMode = hasNativePrompt ? "native" : isIos ? "ios" : "manual"

  const dismiss = () => {
    writeStorage(PWA_INSTALL_DISMISSED_AT_KEY, String(Date.now()))
    setGuideOpen(false)
    setOpen(false)
  }

  const install = async () => {
    if (!deferredPrompt || installing) {
      dismiss()
      return
    }

    const installPrompt = deferredPrompt
    setInstalling(true)
    setInstallError(false)

    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      setDeferredPrompt(null)

      if (choice.outcome === "accepted") {
        writeStorage(PWA_INSTALL_ACCEPTED_AT_KEY, String(Date.now()))
      } else {
        writeStorage(PWA_INSTALL_DISMISSED_AT_KEY, String(Date.now()))
      }
      setOpen(false)
    } catch {
      setDeferredPrompt(null)
      setInstallError(true)
    } finally {
      setInstalling(false)
    }
  }

  const description = hasNativePrompt
    ? t("pwaInstallNativeDescription")
    : isIos
      ? t("pwaInstallIosDescription")
      : t("pwaInstallManualDescription")

  const installSteps = (
    <ol className="pwa-install-prompt__steps">
      <li>
        <span>{isIos ? <Share2 aria-hidden="true" /> : <MoreVertical aria-hidden="true" />}</span>
        <div>
          <strong>01</strong>
          <p>{isIos ? t("pwaInstallStepShare") : t("pwaInstallStepMenu")}</p>
        </div>
      </li>
      <li>
        <span><SquarePlus aria-hidden="true" /></span>
        <div>
          <strong>02</strong>
          <p>{t("pwaInstallStepAddHome")}</p>
        </div>
      </li>
      <li>
        <span><Check aria-hidden="true" /></span>
        <div>
          <strong>03</strong>
          <p>{t("pwaInstallStepConfirm")}</p>
        </div>
      </li>
    </ol>
  )

  return (
    <>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {open ? t("pwaInstallAnnouncement") : ""}
      </span>

      {open && (
        <aside
          className="pwa-install-prompt"
          data-mode={promptMode}
          role="region"
          aria-labelledby="pwa-install-title"
          aria-describedby="pwa-install-description"
          aria-busy={installing || undefined}
        >
          <button
            type="button"
            className="pwa-install-prompt__close"
            aria-label={t("close")}
            onClick={dismiss}
          >
            <X aria-hidden="true" />
          </button>

          <div className="pwa-install-prompt__brand">
            <span className="pwa-install-prompt__icon" aria-hidden="true">
              <Image
                src="/pwa-icon-192.png"
                alt=""
                width={64}
                height={64}
                unoptimized
              />
            </span>
            <div>
              <span className="pwa-install-prompt__eyebrow">
                <Smartphone aria-hidden="true" />
                {t("pwaInstallEyebrow")}
              </span>
              <h2 id="pwa-install-title">{t("pwaInstallTitle")}</h2>
            </div>
          </div>

          <p id="pwa-install-description" className="pwa-install-prompt__description">
            {description}
          </p>

          <div className="pwa-install-prompt__benefits" aria-label={t("pwaInstallBenefitsLabel")}>
            <span><SquarePlus aria-hidden="true" />{t("pwaInstallBenefitHome")}</span>
            <span><Maximize2 aria-hidden="true" />{t("pwaInstallBenefitStandalone")}</span>
            <span><WifiOff aria-hidden="true" />{t("pwaInstallBenefitOffline")}</span>
          </div>

          {installError && (
            <p className="pwa-install-prompt__error" role="status">
              {t("pwaInstallUnavailable")}
            </p>
          )}

          <div className="pwa-install-prompt__actions">
            <Button type="button" variant="ghost" onClick={dismiss}>
              {t("pwaInstallLater")}
            </Button>
            {hasNativePrompt ? (
              <Button type="button" onClick={() => void install()} disabled={installing}>
                <Download aria-hidden="true" />
                {installing ? t("pwaInstalling") : t("pwaInstallNow")}
              </Button>
            ) : (
              <Button type="button" onClick={() => setGuideOpen(true)} aria-haspopup="dialog">
                {isIos ? <Share2 aria-hidden="true" /> : <MoreVertical aria-hidden="true" />}
                {t("pwaInstallHowTo")}
              </Button>
            )}
          </div>
        </aside>
      )}

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="pwa-install-guide" closeLabel={t("close")}>
          <DialogHeader>
            <DialogTitle>{t("pwaInstallTitle")}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {installSteps}
          <DialogFooter>
            <Button
              type="button"
              className="pwa-install-guide__action"
              onClick={dismiss}
            >
              <Check aria-hidden="true" />
              {t("pwaInstallGotIt")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
