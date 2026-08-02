"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  XiangqiAiCancelledError,
  XiangqiAiClient,
  type XiangqiAiSearchResponse,
} from "./ai-client"
import type { XiangqiAiDifficulty } from "./ai-protocol"
import {
  applyMove,
  createInitialState,
  createPositionKey,
  evaluateGameResult,
  generateLegalMoves,
  oppositeColor,
  type PieceColor,
  type XiangqiMove,
  type XiangqiState,
} from "./engine"

export type ChineseChessMode = "local" | "ai"
export type ChineseChessAiStatus = "idle" | "thinking" | "error"

type LocalUndoUsage = Record<PieceColor, boolean>

const INITIAL_LOCAL_UNDO_USAGE: LocalUndoUsage = {
  red: false,
  black: false,
}

function isSameMove(left: XiangqiMove, right: XiangqiMove): boolean {
  return left.from.row === right.from.row
    && left.from.col === right.from.col
    && left.to.row === right.to.row
    && left.to.col === right.to.col
}

export function useChineseChess() {
  const [state, setState] = useState<XiangqiState>(createInitialState)
  const [timeline, setTimeline] = useState<readonly XiangqiState[]>([])
  const [mode, setMode] = useState<ChineseChessMode>("local")
  const [playerColor, setPlayerColor] = useState<PieceColor>("red")
  const [difficulty, setDifficulty] = useState<XiangqiAiDifficulty>("medium")
  const [aiStatus, setAiStatus] = useState<ChineseChessAiStatus>("idle")
  const [aiStats, setAiStats] = useState<XiangqiAiSearchResponse["stats"] | null>(null)
  const [localUndoUsage, setLocalUndoUsage] = useState<LocalUndoUsage>(INITIAL_LOCAL_UNDO_USAGE)
  const [aiUndoUsed, setAiUndoUsed] = useState(false)

  const stateRef = useRef(state)
  const timelineRef = useRef<readonly XiangqiState[]>(timeline)
  const revisionRef = useRef(0)
  const searchSequenceRef = useRef(0)
  const activeSearchIdRef = useRef<string | null>(null)
  const aiClientRef = useRef<XiangqiAiClient | null>(null)

  const gameResult = useMemo(() => evaluateGameResult(state), [state])
  const aiColor = oppositeColor(playerColor)
  const hasMoves = state.moveHistory.length > 0
  const hasHumanMove = state.moveHistory.some((move) => move.piece.color === playerColor)
  const isHumanTurn = mode === "local" || state.currentTurn === playerColor

  const replaceTimeline = useCallback((nextTimeline: readonly XiangqiState[]) => {
    timelineRef.current = nextTimeline
    setTimeline(nextTimeline)
  }, [])

  const replaceState = useCallback((nextState: XiangqiState) => {
    stateRef.current = nextState
    setState(nextState)
  }, [])

  const terminateAi = useCallback((updateStatus = true) => {
    activeSearchIdRef.current = null
    aiClientRef.current?.terminate()
    if (updateStatus) setAiStatus("idle")
  }, [])

  const commitMove = useCallback((move: XiangqiMove): boolean => {
    const currentState = stateRef.current
    const applied = applyMove(currentState, move)
    if (!applied.ok) return false

    replaceTimeline([...timelineRef.current, currentState])
    replaceState(applied.state)
    revisionRef.current += 1
    setAiStats(null)
    return true
  }, [replaceState, replaceTimeline])

  const resetGame = useCallback(() => {
    terminateAi()
    revisionRef.current += 1
    replaceTimeline([])
    replaceState(createInitialState())
    setLocalUndoUsage(INITIAL_LOCAL_UNDO_USAGE)
    setAiUndoUsed(false)
    setAiStats(null)
  }, [replaceState, replaceTimeline, terminateAi])

  const startLocalGame = useCallback(() => {
    setMode("local")
    resetGame()
  }, [resetGame])

  const startAiGame = useCallback((nextPlayerColor: PieceColor, nextDifficulty: XiangqiAiDifficulty) => {
    setMode("ai")
    setPlayerColor(nextPlayerColor)
    setDifficulty(nextDifficulty)
    resetGame()
  }, [resetGame])

  const makeMove = useCallback((move: XiangqiMove): boolean => {
    const currentState = stateRef.current
    const currentResult = evaluateGameResult(currentState)
    if (currentResult.over || activeSearchIdRef.current) return false
    if (mode === "ai" && currentState.currentTurn !== playerColor) return false
    return commitMove(move)
  }, [commitMove, mode, playerColor])

  const startAiSearch = useCallback((searchState: XiangqiState) => {
    if (activeSearchIdRef.current) return

    const gameRevision = revisionRef.current
    const positionHash = createPositionKey(searchState.board, searchState.currentTurn)
    const searchId = `xiangqi-${gameRevision}-${searchSequenceRef.current += 1}`
    const client = aiClientRef.current ?? new XiangqiAiClient()
    aiClientRef.current = client
    activeSearchIdRef.current = searchId
    setAiStatus("thinking")
    setAiStats(null)

    let searchPromise: Promise<XiangqiAiSearchResponse>
    try {
      searchPromise = client.search({
        searchId,
        gameRevision,
        positionHash,
        difficulty,
        state: searchState,
      })
    } catch {
      activeSearchIdRef.current = null
      setAiStatus("error")
      return
    }

    void searchPromise.then((response) => {
      if (
        activeSearchIdRef.current !== searchId
        || revisionRef.current !== gameRevision
      ) {
        return
      }

      const currentState = stateRef.current
      const currentHash = createPositionKey(currentState.board, currentState.currentTurn)
      if (currentHash !== response.positionHash || !response.move) {
        activeSearchIdRef.current = null
        setAiStatus("error")
        return
      }

      const isStillLegal = generateLegalMoves(currentState).some((move) =>
        isSameMove(move, response.move as XiangqiMove),
      )
      if (!isStillLegal) {
        activeSearchIdRef.current = null
        setAiStatus("error")
        return
      }

      activeSearchIdRef.current = null
      const moved = commitMove(response.move)
      setAiStats(response.stats)
      setAiStatus(moved ? "idle" : "error")
    }).catch((error: unknown) => {
      if (error instanceof XiangqiAiCancelledError) return
      if (
        activeSearchIdRef.current !== searchId
        || revisionRef.current !== gameRevision
      ) {
        return
      }
      activeSearchIdRef.current = null
      setAiStatus("error")
    })
  }, [commitMove, difficulty])

  const retryAi = useCallback(() => {
    if (mode !== "ai" || stateRef.current.currentTurn !== oppositeColor(playerColor)) return
    setAiStatus("idle")
  }, [mode, playerColor])

  const lastMove = state.moveHistory[state.moveHistory.length - 1]
  const localCanUndo = Boolean(
    mode === "local"
    && !gameResult.over
    && lastMove
    && !localUndoUsage[lastMove.piece.color]
    && timeline.length > 0,
  )
  const aiCanUndo = mode === "ai"
    && !aiUndoUsed
    && hasHumanMove
    && timeline.length > 0
  const canUndo = localCanUndo || aiCanUndo

  const undo = useCallback(() => {
    if (!canUndo) return

    terminateAi()
    const currentTimeline = timelineRef.current

    if (mode === "local") {
      const mover = stateRef.current.moveHistory.at(-1)?.piece.color
      const previousState = currentTimeline.at(-1)
      if (!mover || !previousState) return

      replaceTimeline(currentTimeline.slice(0, -1))
      replaceState(previousState)
      revisionRef.current += 1
      setLocalUndoUsage((usage) => ({ ...usage, [mover]: true }))
      setAiStats(null)
      return
    }

    const currentState = stateRef.current
    const shouldUndoOnePly = currentState.currentTurn === aiColor
      || aiStatus === "thinking"
      || aiStatus === "error"
    const plies = Math.min(shouldUndoOnePly ? 1 : 2, currentTimeline.length)
    const restoreIndex = currentTimeline.length - plies
    const previousState = currentTimeline[restoreIndex]
    if (!previousState) return

    replaceTimeline(currentTimeline.slice(0, restoreIndex))
    replaceState(previousState)
    revisionRef.current += 1
    setAiUndoUsed(true)
    setAiStats(null)
  }, [aiColor, aiStatus, canUndo, mode, replaceState, replaceTimeline, terminateAi])

  useEffect(() => {
    if (
      mode !== "ai"
      || gameResult.over
      || state.currentTurn !== aiColor
      || aiStatus !== "idle"
      || activeSearchIdRef.current
    ) {
      return
    }

    startAiSearch(state)
  }, [aiColor, aiStatus, gameResult.over, mode, startAiSearch, state])

  useEffect(() => () => {
    activeSearchIdRef.current = null
    aiClientRef.current?.terminate()
  }, [])

  return {
    state,
    gameResult,
    mode,
    playerColor,
    aiColor,
    difficulty,
    aiStatus,
    aiStats,
    isHumanTurn,
    hasMoves,
    localUndoUsage,
    aiUndoUsed,
    canUndo,
    makeMove,
    undo,
    resetGame,
    startLocalGame,
    startAiGame,
    retryAi,
  }
}
