"use client"

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { EXPERIENCE_MESSAGES, type ExperienceContext } from "@xm-games/experience-bridge"
import {
  Gamepad2,
  LoaderCircle,
  Map,
  MapPinned,
  Settings2,
} from "lucide-react"

import { LanguageSwitcher } from "@/components/language-switcher"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import { ThemeSwitcher } from "@/features/themes/shared/theme-switcher"
import { useTheme } from "@/features/themes/shared/theme-provider"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLocale } from "@/lib/locale-context"
import type { Locale } from "@/lib/i18n"
import type { CatalogCategory, CatalogEntry } from "@/features/catalog/types"
import { themeLoadsWebglExperience } from "@/lib/theme"
import { INITIAL_SCENE_LOAD, SCENE_START_TIMEOUT_MS, sceneLoadReducer } from "./scene-loading"

export type ThemeFourGame = CatalogEntry
export type ThemeFourRoom = CatalogCategory

const COPY: Record<
  Locale,
  {
    experience: string
    loading: string
    failed: string
    retry: string
    map: string
    mapDescription: string
    mapClose: string
    room: string
    open: string
    settings: string
  }
> = {
  zh: {
    experience: "3D 手绘游戏世界",
    loading: "正在装配 3D 走廊…",
    failed: "3D 走廊暂时未能启动。可以重新加载，或通过游戏地图继续使用。",
    retry: "重新加载 3D",
    map: "游戏地图",
    mapDescription: "从 3D 世界直接进入 XM-Games 的全部游戏与离线工具。",
    mapClose: "关闭游戏地图",
    room: "房间",
    open: "进入",
    settings: "设置",
  },
  en: {
    experience: "Hand-drawn 3D game world",
    loading: "Building the 3D corridor…",
    failed: "The 3D corridor could not start. Retry, or use the game map to continue.",
    retry: "Reload 3D",
    map: "Game map",
    mapDescription: "Open every XM-Games experience and offline tool from the 3D world.",
    mapClose: "Close game map",
    room: "Room",
    open: "Open",
    settings: "Settings",
  },
  th: {
    experience: "โลกเกม 3D วาดมือ",
    loading: "กำลังสร้างโถงทางเดิน 3D…",
    failed: "ยังเปิดโถงทางเดิน 3D ไม่สำเร็จ ลองโหลดใหม่หรือใช้แผนที่เกมเพื่อเล่นต่อ",
    retry: "โหลด 3D ใหม่",
    map: "แผนที่เกม",
    mapDescription: "เปิดเกมและเครื่องมือออฟไลน์ทั้งหมดของ XM-Games จากโลก 3D",
    mapClose: "ปิดแผนที่เกม",
    room: "ห้อง",
    open: "เปิด",
    settings: "ตั้งค่า",
  },
}

const ROOM_NOTES: Record<Locale, Record<string, string>> = {
  zh: {
    categoryBingo: "号码、卡片与聚会桌",
    categoryBoard: "棋盘、策略与双人对局",
    categoryFocus: "注意力与视觉追踪训练",
    categoryPuzzle: "数字、记忆与逻辑谜题",
    categoryArcade: "方块、贪吃蛇与街机挑战",
    categoryTools: "追番与离线实用工具",
  },
  en: {
    categoryBingo: "Numbers, cards and party tables",
    categoryBoard: "Boards, strategy and two-player matches",
    categoryFocus: "Attention and visual tracking practice",
    categoryPuzzle: "Number, memory and logic puzzles",
    categoryArcade: "Blocks, snake and arcade challenges",
    categoryTools: "Anime tracking and offline utilities",
  },
  th: {
    categoryBingo: "ตัวเลข การ์ด และโต๊ะปาร์ตี้",
    categoryBoard: "กระดาน กลยุทธ์ และเกมสองคน",
    categoryFocus: "ฝึกสมาธิและการติดตามด้วยสายตา",
    categoryPuzzle: "ปริศนาตัวเลข ความจำ และตรรกะ",
    categoryArcade: "บล็อก งู และเกมอาร์เคด",
    categoryTools: "ติดตามอนิเมะและเครื่องมือออฟไลน์",
  },
}

export function ThemeFourHome({ rooms }: { rooms: ThemeFourRoom[] }) {
  const { theme } = useTheme()
  const { locale, t } = useLocale()
  const router = useRouter()
  const copy = COPY[locale]
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [scene, dispatchScene] = useReducer(sceneLoadReducer, INITIAL_SCENE_LOAD)
  const [mapOpen, setMapOpen] = useState(false)

  const sceneManifest = useMemo<ExperienceContext>(
    () => ({
      locale,
      categories: rooms.map((room) => ({
        id: room.titleKey,
        label: t(room.titleKey),
        description: ROOM_NOTES[locale][room.titleKey] ?? "",
        games: room.games.map((game) => ({
          href: game.href,
          label: t(game.titleKey),
          description: t(game.descKey),
        })),
      })),
    }),
    [locale, rooms, t],
  )

  const allowedRoutes = useMemo(
    () => new Set(rooms.flatMap((room) => room.games.map((game) => game.href))),
    [rooms],
  )

  const sendSceneManifest = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      {
        type: EXPERIENCE_MESSAGES.context,
        payload: sceneManifest,
      },
      window.location.origin,
    )
  }, [sceneManifest])

  useEffect(() => {
    const handleSceneMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow
      ) {
        return
      }

      if (event.data?.type === EXPERIENCE_MESSAGES.ready) {
        dispatchScene("ready")
        sendSceneManifest()
        return
      }

      if (event.data?.type === EXPERIENCE_MESSAGES.booted) {
        dispatchScene("booted")
        return
      }

      if (event.data?.type === EXPERIENCE_MESSAGES.failed) {
        dispatchScene("failed")
        return
      }

      if (
        event.data?.type === EXPERIENCE_MESSAGES.navigate &&
        typeof event.data.href === "string" &&
        allowedRoutes.has(event.data.href)
      ) {
        router.push(event.data.href)
      }
    }

    window.addEventListener("message", handleSceneMessage)
    return () => window.removeEventListener("message", handleSceneMessage)
  }, [allowedRoutes, router, sendSceneManifest])

  useEffect(() => {
    if (scene.phase === "ready") sendSceneManifest()
  }, [scene.phase, sendSceneManifest])

  useEffect(() => {
    if (!themeLoadsWebglExperience(theme)) return
    const timeout = window.setTimeout(() => dispatchScene("timeout"), SCENE_START_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [scene.attempt, theme])

  // The WebGL bundle and its textures must not load for Themes One–Three.
  if (!themeLoadsWebglExperience(theme)) return null

  return (
    <section
      className="theme-four-home theme-four-webgl-home"
      data-ready={scene.phase === "ready" ? "true" : "false"}
      data-scene-state={scene.phase}
      aria-label={copy.experience}
      aria-busy={scene.phase === "starting" || scene.phase === "booted"}
    >
      <iframe
        key={scene.attempt}
        ref={frameRef}
        className="theme-four-webgl-frame"
        src="/theme-four-experience/index.html"
        title={copy.experience}
        allow="autoplay; fullscreen"
        allowFullScreen
        onLoad={sendSceneManifest}
      />

      {scene.phase === "starting" && (
        <div className="theme-four-webgl-loading" role="status">
          <LoaderCircle aria-hidden="true" />
          <span>{copy.loading}</span>
        </div>
      )}

      {scene.phase === "failed" && (
        <div className="theme-four-webgl-loading theme-four-webgl-failure" role="alert">
          <p>{copy.failed}</p>
          <button type="button" onClick={() => dispatchScene("retry")}>{copy.retry}</button>
          <button type="button" onClick={() => setMapOpen(true)}>{copy.map}</button>
        </div>
      )}

      <header className="theme-four-webgl-toolbar">
        <span className="theme-four-webgl-brand">
          <Gamepad2 aria-hidden="true" />
          <span>
            <strong>XM-GAMES</strong>
            <small>{copy.experience}</small>
          </span>
        </span>

        <span className="theme-four-webgl-controls">
          <button
            type="button"
            className="theme-four-webgl-map-trigger"
            onClick={() => setMapOpen(true)}
          >
            <Map aria-hidden="true" />
            <span>{copy.map}</span>
          </button>
          <ThemeSwitcher compact />
          <LanguageSwitcher compact />
          <Link href="/settings" aria-label={copy.settings}>
            <Settings2 aria-hidden="true" />
          </Link>
        </span>
      </header>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent
          className="theme-four-map-dialog"
          closeLabel={copy.mapClose}
        >
          <DialogHeader className="theme-four-map-heading">
            <span className="theme-four-map-kicker">
              <MapPinned aria-hidden="true" />
              XM-GAMES · MAP
            </span>
            <DialogTitle>{copy.map}</DialogTitle>
            <DialogDescription>{copy.mapDescription}</DialogDescription>
          </DialogHeader>

          <div className="theme-four-map-grid">
            {rooms.map((room, index) => (
              <section key={room.titleKey} className="theme-four-map-room">
                <div className="theme-four-map-room-heading">
                  <span>{copy.room} {String(index + 1).padStart(2, "0")}</span>
                  <strong>{t(room.titleKey)}</strong>
                  <small>{ROOM_NOTES[locale][room.titleKey]}</small>
                </div>
                <div>
                  {room.games.map((game) => {
                    const Icon = game.icon
                    return (
                      <Link key={game.href} href={game.href}>
                        <Icon aria-hidden="true" />
                        <span>{t(game.titleKey)}</span>
                        <small>{copy.open}</small>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          <DialogClose asChild>
            <button type="button" className="theme-four-map-done">
              {copy.mapClose}
            </button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </section>
  )
}
