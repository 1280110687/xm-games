"use client"

import Link from "next/link"
import { ArrowLeft, Globe2, Palette, ShieldCheck } from "lucide-react"

import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale-context"
import type { Locale } from "@/lib/i18n"

const SETTINGS_COPY: Record<
  Locale,
  {
    eyebrow: string
    title: string
    description: string
    back: string
    appearance: string
    appearanceDescription: string
    language: string
    languageDescription: string
    storageNote: string
  }
> = {
  zh: {
    eyebrow: "个性化",
    title: "设置",
    description: "在这里统一管理应用外观与显示语言。",
    back: "返回首页",
    appearance: "主题风格",
    appearanceDescription: "切换后立即应用，并在下次打开时保持。",
    language: "显示语言",
    languageDescription: "应用文案和页面标题会同步更新。",
    storageNote: "设置仅保存在当前设备中，离线使用时同样生效。",
  },
  en: {
    eyebrow: "Personalization",
    title: "Settings",
    description: "Manage the app appearance and display language in one place.",
    back: "Back to home",
    appearance: "Appearance",
    appearanceDescription: "Changes apply immediately and persist for your next visit.",
    language: "Display language",
    languageDescription: "App copy and page titles update together.",
    storageNote: "Settings stay on this device and remain available offline.",
  },
  th: {
    eyebrow: "ปรับแต่ง",
    title: "ตั้งค่า",
    description: "จัดการรูปแบบแอปและภาษาที่ใช้แสดงผลได้ในที่เดียว",
    back: "กลับหน้าหลัก",
    appearance: "รูปแบบธีม",
    appearanceDescription: "การเปลี่ยนแปลงมีผลทันทีและจะคงไว้เมื่อเปิดครั้งถัดไป",
    language: "ภาษาที่ใช้แสดงผล",
    languageDescription: "ข้อความในแอปและชื่อหน้าจะอัปเดตพร้อมกัน",
    storageNote: "การตั้งค่าจะเก็บไว้ในอุปกรณ์นี้และใช้งานแบบออฟไลน์ได้",
  },
}

export function SettingsPage() {
  const { locale } = useLocale()
  const copy = SETTINGS_COPY[locale]

  return (
    <div
      data-page="settings"
      className="settings-shell app-shell min-h-svh py-4 sm:py-8"
    >
      <div className="settings-container app-container max-w-3xl">
        <header className="settings-page-header mb-6 flex items-start gap-3 sm:mb-8">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="settings-back-button shrink-0"
          >
            <Link href="/" aria-label={copy.back}>
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="settings-eyebrow text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {copy.eyebrow}
            </p>
            <h1 className="settings-title mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {copy.title}
            </h1>
            <p className="settings-description mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              {copy.description}
            </p>
          </div>
        </header>

        <main className="settings-main">
          <section
            className="settings-panel surface-panel overflow-hidden"
            aria-label={copy.title}
          >
            <div className="settings-row">
              <span className="settings-row-icon" data-tone="violet">
                <Palette aria-hidden="true" />
              </span>
              <span className="settings-row-copy">
                <span className="settings-row-title">{copy.appearance}</span>
                <span className="settings-row-description">
                  {copy.appearanceDescription}
                </span>
              </span>
              <ThemeSwitcher className="settings-control" />
            </div>

            <div className="settings-row">
              <span className="settings-row-icon" data-tone="blue">
                <Globe2 aria-hidden="true" />
              </span>
              <span className="settings-row-copy">
                <span className="settings-row-title">{copy.language}</span>
                <span className="settings-row-description">
                  {copy.languageDescription}
                </span>
              </span>
              <LanguageSwitcher className="settings-control max-[359px]:!w-full" />
            </div>
          </section>

          <aside className="settings-storage-note" role="note">
            <ShieldCheck aria-hidden="true" />
            <p>{copy.storageNote}</p>
          </aside>
        </main>
      </div>
    </div>
  )
}
