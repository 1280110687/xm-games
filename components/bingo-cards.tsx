"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useLocale } from "@/lib/locale-context"
import { GameHeader } from "@/components/game-header"
import {
  BingoLanGuestPanel,
  BingoModeSwitch,
  type BingoPlayMode,
} from "@/components/bingo-lan-panels"
import {
  ChevronDown,
  Grid2X2,
  Mic,
  MicOff,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  X,
} from "lucide-react"
import { parseBingoNumbers } from "@/features/bingo/number-parser"
import {
  checkBingo,
  getMarkedNumbersNewestFirst,
  removeMarkedNumber,
} from "@/features/bingo/card-rules"
import {
  createBingoCard,
  type BingoCard,
} from "@/features/bingo/cards"
import { BINGO_LAN_MAX_CARDS } from "@/features/bingo/lan-game"
import { useBingoLanGuest } from "@/features/bingo/use-bingo-lan"

const BINGO_CARD_LAYOUT_STORAGE_KEY = "xm-games-bingo-cards-layout:v1"

const SPEECH_LANGUAGE = {
  zh: "zh-CN",
  en: "en-US",
  th: "th-TH",
} as const

type BingoCardLayout = "single" | "double"

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

export function BingoCards() {
  const { t, locale } = useLocale()
  const [mode, setMode] = useState<BingoPlayMode>("local")
  const [invitedRoomId, setInvitedRoomId] = useState("")
  const [cards, setCards] = useState<BingoCard[]>([])
  const [drawnNumbers, setDrawnNumbers] = useState<Set<number>>(new Set())
  const [inputNumber, setInputNumber] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [cardLayout, setCardLayout] = useState<BingoCardLayout>("single")
  const [markedNumbersExpanded, setMarkedNumbersExpanded] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const shouldListenRef = useRef(false)
  const mountedRef = useRef(false)
  const localeRef = useRef(locale)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [bingoCards, setBingoCards] = useState<Set<string>>(new Set()) // Track cards that have bingo'd
  const lan = useBingoLanGuest(invitedRoomId)
  const activeDrawnNumbers = useMemo(() => (
    mode === "lan" ? new Set(lan.room?.drawnNumbers ?? []) : drawnNumbers
  ), [drawnNumbers, lan.room?.drawnNumbers, mode])
  const cardsEditable = mode === "local" || (
    mode === "lan"
    && !lan.profile?.ready
    && (!lan.room || lan.room.phase === "lobby")
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomId = params.get("room")?.replace(/\D/gu, "").slice(0, 6) ?? ""
    if (params.get("mode") === "lan" || roomId.length === 6) {
      setMode("lan")
      setInvitedRoomId(roomId)
      setCards((previous) => (
        previous.length > 0 ? previous : [createBingoCard(`${t("card")} 1`)]
      ))
    }
  }, [t])

  useEffect(() => {
    if (!lan.profile) return
    setMode("lan")
    setCards(lan.profile.cards)
  }, [lan.profile])

  useEffect(() => {
    try {
      const storedLayout = window.localStorage.getItem(BINGO_CARD_LAYOUT_STORAGE_KEY)
      if (storedLayout === "single" || storedLayout === "double") {
        setCardLayout(storedLayout)
      }
    } catch {
      // Layout selection remains usable even when storage is unavailable.
    }
  }, [])

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

  useEffect(() => {
    if (mode !== "lan" || !shouldListenRef.current) return
    shouldListenRef.current = false
    clearRestartTimer()
    setIsListening(false)
    try {
      recognitionRef.current?.abort()
    } catch {
      // The recognizer may already be inactive.
    }
  }, [clearRestartTimer, mode])

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
    if (!cardsEditable || (mode === "lan" && cards.length >= BINGO_LAN_MAX_CARDS)) return
    const next = [...cards, createBingoCard(`${t("card")} ${cards.length + 1}`)]
    setCards(next)
    if (mode === "lan" && lan.profile) lan.replaceCards(next)
  }, [cards, cardsEditable, lan, mode, t])

  const removeCard = useCallback((id: string) => {
    if (!cardsEditable) return
    const next = cards.filter(card => card.id !== id)
    setCards(next)
    if (mode === "lan" && lan.profile) lan.replaceCards(next)
  }, [cards, cardsEditable, lan, mode])

  const handleInputNumber = useCallback(() => {
    if (mode !== "local") return
    const num = parseInt(inputNumber, 10)
    if (!isNaN(num) && num >= 1 && num <= 75) {
      setDrawnNumbers(prev => new Set([...prev, num]))
      setInputNumber("")
    }
  }, [inputNumber, mode])

  const resetAll = useCallback(() => {
    if (mode !== "local") return
    setDrawnNumbers(new Set())
    setMarkedNumbersExpanded(false)
  }, [mode])

  const undoMarkedNumber = useCallback((number: number) => {
    if (mode !== "local") return
    setDrawnNumbers((previous) => removeMarkedNumber(previous, number))
  }, [mode])

  const updateCardLayout = useCallback((layout: BingoCardLayout) => {
    setCardLayout(layout)
    try {
      window.localStorage.setItem(BINGO_CARD_LAYOUT_STORAGE_KEY, layout)
    } catch {
      // Keep the in-memory selection when storage is unavailable.
    }
  }, [])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInputNumber()
    }
  }, [handleInputNumber])

  // Check for new Bingo and announce
  useEffect(() => {
    cards.forEach(card => {
      const hasBingo = checkBingo(card.numbers, activeDrawnNumbers)
      if (hasBingo && !bingoCards.has(card.id)) {
        // New bingo detected!
        setBingoCards(prev => new Set([...prev, card.id]))
        speakBingo(card.name)
        if (mode === "lan") lan.submitClaim(card.id)
      } else if (!hasBingo && bingoCards.has(card.id)) {
        // Bingo was lost (e.g., after reset)
        setBingoCards(prev => {
          const newSet = new Set(prev)
          newSet.delete(card.id)
          return newSet
        })
      }
    })
  }, [activeDrawnNumbers, bingoCards, cards, lan, mode, speakBingo])

  // Reset bingoCards when all marks are reset
  useEffect(() => {
    if (activeDrawnNumbers.size === 0) {
      setBingoCards(new Set())
      setMarkedNumbersExpanded(false)
    }
  }, [activeDrawnNumbers.size])

  const bingoLetters = ["B", "I", "N", "G", "O"]
  const letterColors = [
    "text-red-500",
    "text-orange-500",
    "text-yellow-500",
    "text-green-500",
    "text-blue-500",
  ]

  const updateMode = (nextMode: BingoPlayMode) => {
    if (lan.profile) return
    setMode(nextMode)
    if (nextMode === "lan" && cards.length === 0) {
      setCards([createBingoCard(`${t("card")} 1`)])
    }
  }

  const joinLanRoom = (roomId: string, nickname: string) => {
    const joinCards = cards.length > 0
      ? cards
      : [createBingoCard(`${t("card")} 1`)]
    if (cards.length === 0) setCards(joinCards)
    lan.join(roomId, nickname, joinCards)
  }

  const localPlayerWon = Boolean(
    lan.profile
    && lan.room?.winners.some((winner) => winner.playerId === lan.profile?.playerId),
  )

  return (
    <div className="game-page" data-page="bingo-cards" data-mode={mode}>
      {/* Header */}
      <div
        className="game-content mx-auto w-full min-w-0 max-w-7xl"
        data-slot="game-content"
      >
        <GameHeader
          layout="tool"
          homeLabel={t("appName")}
          homeLabelMode="sr-only"
          homeButtonClassName="text-muted-foreground hover:text-foreground"
          className="mb-6"
          titleClassName="text-2xl font-bold text-foreground md:text-3xl"
          title={
            <>
              <span className="text-red-500">B</span>
              <span className="text-orange-500">I</span>
              <span className="text-yellow-500">N</span>
              <span className="text-green-500">G</span>
              <span className="text-blue-500">O</span>
              <span className="ml-2 text-muted-foreground">{t("bingoCards")}</span>
            </>
          }
        />

        <BingoModeSwitch
          mode={mode}
          disabled={Boolean(lan.profile)}
          onChange={updateMode}
        />

        {mode === "lan" && (
          <>
            <BingoLanGuestPanel
              invitedRoomId={invitedRoomId}
              profile={lan.profile}
              room={lan.room}
              status={lan.status}
              error={lan.error}
              cardCount={cards.length}
              onJoin={joinLanRoom}
              onReady={lan.setReady}
              onLeave={lan.leave}
              onRetry={lan.retry}
            />
            {lan.room && lan.room.phase !== "lobby" && (
              <div className="bingo-lan-current mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-card/75 p-4" role="status" aria-live="polite">
                <span className="text-sm text-muted-foreground">{t("currentNumber")}</span>
                <strong className="text-3xl tabular-nums text-foreground">{lan.room.currentNumber ?? "—"}</strong>
                <span className="text-sm text-muted-foreground">{t("drawn")} {lan.room.drawRevision} / 75</span>
              </div>
            )}
            {mode === "lan" && bingoCards.size > 0 && !localPlayerWon && (
              <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-300" role="status">
                {t("bingoLanWinnerNotice")}
              </p>
            )}
            {localPlayerWon && (
              <p className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 font-semibold text-emerald-300" role="status">
                {t("bingoLanWinners")}: {lan.profile?.nickname}
              </p>
            )}
          </>
        )}

        {/* Controls */}
        <Card className="bingo-cards-toolbar game-actions mb-6 gap-0 border-white/10 bg-card/70 py-0">
          <CardContent className="p-4">
            <div className="bingo-cards-toolbar-main flex flex-wrap items-center gap-4">
              {/* Number Input */}
              {mode === "local" && (
                <div className="bingo-cards-number-entry flex min-w-0 items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={75}
                    value={inputNumber}
                    aria-label={t("enterNumber")}
                    onChange={(e) => setInputNumber(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t("enterNumber")}
                    className="min-w-0"
                  />
                  <Button onClick={handleInputNumber} variant="secondary">
                    {t("confirm")}
                  </Button>
                </div>
              )}

              <div className="bingo-cards-toolbar-actions flex flex-wrap items-center gap-2">
                {/* Voice Recognition */}
                {mode === "local" && speechSupported && (
                  <Button
                    onClick={toggleListening}
                    variant={isListening ? "destructive" : "outline"}
                    aria-label={isListening ? t("stopListening") : t("startListening")}
                    aria-pressed={isListening}
                    className={isListening ? "" : "border-white/10 text-foreground"}
                  >
                    {isListening ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
                    <span className="bingo-action-label">
                      {isListening ? t("stopListening") : t("startListening")}
                    </span>
                  </Button>
                )}

                {/* Add Card */}
                <Button
                  onClick={addCard}
                  aria-label={t("addCard")}
                  disabled={!cardsEditable || (mode === "lan" && cards.length >= BINGO_LAN_MAX_CARDS)}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span className="bingo-action-label">{t("addCard")}</span>
                </Button>

                {/* Reset */}
                {mode === "local" && (
                  <Button onClick={resetAll} variant="outline" aria-label={t("resetMarks")}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    <span className="bingo-action-label">{t("resetMarks")}</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="bingo-cards-toolbar-meta mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
              <div
                className="game-summary text-sm text-muted-foreground"
                data-slot="game-summary"
                role="status"
                aria-live="polite"
              >
                {t("markedCount")}: <span className="font-bold text-foreground">{activeDrawnNumbers.size}</span> / 75
              </div>

              <div
                className="bingo-cards-layout-toggle flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.035] p-1"
                role="group"
                aria-label={t("cardLayout")}
              >
                <Button
                  type="button"
                  size="sm"
                  variant={cardLayout === "single" ? "secondary" : "ghost"}
                  aria-label={t("singleCardLayout")}
                  aria-pressed={cardLayout === "single"}
                  aria-controls="bingo-cards-library"
                  onClick={() => updateCardLayout("single")}
                >
                  <Square className="size-4" aria-hidden="true" />
                  <span>1×1</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={cardLayout === "double" ? "secondary" : "ghost"}
                  aria-label={t("doubleCardLayout")}
                  aria-pressed={cardLayout === "double"}
                  aria-controls="bingo-cards-library"
                  onClick={() => updateCardLayout("double")}
                >
                  <Grid2X2 className="size-4" aria-hidden="true" />
                  <span>2×2</span>
                </Button>
              </div>
            </div>

            {/* Drawn Numbers Display */}
            {mode === "local" && drawnNumbers.size > 0 && (
              <div
                className="bingo-cards-marked-numbers mt-4 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 border-t border-slate-700 pt-4"
                data-expanded={markedNumbersExpanded}
              >
                <p className="bingo-marked-numbers-label col-start-1 row-start-1 m-0 text-sm text-muted-foreground">
                  {t("markedNumbers")}:
                </p>
                <ul
                  id="bingo-marked-numbers-list"
                  className={`bingo-marked-numbers-list flex min-w-0 gap-1 ${
                    markedNumbersExpanded
                      ? "col-span-3 col-start-1 row-start-2 flex-wrap"
                      : "col-start-2 row-start-1 flex-nowrap overflow-x-auto overflow-y-hidden"
                  }`}
                  role="list"
                >
                  {getMarkedNumbersNewestFirst(drawnNumbers).map(num => (
                    <li key={num}>
                      <Button
                        type="button"
                        variant="ghost"
                        className="bingo-marked-number-chip h-11 min-w-11 gap-0.5 rounded-full px-2 text-xs font-semibold"
                        aria-label={`${t("removeMarkedNumber")} ${num}`}
                        title={`${t("removeMarkedNumber")} ${num}`}
                        onClick={() => undoMarkedNumber(num)}
                      >
                        <span>{num}</span>
                        <X className="size-3" aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="ghost"
                  className="bingo-marked-numbers-toggle col-start-3 row-start-1 h-11 shrink-0 gap-1 rounded-xl px-2.5 text-xs"
                  aria-controls="bingo-marked-numbers-list"
                  aria-expanded={markedNumbersExpanded}
                  onClick={() => setMarkedNumbersExpanded((expanded) => !expanded)}
                >
                  <span>
                    {markedNumbersExpanded
                      ? t("collapseMarkedNumbers")
                      : t("expandMarkedNumbers")}
                  </span>
                  <ChevronDown
                    className={`size-4 transition-transform motion-reduce:transition-none ${
                      markedNumbersExpanded ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cards Grid */}
        {cards.length === 0 ? (
          <Card
            id="bingo-cards-library"
            data-layout={cardLayout}
            className="bingo-cards-library game-stage border-white/10 bg-card/70"
          >
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="mb-4 text-muted-foreground">{t("noCards")}</p>
              <Button onClick={addCard} disabled={!cardsEditable}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("addFirstCard")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div
            className={`bingo-cards-library game-stage grid gap-4 ${
              cardLayout === "double" ? "grid-cols-2" : "grid-cols-1"
            }`}
            id="bingo-cards-library"
            data-slot="game-stage"
            data-layout={cardLayout}
            role="list"
          >
            {cards.map((card) => {
              const hasBingo = checkBingo(card.numbers, activeDrawnNumbers)
              return (
                <Card
                  key={card.id}
                  role="listitem"
                  data-bingo={hasBingo ? "true" : "false"}
                  className="bingo-card-item border-white/10 bg-card/70 transition-all"
                >
                  <CardHeader className="bingo-card-header pb-2">
                    <div className="bingo-card-header-row flex items-center justify-between">
                      <div className="bingo-card-heading flex min-w-0 items-center gap-2">
                        <CardTitle className="bingo-card-title min-w-0 text-lg text-foreground">
                          {card.name}
                        </CardTitle>
                        {hasBingo && (
                          <span
                            className="bingo-card-badge"
                            role="status"
                          >
                            {t("bingo")}!
                          </span>
                        )}
                      </div>
                      {cardsEditable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          data-tone="danger"
                          onClick={() => removeCard(card.id)}
                          aria-label={`${t("delete")} ${card.name}`}
                          className="bingo-card-delete size-11 shrink-0 text-muted-foreground hover:bg-red-500/20 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="bingo-card-content">
                    {/* Bingo Header */}
                    <div className="bingo-card-letters mb-1 grid grid-cols-5 gap-1">
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
                    <div className="bingo-card-grid grid grid-cols-5 gap-1" role="group" aria-label={card.name}>
                      {card.numbers.flat().map((num, index) => {
                        const isMarked = num !== null && activeDrawnNumbers.has(num)
                        const isFree = num === null
                        const cellContent = (
                          <span
                            className={
                              isMarked
                                ? "bingo-card-marked-number"
                                : "bingo-card-number"
                            }
                          >
                            {isFree ? "FREE" : num}
                          </span>
                        )

                        if (mode === "local" && isMarked && num !== null) {
                          return (
                            <button
                              key={index}
                              type="button"
                              data-state="marked"
                              aria-label={`${t("removeMarkedNumber")} ${num}`}
                              title={`${t("removeMarkedNumber")} ${num}`}
                              onClick={() => undoMarkedNumber(num)}
                              className="bingo-card-cell bingo-card-cell--marked flex h-10 items-center justify-center rounded bg-muted text-sm font-medium text-white transition-all"
                            >
                              {cellContent}
                            </button>
                          )
                        }

                        return (
                          <div
                            key={index}
                            data-state={isMarked ? "marked" : isFree ? "free" : "idle"}
                            role="img"
                            aria-label={`${isFree ? "FREE" : num}${isFree || isMarked ? `, ${t("drawn")}` : ""}`}
                            className={`bingo-card-cell flex h-10 items-center justify-center rounded text-sm font-medium transition-all ${mode === "lan" ? "cursor-default" : ""} ${
                              isMarked
                                ? "bingo-card-cell--marked bg-primary text-white"
                                : isFree
                                ? "bg-amber-500/30 text-amber-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {cellContent}
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
