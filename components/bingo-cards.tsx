"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useLocale } from "@/lib/locale-context"
import { GameHeader } from "@/components/game-header"
import { Plus, Trash2, Mic, MicOff, RotateCcw } from "lucide-react"
import { parseBingoNumbers } from "@/features/bingo/number-parser"

const SPEECH_LANGUAGE = {
  zh: "zh-CN",
  en: "en-US",
  th: "th-TH",
} as const

interface BingoCard {
  id: string
  numbers: (number | null)[][]
  name: string
}

// Generate a random Bingo card
function generateBingoCard(): (number | null)[][] {
  const card: (number | null)[][] = []
  const columns = [
    { min: 1, max: 15 },   // B
    { min: 16, max: 30 },  // I
    { min: 31, max: 45 },  // N
    { min: 46, max: 60 },  // G
    { min: 61, max: 75 },  // O
  ]

  for (let col = 0; col < 5; col++) {
    const { min, max } = columns[col]
    const available = Array.from({ length: max - min + 1 }, (_, i) => min + i)
    const selected: (number | null)[] = []
    
    for (let row = 0; row < 5; row++) {
      if (col === 2 && row === 2) {
        // Center is FREE
        selected.push(null)
      } else {
        const randomIndex = Math.floor(Math.random() * available.length)
        selected.push(available.splice(randomIndex, 1)[0])
      }
    }
    card.push(selected)
  }

  // Transpose to get rows
  const transposed: (number | null)[][] = []
  for (let row = 0; row < 5; row++) {
    transposed.push([])
    for (let col = 0; col < 5; col++) {
      transposed[row].push(card[col][row])
    }
  }

  return transposed
}

// Helper to check if a cell is marked
function isCellMarked(card: (number | null)[][], row: number, col: number, markedNumbers: Set<number>): boolean {
  const num = card[row][col]
  return num === null || markedNumbers.has(num) // FREE cell (null) is always marked
}

// Check if a card has Bingo
function checkBingo(card: (number | null)[][], markedNumbers: Set<number>): boolean {
  // Check rows
  for (let row = 0; row < 5; row++) {
    let rowComplete = true
    for (let col = 0; col < 5; col++) {
      if (!isCellMarked(card, row, col, markedNumbers)) {
        rowComplete = false
        break
      }
    }
    if (rowComplete) return true
  }

  // Check columns
  for (let col = 0; col < 5; col++) {
    let colComplete = true
    for (let row = 0; row < 5; row++) {
      if (!isCellMarked(card, row, col, markedNumbers)) {
        colComplete = false
        break
      }
    }
    if (colComplete) return true
  }

  // Check diagonals
  let diag1Complete = true
  let diag2Complete = true
  for (let i = 0; i < 5; i++) {
    if (!isCellMarked(card, i, i, markedNumbers)) diag1Complete = false
    if (!isCellMarked(card, i, 4 - i, markedNumbers)) diag2Complete = false
  }
  if (diag1Complete || diag2Complete) return true

  // Check outer four corners (positions: [0,0], [0,4], [4,0], [4,4])
  const outerCorners = [
    [0, 0], [0, 4], [4, 0], [4, 4]
  ]
  const outerCornersComplete = outerCorners.every(([row, col]) => 
    isCellMarked(card, row, col, markedNumbers)
  )
  if (outerCornersComplete) return true

  // Check inner four corners (positions: [1,1], [1,3], [3,1], [3,3])
  const innerCorners = [
    [1, 1], [1, 3], [3, 1], [3, 3]
  ]
  const innerCornersComplete = innerCorners.every(([row, col]) => 
    isCellMarked(card, row, col, markedNumbers)
  )
  if (innerCornersComplete) return true

  return false
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

export function BingoCards() {
  const { t, locale } = useLocale()
  const [cards, setCards] = useState<BingoCard[]>([])
  const [drawnNumbers, setDrawnNumbers] = useState<Set<number>>(new Set())
  const [inputNumber, setInputNumber] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const shouldListenRef = useRef(false)
  const mountedRef = useRef(false)
  const localeRef = useRef(locale)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [bingoCards, setBingoCards] = useState<Set<string>>(new Set()) // Track cards that have bingo'd

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
  }, [])

  // Speak "Bingo" announcement
  const speakBingo = useCallback((cardName: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return

    const langMap: Record<string, string> = {
      zh: "zh-CN",
      en: "en-US",
      th: "th-TH",
    }

    const bingoText: Record<string, string> = {
      zh: `${cardName} Bingo!`,
      en: `${cardName} Bingo!`,
      th: `${cardName} บิงโก!`,
    }

    const utterance = new SpeechSynthesisUtterance(bingoText[locale] || bingoText.en)
    utterance.lang = langMap[locale] || "en-US"
    utterance.rate = 0.9
    utterance.volume = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }, [locale])

  // Keep the active recognizer in sync without rebuilding its event handlers.
  useEffect(() => {
    localeRef.current = locale
    if (recognitionRef.current) {
      recognitionRef.current.lang = SPEECH_LANGUAGE[locale]
    }
  }, [locale])

  // Initialize recognition once and fully tear it down on unmount. A separate
  // intent ref prevents an async `end` event from reviving a stopped session.
  useEffect(() => {
    if (typeof window === "undefined") return

    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition
    setSpeechSupported(Boolean(SpeechRecognitionConstructor))
    if (!SpeechRecognitionConstructor) return

    mountedRef.current = true
    const recognition = new SpeechRecognitionConstructor()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = SPEECH_LANGUAGE[localeRef.current]

    recognitionRef.current = recognition

    const handleResult = (event: SpeechRecognitionEvent) => {
      const transcripts: string[] = []
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index]
        if (result.isFinal) transcripts.push(result[0].transcript.trim())
      }

      const numbers = parseBingoNumbers(transcripts.join(" "), localeRef.current)
      if (numbers.length > 0) {
        setDrawnNumbers((previous) => {
          const next = new Set(previous)
          numbers.forEach((number) => next.add(number))
          return next.size === previous.size ? previous : next
        })
      }
    }

    const handleError = (event: SpeechRecognitionErrorEvent) => {
      console.warn("[bingo] Speech recognition error:", event.error)
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldListenRef.current = false
        clearRestartTimer()
        if (mountedRef.current) setIsListening(false)
      } else if (event.error === "aborted" && !shouldListenRef.current && mountedRef.current) {
        setIsListening(false)
      }
    }

    const scheduleRestart = () => {
      clearRestartTimer()
      if (!mountedRef.current || !shouldListenRef.current) return

      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null
        if (
          !mountedRef.current ||
          !shouldListenRef.current ||
          recognitionRef.current !== recognition
        ) {
          return
        }

        try {
          recognition.start()
        } catch {
          scheduleRestart()
        }
      }, 150)
    }

    recognition.onresult = handleResult
    recognition.onerror = handleError
    recognition.onend = scheduleRestart
    recognition.onstart = () => {
      if (mountedRef.current && shouldListenRef.current) setIsListening(true)
    }

    return () => {
      mountedRef.current = false
      shouldListenRef.current = false
      clearRestartTimer()
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.onstart = null
      if (recognitionRef.current === recognition) recognitionRef.current = null
      try {
        recognition.abort()
      } catch {
        // The recognizer may already be inactive.
      }
    }
  }, [clearRestartTimer])

  useEffect(() => {
    return () => window.speechSynthesis?.cancel()
  }, [])

  const toggleListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) {
      console.warn("[bingo] Speech recognition not initialized")
      return
    }

    if (shouldListenRef.current) {
      shouldListenRef.current = false
      clearRestartTimer()
      setIsListening(false)
      try {
        recognition.abort()
      } catch {
        // The recognizer may already be inactive.
      }
      return
    }

    shouldListenRef.current = true
    recognition.lang = SPEECH_LANGUAGE[locale]
    try {
      recognition.start()
      setIsListening(true)
    } catch (error) {
      shouldListenRef.current = false
      clearRestartTimer()
      setIsListening(false)
      console.warn("[bingo] Failed to start speech recognition:", error)
    }
  }, [clearRestartTimer, locale])

  const addCard = useCallback(() => {
    const newCard: BingoCard = {
      id: crypto.randomUUID(),
      numbers: generateBingoCard(),
      name: `${t("card")} ${cards.length + 1}`,
    }
    setCards(prev => [...prev, newCard])
  }, [cards.length, t])

  const removeCard = useCallback((id: string) => {
    setCards(prev => prev.filter(card => card.id !== id))
  }, [])

  const handleInputNumber = useCallback(() => {
    const num = parseInt(inputNumber, 10)
    if (!isNaN(num) && num >= 1 && num <= 75) {
      setDrawnNumbers(prev => new Set([...prev, num]))
      setInputNumber("")
    }
  }, [inputNumber])

  const resetAll = useCallback(() => {
    setDrawnNumbers(new Set())
  }, [])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInputNumber()
    }
  }, [handleInputNumber])

  // Check for new Bingo and announce
  useEffect(() => {
    cards.forEach(card => {
      const hasBingo = checkBingo(card.numbers, drawnNumbers)
      if (hasBingo && !bingoCards.has(card.id)) {
        // New bingo detected!
        setBingoCards(prev => new Set([...prev, card.id]))
        speakBingo(card.name)
      } else if (!hasBingo && bingoCards.has(card.id)) {
        // Bingo was lost (e.g., after reset)
        setBingoCards(prev => {
          const newSet = new Set(prev)
          newSet.delete(card.id)
          return newSet
        })
      }
    })
  }, [cards, drawnNumbers, bingoCards, speakBingo])

  // Reset bingoCards when all marks are reset
  useEffect(() => {
    if (drawnNumbers.size === 0) {
      setBingoCards(new Set())
    }
  }, [drawnNumbers.size])

  const bingoLetters = ["B", "I", "N", "G", "O"]
  const letterColors = [
    "text-red-500",
    "text-orange-500",
    "text-yellow-500",
    "text-green-500",
    "text-blue-500",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Header */}
      <div className="mx-auto max-w-7xl">
        <GameHeader
          layout="tool"
          homeLabel={t("appName")}
          homeLabelMode="sr-only"
          homeButtonClassName="text-slate-400 hover:text-white"
          className="mb-6"
          titleClassName="text-2xl font-bold text-white md:text-3xl"
          title={
            <>
              <span className="text-red-500">B</span>
              <span className="text-orange-500">I</span>
              <span className="text-yellow-500">N</span>
              <span className="text-green-500">G</span>
              <span className="text-blue-500">O</span>
              <span className="ml-2 text-slate-400">{t("bingoCards")}</span>
            </>
          }
        />

        {/* Controls */}
        <Card className="mb-6 border-slate-700 bg-slate-800/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Number Input */}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={75}
                  value={inputNumber}
                  aria-label={t("enterNumber")}
                  onChange={(e) => setInputNumber(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t("enterNumber")}
                  className="w-32 border-slate-600 bg-slate-700 text-white"
                />
                <Button onClick={handleInputNumber} variant="secondary">
                  {t("confirm")}
                </Button>
              </div>

              {/* Voice Recognition */}
              {speechSupported && (
                <Button
                  onClick={toggleListening}
                  variant={isListening ? "destructive" : "outline"}
                  className={isListening ? "" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
                >
                  {isListening ? <MicOff className="mr-2 h-4 w-4" aria-hidden="true" /> : <Mic className="mr-2 h-4 w-4" aria-hidden="true" />}
                  {isListening ? t("stopListening") : t("startListening")}
                </Button>
              )}

              {/* Add Card */}
              <Button onClick={addCard} className="bg-green-600 hover:bg-green-700">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("addCard")}
              </Button>

              {/* Reset */}
              <Button onClick={resetAll} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("resetMarks")}
              </Button>

              {/* Stats */}
              <div className="ml-auto text-sm text-slate-400" role="status" aria-live="polite">
                {t("markedCount")}: <span className="font-bold text-white">{drawnNumbers.size}</span> / 75
              </div>
            </div>

            {/* Drawn Numbers Display */}
            {drawnNumbers.size > 0 && (
              <div className="mt-4 border-t border-slate-700 pt-4">
                <p className="mb-2 text-sm text-slate-400">{t("markedNumbers")}:</p>
                <div className="flex flex-wrap gap-1" role="list">
                  {Array.from(drawnNumbers).sort((a, b) => a - b).map(num => (
                    <span
                      key={num}
                      role="listitem"
                      className="inline-flex h-7 w-7 items-center justify-center rounded bg-amber-500/20 text-xs font-medium text-amber-400"
                    >
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cards Grid */}
        {cards.length === 0 ? (
          <Card className="border-slate-700 bg-slate-800/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="mb-4 text-slate-400">{t("noCards")}</p>
              <Button onClick={addCard} className="bg-green-600 hover:bg-green-700">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("addFirstCard")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((card) => {
              const hasBingo = checkBingo(card.numbers, drawnNumbers)
              return (
                <Card
                  key={card.id}
                  className={`border-slate-700 bg-slate-800/50 transition-all ${
                    hasBingo ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900" : ""
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-white">
                        {card.name}
                        {hasBingo && (
                          <span className="ml-2 rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-black" role="status" aria-live="assertive">
                            BINGO!
                          </span>
                        )}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCard(card.id)}
                        aria-label={`${t("delete")} ${card.name}`}
                        className="h-8 w-8 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Bingo Header */}
                    <div className="mb-1 grid grid-cols-5 gap-1">
                      {bingoLetters.map((letter, index) => (
                        <div
                          key={letter}
                          className={`flex h-8 items-center justify-center text-lg font-bold ${letterColors[index]}`}
                        >
                          {letter}
                        </div>
                      ))}
                    </div>
                    {/* Bingo Grid */}
                    <div className="grid grid-cols-5 gap-1" role="group" aria-label={card.name}>
                      {card.numbers.flat().map((num, index) => {
                        const isMarked = num !== null && drawnNumbers.has(num)
                        const isFree = num === null
                        return (
                          <div
                            key={index}
                            role="img"
                            aria-label={`${isFree ? "FREE" : num}${isFree || isMarked ? `, ${t("drawn")}` : ""}`}
                            className={`flex h-10 items-center justify-center rounded text-sm font-medium transition-all ${
                              isFree
                                ? "bg-amber-500/30 text-amber-400"
                                : isMarked
                                ? "bg-green-500 text-white"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {isFree ? "FREE" : num}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
