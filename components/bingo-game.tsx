"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Volume2, VolumeX, Play, Pause, RotateCcw } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { LanguageSwitcher } from "@/components/language-switcher"

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* 标题和语言切换 */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex w-full items-center justify-end">
            <LanguageSwitcher />
          </div>
          <h1 className="text-4xl font-bold text-white md:text-6xl">
            <span className="text-red-500">B</span>
            <span className="text-orange-500">I</span>
            <span className="text-yellow-500">N</span>
            <span className="text-green-500">G</span>
            <span className="text-blue-500">O</span>
          </h1>
          <p className="text-slate-400">{t("bingoSubtitle")}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* 当前抽到的数字 */}
          <Card className="border-slate-700 bg-slate-800/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">{t("currentNumber")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center gap-6">
                {currentNumber ? (
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className={`flex h-40 w-40 items-center justify-center rounded-full ${getLetterColor(currentNumber)} text-white shadow-2xl transition-all duration-300 md:h-56 md:w-56`}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold md:text-4xl">
                          {getLetter(currentNumber)}
                        </div>
                        <div className="text-5xl font-bold md:text-8xl">
                          {currentNumber}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-medium text-slate-300">
                      {thaiNumbers[currentNumber]}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-full bg-slate-700 text-slate-400 md:h-56 md:w-56">
                    <span className="text-xl">{t("clickToDraw")}</span>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex flex-wrap justify-center gap-4">
                  {!isAutoMode ? (
                    <Button
                      size="lg"
                      onClick={drawNumber}
                      disabled={remainingNumbers.length === 0}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-lg hover:from-blue-700 hover:to-blue-800"
                    >
                      {t("drawNumber")}
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      onClick={toggleAutoPlay}
                      disabled={remainingNumbers.length === 0}
                      className={`text-lg ${
                        isPlaying
                          ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
                          : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="mr-2 h-5 w-5" /> {t("pause")}
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-5 w-5" /> {t("start")}
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={resetGame}
                    className="border-slate-600 bg-transparent text-lg text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    <RotateCcw className="mr-2 h-5 w-5" /> {t("reset")}
                  </Button>
                </div>

                {/* 统计 */}
                <div className="text-center text-slate-400">
                  <p>
                    {t("drawn")}: {drawnNumbers.length} / 75 | {t("remaining")}:{" "}
                    {remainingNumbers.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 设置面板 */}
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white">{t("settings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 语音开关 */}
              <div className="flex items-center justify-between">
                <Label htmlFor="sound" className="flex items-center gap-2 text-slate-300">
                  {isSoundEnabled ? (
                    <Volume2 className="h-5 w-5" />
                  ) : (
                    <VolumeX className="h-5 w-5" />
                  )}
                  {t("voiceBroadcast")}
                </Label>
                <Switch
                  id="sound"
                  checked={isSoundEnabled}
                  onCheckedChange={setIsSoundEnabled}
                />
              </div>

              {/* 自动抽取开关 */}
              <div className="flex items-center justify-between">
                <Label htmlFor="auto" className="text-slate-300">
                  {t("autoDrawMode")}
                </Label>
                <Switch
                  id="auto"
                  checked={isAutoMode}
                  onCheckedChange={(checked) => {
                    setIsAutoMode(checked)
                    if (!checked) setIsPlaying(false)
                  }}
                />
              </div>

              {/* 自动抽取间隔 */}
              {isAutoMode && (
                <div className="space-y-3">
                  <Label className="text-slate-300">
                    {t("drawInterval")}: {autoInterval} {t("seconds")}
                  </Label>
                  <Slider
                    value={[autoInterval]}
                    onValueChange={([value]) => setAutoInterval(value)}
                    min={1}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}

              {/* 最近抽取的数字 */}
              <div className="space-y-3">
                <Label className="text-slate-300">{t("recentDraws")}</Label>
                <div className="flex flex-wrap gap-2">
                  {drawnNumbers.slice(-10).reverse().map((num, index) => (
                    <div
                      key={`recent-${num}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${getLetterColor(num)} ${
                        index === 0 ? "ring-2 ring-white" : "opacity-70"
                      }`}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 所有数字网格 */}
        <Card className="mt-6 border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">{t("numberBoard")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {/* BINGO 字母标题 */}
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
              {/* 数字网格 */}
              {Array.from({ length: 15 }, (_, row) =>
                [1, 2, 3, 4, 5].map((col) => {
                  const num = row + 1 + (col - 1) * 15
                  const isDrawn = drawnNumbers.includes(num)
                  return (
                    <div
                      key={num}
                      className={`flex h-10 items-center justify-center rounded-md text-sm font-medium transition-all duration-300 md:h-12 md:text-base ${
                        isDrawn
                          ? `${getLetterColor(num)} text-white shadow-lg`
                          : "bg-slate-700 text-slate-400"
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
