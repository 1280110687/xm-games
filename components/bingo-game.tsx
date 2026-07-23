"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Volume2, VolumeX, Play, Pause, RotateCcw } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { GameHeader } from "@/components/game-header"

// 泰语数字发音映射
const thaiNumbers: { [key: number]: string } = {
  0: "ศูนย์",
  1: "หนึ่ง",
  2: "สอง",
  3: "สาม",
  4: "สี่",
  5: "ห้า",
  6: "หก",
  7: "เจ็ด",
  8: "แปด",
  9: "เก้า",
  10: "สิบ",
  11: "สิบเอ็ด",
  12: "สิบสอง",
  13: "สิบสาม",
  14: "สิบสี่",
  15: "สิบห้า",
  16: "สิบหก",
  17: "สิบเจ็ด",
  18: "สิบแปด",
  19: "สิบเก้า",
  20: "ยี่สิบ",
  21: "ยี่สิบเอ็ด",
  22: "ยี่สิบสอง",
  23: "ยี่สิบสาม",
  24: "ยี่สิบสี่",
  25: "ยี่สิบห้า",
  26: "ยี่สิบหก",
  27: "ยี่สิบเจ็ด",
  28: "ยี่สิบแปด",
  29: "ยี่สิบเก้า",
  30: "สามสิบ",
  31: "สามสิบเอ็ด",
  32: "สามสิบสอง",
  33: "สามสิบสาม",
  34: "สามสิบสี่",
  35: "สามสิบห้า",
  36: "สามสิบหก",
  37: "สามสิบเจ็ด",
  38: "สามสิบแปด",
  39: "สามสิบเก้า",
  40: "สี่สิบ",
  41: "สี่สิบเอ็ด",
  42: "สี่สิบสอง",
  43: "สี่สิบสาม",
  44: "สี่สิบสี่",
  45: "สี่สิบห้า",
  46: "สี่สิบหก",
  47: "สี่สิบเจ็ด",
  48: "สี่สิบแปด",
  49: "สี่สิบเก้า",
  50: "ห้าสิบ",
  51: "ห้าสิบเอ็ด",
  52: "ห้าสิบสอง",
  53: "ห้าสิบสาม",
  54: "ห้าสิบสี่",
  55: "ห้าสิบห้า",
  56: "ห้าสิบหก",
  57: "ห้าสิบเจ็ด",
  58: "ห้าสิบแปด",
  59: "ห้าสิบเก้า",
  60: "หกสิบ",
  61: "หกสิบเอ็ด",
  62: "หกสิบสอง",
  63: "หกสิบสาม",
  64: "หกสิบสี่",
  65: "หกสิบห้า",
  66: "หกสิบหก",
  67: "หกสิบเจ็ด",
  68: "หกสิบแปด",
  69: "หกสิบเก้า",
  70: "เจ็ดสิบ",
  71: "เจ็ดสิบเอ็ด",
  72: "เจ็ดสิบสอง",
  73: "เจ็ดสิบสาม",
  74: "เจ็ดสิบสี่",
  75: "เจ็ดสิบห้า",
}

// Chinese number mappings
const chineseNumbers: { [key: number]: string } = {
  0: "零", 1: "一", 2: "二", 3: "三", 4: "四", 5: "五",
  6: "六", 7: "七", 8: "八", 9: "九", 10: "十",
}

function getChineseNumber(num: number): string {
  if (num <= 10) return chineseNumbers[num]
  if (num < 20) return `十${num === 10 ? "" : chineseNumbers[num - 10]}`
  const tens = Math.floor(num / 10)
  const ones = num % 10
  return `${chineseNumbers[tens]}十${ones === 0 ? "" : chineseNumbers[ones]}`
}

export function BingoGame() {
  const { t, locale } = useLocale()
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([])
  const [currentNumber, setCurrentNumber] = useState<number | null>(null)
  const [isAutoMode, setIsAutoMode] = useState(false)
  const [autoInterval, setAutoInterval] = useState(3)
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 所有可用数字 (1-75)
  const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
  const remainingNumbers = allNumbers.filter((n) => !drawnNumbers.includes(n))

  // 多语言语音播报
  const speakNumber = useCallback((number: number) => {
    if (!isSoundEnabled) return
    if (typeof window === "undefined" || !window.speechSynthesis) return

    // 取消之前的语音
    window.speechSynthesis.cancel()

    let text: string
    let lang: string

    switch (locale) {
      case "th":
        text = thaiNumbers[number] || String(number)
        lang = "th-TH"
        break
      case "zh":
        text = getChineseNumber(number)
        lang = "zh-CN"
        break
      case "en":
      default:
        text = String(number)
        lang = "en-US"
        break
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1

    window.speechSynthesis.speak(utterance)
  }, [isSoundEnabled, locale])

  // 抽取数字
  const drawNumber = useCallback(() => {
    if (remainingNumbers.length === 0) {
      setIsPlaying(false)
      return
    }

    const randomIndex = Math.floor(Math.random() * remainingNumbers.length)
    const newNumber = remainingNumbers[randomIndex]

    setCurrentNumber(newNumber)
    setDrawnNumbers((prev) => [...prev, newNumber])
    speakNumber(newNumber)
  }, [remainingNumbers, speakNumber])

  // 自动抽取逻辑
  useEffect(() => {
    if (isAutoMode && isPlaying && remainingNumbers.length > 0) {
      autoTimerRef.current = setInterval(() => {
        drawNumber()
      }, autoInterval * 1000)
    }

    return () => {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current)
      }
    }
  }, [isAutoMode, isPlaying, autoInterval, drawNumber, remainingNumbers.length])

  useEffect(() => {
    return () => window.speechSynthesis?.cancel()
  }, [])

  // 重置游戏
  const resetGame = () => {
    setDrawnNumbers([])
    setCurrentNumber(null)
    setIsPlaying(false)
    window.speechSynthesis.cancel()
  }

  // 开始/暂停自动抽取
  const toggleAutoPlay = () => {
    if (remainingNumbers.length === 0) return
    setIsPlaying(!isPlaying)
  }

  // 获取 BINGO 字母对应的颜色
  const getLetterColor = (num: number) => {
    if (num <= 15) return "bg-red-500" // B
    if (num <= 30) return "bg-orange-500" // I
    if (num <= 45) return "bg-yellow-500" // N
    if (num <= 60) return "bg-green-500" // G
    return "bg-blue-500" // O
  }

  // 获取 BINGO 字母
  const getLetter = (num: number) => {
    if (num <= 15) return "B"
    if (num <= 30) return "I"
    if (num <= 45) return "N"
    if (num <= 60) return "G"
    return "O"
  }

  return (
    <div className="bingo-shell game-page" data-page="bingo">
      <div
        className="game-content mx-auto w-full max-w-6xl"
        data-slot="game-content"
      >
        <GameHeader
          layout="centered"
          homeIcon="back"
          homeLabel={t("appName")}
          homeLabelMode="desktop"
          homeButtonClassName="text-muted-foreground hover:text-foreground"
          className="mb-4 sm:mb-6"
          titleClassName="text-xl font-bold tracking-wide text-foreground sm:text-2xl"
          title={
            <>
              <span className="text-red-500">B</span>
              <span className="text-orange-500">I</span>
              <span className="text-yellow-500">N</span>
              <span className="text-green-500">G</span>
              <span className="text-blue-500">O</span>
            </>
          }
        />

        <div className="bingo-workspace grid gap-4 lg:grid-cols-3 lg:gap-6">
          {/* 当前抽到的数字 */}
          <Card className="bingo-draw game-stage gap-0 overflow-hidden border-white/10 bg-card/70 py-0 lg:col-span-2">
            <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-6">
              <CardTitle className="text-base text-foreground sm:text-lg">{t("currentNumber")}</CardTitle>
              <div
                className="game-summary flex items-center gap-1.5 text-[11px] text-muted-foreground sm:gap-2 sm:text-sm"
                data-slot="game-summary"
              >
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 sm:px-2.5">
                  {t("drawn")} <strong className="font-semibold text-foreground">{drawnNumbers.length}</strong>
                </span>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 sm:px-2.5">
                  {t("remaining")} <strong className="font-semibold text-foreground">{remainingNumbers.length}</strong>
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-4 py-5 sm:px-6 sm:py-6">
              <div className="flex flex-col items-center justify-center gap-4 sm:gap-5">
                {currentNumber ? (
                  <div className="flex flex-col items-center gap-2.5">
                    <div
                      role="status"
                      aria-live="assertive"
                      aria-atomic="true"
                      className={`flex h-36 w-36 items-center justify-center rounded-full ${getLetterColor(currentNumber)} text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-4 ring-white/10 transition-all duration-300 sm:h-44 sm:w-44 md:h-52 md:w-52`}
                    >
                      <div className="text-center leading-none">
                        <div className="text-xl font-bold sm:text-2xl md:text-3xl">
                          {getLetter(currentNumber)}
                        </div>
                        <div className="mt-1 text-5xl font-bold tabular-nums sm:text-6xl md:text-7xl">
                          {currentNumber}
                        </div>
                      </div>
                    </div>
                    {locale !== "en" && (
                      <div className="text-base font-medium text-muted-foreground sm:text-lg">
                        {locale === "th"
                          ? thaiNumbers[currentNumber]
                          : getChineseNumber(currentNumber)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-full border border-white/[0.08] bg-gradient-to-br from-slate-700 to-slate-800 text-center text-slate-300 shadow-inner ring-4 ring-white/[0.025] sm:h-44 sm:w-44 md:h-52 md:w-52">
                    <span className="max-w-24 text-base font-medium sm:text-lg">{t("clickToDraw")}</span>
                  </div>
                )}

                {/* 操作按钮 */}
                <div
                  className="game-actions grid w-full max-w-sm grid-cols-2 gap-2.5 sm:gap-3"
                  data-slot="game-actions"
                >
                  {!isAutoMode ? (
                    <Button
                      size="lg"
                      onClick={drawNumber}
                      disabled={remainingNumbers.length === 0}
                      className="w-full px-3 text-base sm:text-lg"
                    >
                      {t("drawNumber")}
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      onClick={toggleAutoPlay}
                      disabled={remainingNumbers.length === 0}
                      className={`w-full px-3 text-base sm:text-lg ${
                        isPlaying
                          ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
                          : "bg-primary hover:bg-primary/90"
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-5 w-5" aria-hidden="true" /> {t("pause")}
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5" aria-hidden="true" /> {t("start")}
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={resetGame}
                    className="w-full border-white/10 bg-white/[0.035] px-3 text-base text-foreground sm:text-lg"
                  >
                    <RotateCcw className="h-5 w-5" aria-hidden="true" /> {t("reset")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 设置面板 */}
          <Card className="bingo-settings game-settings gap-0 overflow-hidden border-white/10 bg-card/70 py-0">
            <CardHeader className="border-b border-white/[0.07] px-4 py-4 sm:px-6">
              <CardTitle className="text-base text-foreground sm:text-lg">{t("settings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex min-h-11 items-center justify-between gap-4">
                <Label htmlFor="sound" className="flex min-h-11 flex-1 cursor-pointer items-center gap-2.5 text-sm text-foreground sm:text-base">
                  {isSoundEnabled ? (
                    <Volume2 className="h-5 w-5 text-primary" aria-hidden="true" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  )}
                  {t("voiceBroadcast")}
                </Label>
                <Switch
                  id="sound"
                  checked={isSoundEnabled}
                  onCheckedChange={setIsSoundEnabled}
                  className="h-6 w-11 [&_[data-slot=switch-thumb]]:size-5"
                />
              </div>

              <div className="flex min-h-11 items-center justify-between gap-4 border-t border-white/[0.06] pt-3">
                <Label htmlFor="auto" className="flex min-h-11 flex-1 cursor-pointer items-center text-sm text-foreground sm:text-base">
                  {t("autoDrawMode")}
                </Label>
                <Switch
                  id="auto"
                  checked={isAutoMode}
                  onCheckedChange={(checked) => {
                    setIsAutoMode(checked)
                    if (!checked) setIsPlaying(false)
                  }}
                  className="h-6 w-11 [&_[data-slot=switch-thumb]]:size-5"
                />
              </div>

              {isAutoMode && (
                <div className="space-y-3 rounded-xl border border-primary/15 bg-primary/[0.055] p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="auto-interval" className="text-sm text-foreground">
                      {t("drawInterval")}
                    </Label>
                    <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs font-semibold tabular-nums text-foreground">
                      {autoInterval} {t("seconds")}
                    </span>
                  </div>
                  <Slider
                    id="auto-interval"
                    aria-label={`${t("drawInterval")}: ${autoInterval} ${t("seconds")}`}
                    value={[autoInterval]}
                    onValueChange={([value]) => setAutoInterval(value)}
                    min={1}
                    max={20}
                    step={1}
                    className="h-7 w-full"
                  />
                </div>
              )}

              {drawnNumbers.length > 0 && (
                <div className="space-y-3 border-t border-white/[0.06] pt-4">
                  <Label className="text-sm text-foreground">{t("recentDraws")}</Label>
                  <div className="flex flex-wrap gap-2" role="list">
                    {drawnNumbers.slice(-10).reverse().map((num, index) => (
                      <div
                        key={`recent-${num}`}
                        role="listitem"
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${getLetterColor(num)} ${
                          index === 0 ? "ring-2 ring-white" : "opacity-70"
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="sr-only" role="status" aria-live="polite">
          {t("drawn")}: {drawnNumbers.length} / 75. {t("remaining")}: {remainingNumbers.length}
        </div>

        {/* 所有数字网格 */}
        <Card className="bingo-board game-stage mt-4 border-white/10 bg-card/70 sm:mt-6">
          <CardHeader>
            <CardTitle className="text-foreground">{t("numberBoard")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2" role="group" aria-label={t("numberBoard")}>
              {["B", "I", "N", "G", "O"].map((letter, idx) => (
                <div
                  key={letter}
                  className={`py-2 text-center text-xl font-bold text-white ${
                    idx === 0
                      ? "text-red-500"
                      : idx === 1
                      ? "text-orange-500"
                      : idx === 2
                      ? "text-yellow-500"
                      : idx === 3
                      ? "text-green-500"
                      : "text-blue-500"
                  }`}
                >
                  {letter}
                </div>
              ))}
              {Array.from({ length: 15 }, (_, row) =>
                [1, 2, 3, 4, 5].map((col) => {
                  const num = row + 1 + (col - 1) * 15
                  const isDrawn = drawnNumbers.includes(num)
                  return (
                    <div
                      key={num}
                      role="img"
                      aria-label={`${getLetter(num)} ${num}, ${isDrawn ? t("drawn") : t("remaining")}`}
                      className={`flex h-10 items-center justify-center rounded-md text-sm font-medium transition-all duration-300 md:h-12 md:text-base ${
                        isDrawn
                          ? `${getLetterColor(num)} text-white shadow-lg`
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {num}
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
