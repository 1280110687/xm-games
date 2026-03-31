"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useLocale } from "@/lib/locale-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Plus, Trash2, Mic, MicOff, RotateCcw, Home } from "lucide-react"
import Link from "next/link"

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
  const [bingoCards, setBingoCards] = useState<Set<string>>(new Set()) // Track cards that have bingo'd

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

  // Check speech recognition support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      setSpeechSupported(!!SpeechRecognition)
    }
  }, [])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === "undefined") return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false

    // Set language based on locale
    const langMap: Record<string, string> = {
      zh: "zh-CN",
      en: "en-US",
      th: "th-TH",
    }
    recognition.lang = langMap[locale] || "en-US"

    recognition.onresult = (event) => {
      const last = event.results.length - 1
      const transcript = event.results[last][0].transcript.trim()
      
      // Extract numbers from speech
      const numbers = extractNumbersFromSpeech(transcript, locale)
      if (numbers.length > 0) {
        numbers.forEach(num => {
          if (num >= 1 && num <= 75) {
            setDrawnNumbers(prev => new Set([...prev, num]))
          }
        })
      }
    }

    recognition.onerror = (event) => {
      console.log("[v0] Speech recognition error:", event.error)
      if (event.error === "not-allowed") {
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      if (isListening) {
        recognition.start()
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [locale, isListening])

  // Extract numbers from speech in different languages
  function extractNumbersFromSpeech(text: string, lang: string): number[] {
    const numbers: number[] = []
    
    // Thai number words
    const thaiNumbers: Record<string, number> = {
      "หนึ่ง": 1, "สอง": 2, "สาม": 3, "สี่": 4, "ห้า": 5,
      "หก": 6, "เจ็ด": 7, "แปด": 8, "เก้า": 9, "สิบ": 10,
      "ศูนย์": 0,
    }

    // Chinese number words
    const chineseNumbers: Record<string, number> = {
      "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
      "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
      "零": 0,
    }

    // Try to extract digit numbers first
    const digitMatches = text.match(/\d+/g)
    if (digitMatches) {
      digitMatches.forEach(match => {
        const num = parseInt(match, 10)
        if (!isNaN(num)) numbers.push(num)
      })
    }

    // Extract Thai numbers
    if (lang === "th") {
      Object.entries(thaiNumbers).forEach(([word, num]) => {
        if (text.includes(word)) numbers.push(num)
      })
    }

    // Extract Chinese numbers
    if (lang === "zh") {
      Object.entries(chineseNumbers).forEach(([word, num]) => {
        if (text.includes(word)) numbers.push(num)
      })
    }

    return numbers
  }

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (error) {
        console.log("[v0] Failed to start speech recognition:", error)
      }
    }
  }, [isListening])

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
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white md:text-3xl">
              <span className="text-red-500">B</span>
              <span className="text-orange-500">I</span>
              <span className="text-yellow-500">N</span>
              <span className="text-green-500">G</span>
              <span className="text-blue-500">O</span>
              <span className="ml-2 text-slate-400">{t("bingoCards")}</span>
            </h1>
          </div>
          <LanguageSwitcher />
        </div>

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
                  {isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                  {isListening ? t("stopListening") : t("startListening")}
                </Button>
              )}

              {/* Add Card */}
              <Button onClick={addCard} className="bg-green-600 hover:bg-green-700">
                <Plus className="mr-2 h-4 w-4" />
                {t("addCard")}
              </Button>

              {/* Reset */}
              <Button onClick={resetAll} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("resetMarks")}
              </Button>

              {/* Stats */}
              <div className="ml-auto text-sm text-slate-400">
                {t("markedCount")}: <span className="font-bold text-white">{drawnNumbers.size}</span> / 75
              </div>
            </div>

            {/* Drawn Numbers Display */}
            {drawnNumbers.size > 0 && (
              <div className="mt-4 border-t border-slate-700 pt-4">
                <p className="mb-2 text-sm text-slate-400">{t("markedNumbers")}:</p>
                <div className="flex flex-wrap gap-1">
                  {Array.from(drawnNumbers).sort((a, b) => a - b).map(num => (
                    <span
                      key={num}
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
                <Plus className="mr-2 h-4 w-4" />
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
                          <span className="ml-2 rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">
                            BINGO!
                          </span>
                        )}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCard(card.id)}
                        className="h-8 w-8 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
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
                    <div className="grid grid-cols-5 gap-1">
                      {card.numbers.flat().map((num, index) => {
                        const isMarked = num !== null && drawnNumbers.has(num)
                        const isFree = num === null
                        return (
                          <div
                            key={index}
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
