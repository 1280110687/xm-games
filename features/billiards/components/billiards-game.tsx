"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Expand, Minimize, Pause, Play, RotateCcw } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/features/themes/shared/theme-provider"
import { readGameRenderPalette, parseGameRenderColor } from "@/lib/game-render-palette"
import { useLocale } from "@/lib/locale-context"
import styles from "./billiards-game.module.css"

const COPY = {
  zh: {
    title: "台球", description: "瞄准、蓄力，打出漂亮的一杆。", practice: "自由练习", bot: "挑战电脑", mode: "游戏模式", pause: "暂停", resume: "继续", restart: "新一局", fullscreen: "全屏", exitFullscreen: "退出全屏", loading: "正在布置球桌…", error: "球桌未能启动，请重试。", retry: "重试", rules: "玩法", close: "关闭", source: "源码", license: "开源许可", by: "基于 tailuge/billiards", rule1: "开始时左右拖动摆放白球，点击「确认摆球」。", rule2: "左右拖动球桌或点击箭头微调方向；拖动力度条，再点击「击球」。", rule3: "左下白球可调整击球点；相机按钮切换俯视与瞄准视角。", rule4: "自由练习可连续击球；挑战电脑遵循八球规则。先打完自己的全色或花色球，最后打进黑色 8 号球。", tip: "拖动瞄准 · 滑动力度 · 点击击球", confirm: "切换模式会开启新的一局。",
  },
  en: {
    title: "Billiards", description: "Find your angle. Make the shot.", practice: "Free practice", bot: "Play computer", mode: "Game mode", pause: "Pause", resume: "Resume", restart: "New game", fullscreen: "Fullscreen", exitFullscreen: "Exit fullscreen", loading: "Setting up the table…", error: "The table could not start. Please try again.", retry: "Retry", rules: "How to play", close: "Close", source: "Source", license: "License", by: "Based on tailuge/billiards", rule1: "Drag to position the cue ball, then select Confirm placement.", rule2: "Drag left or right to aim, or use the arrows for fine adjustments. Set the power slider, then select Hit.", rule3: "The cue ball at the bottom left adjusts spin. Use the camera button to change views.", rule4: "Practice lets you keep shooting. Computer mode follows eight-ball rules: clear your solids or stripes, then pocket the black 8 ball.", tip: "Drag to aim · Set power · Shoot", confirm: "Changing mode starts a new game.",
  },
  th: {
    title: "บิลเลียด", description: "เล็งให้ตรง ปรับแรง แล้วตีให้ลง", practice: "ฝึกอิสระ", bot: "เล่นกับคอมพิวเตอร์", mode: "โหมดเกม", pause: "หยุด", resume: "เล่นต่อ", restart: "เกมใหม่", fullscreen: "เต็มหน้าจอ", exitFullscreen: "ออกจากเต็มหน้าจอ", loading: "กำลังจัดโต๊ะ…", error: "เริ่มโต๊ะไม่ได้ โปรดลองอีกครั้ง", retry: "ลองใหม่", rules: "วิธีเล่น", close: "ปิด", source: "ซอร์สโค้ด", license: "ใบอนุญาต", by: "พัฒนาจาก tailuge/billiards", rule1: "ลากเพื่อวางลูกขาว แล้วยืนยันวางลูก", rule2: "ลากซ้ายขวาเพื่อเล็ง หรือใช้ลูกศรปรับละเอียด ปรับแรงแล้วกดตีลูก", rule3: "ลูกขาวด้านล่างซ้ายใช้ปรับจุดตี ปุ่มกล้องใช้เปลี่ยนมุมมอง", rule4: "โหมดฝึกเล่นได้ต่อเนื่อง โหมดคอมพิวเตอร์ใช้กติกาแปดลูก: เก็บลูกเต็มสีหรือลายของคุณ แล้วจึงลงลูกดำหมายเลข 8", tip: "ลากเพื่อเล็ง · ปรับแรง · ตีลูก", confirm: "เปลี่ยนโหมดจะเริ่มเกมใหม่",
  },
} as const

export function BilliardsGame() {
  const { locale, t } = useLocale()
  const { theme } = useTheme()
  const copy = COPY[locale]
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [stageElement, setStageElement] = useState<HTMLDivElement | null>(null)
  const [mode, setMode] = useState<"practice" | "bot">("practice")
  const [round, setRound] = useState(0)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [paused, setPaused] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [pendingMode, setPendingMode] = useState<"practice" | "bot" | null>(null)
  const confirmCopy = locale === "zh" ? {title:"开始新一局？",description:"当前对局进度将被清除。",cancel:"继续本局",start:"开始新局"}
    : locale === "th" ? {title:"เริ่มเกมใหม่หรือไม่?",description:"ความคืบหน้าของเกมปัจจุบันจะถูกล้าง",cancel:"เล่นเกมนี้ต่อ",start:"เริ่มเกมใหม่"}
      : {title:"Start a new game?",description:"Your current game will be cleared.",cancel:"Keep playing",start:"Start new game"}

  const sendContext = useCallback(() => {
    const palette = readGameRenderPalette()
    const css = getComputedStyle(document.documentElement)
    iframeRef.current?.contentWindow?.postMessage({
      channel: "xm-billiards", type: "context", theme, locale,
      palette: {
        ...palette,
        surface: parseGameRenderColor(css.getPropertyValue("--game-surface"), palette.light),
        onAccent: parseGameRenderColor(css.getPropertyValue("--game-on-accent"), palette.light),
      },
    }, window.location.origin)
  }, [theme, locale])

  const sendPause = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({channel:"xm-billiards",type:"pause",paused:paused || rulesOpen || pendingMode !== null || document.hidden},window.location.origin)
  }, [paused, rulesOpen, pendingMode])
  const ping = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({channel:"xm-billiards",type:"ping"},window.location.origin)
  }, [])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || event.origin !== window.location.origin || event.data?.channel !== "xm-billiards") return
      if (event.data.type === "ready") { sendContext(); sendPause(); setStatus("ready") }
      if (event.data.type === "error") setStatus("error")
    }
    window.addEventListener("message", onMessage)
    ping()
    return () => window.removeEventListener("message", onMessage)
  }, [sendContext, sendPause, ping])

  useEffect(() => { sendContext() }, [sendContext, status])
  useEffect(() => {
    sendPause()
    document.addEventListener("visibilitychange", sendPause)
    return () => document.removeEventListener("visibilitychange", sendPause)
  }, [sendPause, status])

  useEffect(() => {
    if (status !== "loading") return
    const timeout = window.setTimeout(() => setStatus("error"), 20000)
    return () => window.clearTimeout(timeout)
  }, [round, mode, status])

  useEffect(() => {
    if (!expanded) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false) }
    const changed = () => { if (!document.fullscreenElement) setExpanded(false) }
    window.addEventListener("keydown", escape)
    document.addEventListener("fullscreenchange", changed)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", escape)
      document.removeEventListener("fullscreenchange", changed)
    }
  }, [expanded])

  const restart = (nextMode = mode) => { setMode(nextMode); setStatus("loading"); setPaused(false); setPendingMode(null); setRound(value => value + 1) }
  const toggleFullscreen = async () => {
    if (expanded) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
      setExpanded(false)
    } else {
      setExpanded(true)
      await stageElement?.requestFullscreen?.().catch(() => {})
    }
  }

  return (
    <div className={`game-page ${styles.page}`} data-page="billiards" data-expanded={expanded}>
      <GameHeader title={copy.title} homeLabel={t("appName")} layout="centered" />
      <div ref={setStageElement} className={`${styles.stage} ${expanded ? styles.expanded : ""}`}>
        <div className={styles.toolbar}>
          <label className={styles.mode}>
            <span className="sr-only">{copy.mode}</span>
            <select aria-label={copy.mode} value={mode} onChange={event => setPendingMode(event.target.value as "practice" | "bot")}>
              <option value="practice">{copy.practice}</option><option value="bot">{copy.bot}</option>
            </select>
          </label>
          <div className={styles.actions}>
            <Button type="button" variant="outline" size="icon" aria-label={paused ? copy.resume : copy.pause} title={paused ? copy.resume : copy.pause} disabled={status !== "ready"} onClick={() => setPaused(value => !value)}>{paused ? <Play aria-hidden="true"/> : <Pause aria-hidden="true"/>}</Button>
            <Button type="button" variant="outline" size="icon" aria-label={copy.restart} title={copy.restart} onClick={() => setPendingMode(mode)}><RotateCcw aria-hidden="true"/></Button>
            <Button type="button" variant="outline" size="icon" aria-label={expanded ? copy.exitFullscreen : copy.fullscreen} title={expanded ? copy.exitFullscreen : copy.fullscreen} onClick={() => void toggleFullscreen()}>{expanded ? <Minimize aria-hidden="true"/> : <Expand aria-hidden="true"/>}</Button>
          </div>
        </div>
        <div className={styles.frame}>
          <iframe key={`${mode}-${round}`} ref={iframeRef} src={`/billiards-game/index.html#mode=${mode}`} title={copy.title} className={status === "ready" ? styles.ready : styles.loadingFrame} onLoad={() => {sendContext();sendPause();ping()}} sandbox="allow-scripts allow-same-origin" allow="fullscreen" />
          {status !== "ready" && <div className={styles.loader} role="status"><p>{status === "loading" ? copy.loading : copy.error}</p>{status === "error" && <Button onClick={() => restart()}>{copy.retry}</Button>}</div>}
        </div>
        <Dialog.Root open={pendingMode !== null} onOpenChange={open => {if (!open) setPendingMode(null)}}>
          <Dialog.Portal container={stageElement}>
            <Dialog.Overlay className={styles.confirmOverlay}/>
            <Dialog.Content className={styles.confirm}>
              <Dialog.Title>{confirmCopy.title}</Dialog.Title>
              <Dialog.Description>{confirmCopy.description}</Dialog.Description>
              <div><Dialog.Close asChild><Button variant="outline">{confirmCopy.cancel}</Button></Dialog.Close><Button onClick={() => restart(pendingMode ?? mode)}>{confirmCopy.start}</Button></div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <div className={styles.footer}>
        <div className={styles.footerCopy}>
          <span>{copy.tip}</span>
          <small>{copy.by} · <a href="/billiards-game/LICENSE.txt" target="_blank" rel="noreferrer">GPL-3.0</a> · <a href="/billiards-game/source.tar.gz" download>{copy.source}</a></small>
        </div>
        <GameRulesDialog triggerLabel={copy.rules} closeLabel={copy.close} onOpenChange={setRulesOpen} triggerClassName={styles.rulesTrigger}>
          <ol className={styles.rules}><li>{copy.rule1}</li><li>{copy.rule2}</li><li>{copy.rule3}</li><li>{copy.rule4}</li></ol>
        </GameRulesDialog>
      </div>
    </div>
  )
}
