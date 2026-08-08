"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { BingoCard } from "./cards"
import {
  BingoLanGuestController,
  BingoLanHostController,
  type BingoLanGuestProfile,
  type BingoLanGuestStatus,
  type BingoLanHostStatus,
} from "./lan-controller"
import {
  canStartBingoLanGame,
  type BingoLanHostState,
  type BingoLanPublicState,
} from "./lan-game"

export interface UseBingoLanHostResult {
  state: BingoLanHostState | null
  status: BingoLanHostStatus
  error: string
  canStart: boolean
  createRoom: () => Promise<void>
  startGame: () => boolean
  drawNumber: (number: number) => boolean
  resetRound: () => void
  closeRoom: () => Promise<void>
}

export function useBingoLanHost(): UseBingoLanHostResult {
  const [state, setState] = useState<BingoLanHostState | null>(null)
  const [status, setStatus] = useState<BingoLanHostStatus>("idle")
  const [error, setError] = useState("")
  const controllerRef = useRef<BingoLanHostController | null>(null)

  if (controllerRef.current === null) {
    controllerRef.current = new BingoLanHostController({
      onState: setState,
      onStatus: setStatus,
      onError: setError,
    })
  }
  useEffect(() => {
    const controller = controllerRef.current
    controller?.restore()
    return () => controller?.dispose()
  }, [])

  const createRoom = useCallback(() => (
    controllerRef.current?.createRoom() ?? Promise.resolve()
  ), [])
  const startGame = useCallback(() => (
    controllerRef.current?.startGame() ?? false
  ), [])
  const drawNumber = useCallback((number: number) => (
    controllerRef.current?.drawNumber(number) ?? false
  ), [])
  const resetRound = useCallback(() => {
    controllerRef.current?.resetRound()
  }, [])
  const closeRoom = useCallback(() => (
    controllerRef.current?.closeRoom() ?? Promise.resolve()
  ), [])

  return {
    state,
    status,
    error,
    canStart: state ? canStartBingoLanGame(state) : false,
    createRoom,
    startGame,
    drawNumber,
    resetRound,
    closeRoom,
  }
}

export interface UseBingoLanGuestResult {
  profile: BingoLanGuestProfile | null
  room: BingoLanPublicState | null
  status: BingoLanGuestStatus
  error: string
  connected: boolean
  join: (roomId: string, nickname: string, cards: readonly BingoCard[]) => boolean
  replaceCards: (cards: readonly BingoCard[]) => boolean
  setReady: (ready: boolean) => boolean
  submitClaim: (cardId: string) => boolean
  leave: () => void
  retry: () => void
}

export function useBingoLanGuest(invitedRoomId = ""): UseBingoLanGuestResult {
  const [profile, setProfile] = useState<BingoLanGuestProfile | null>(null)
  const [room, setRoom] = useState<BingoLanPublicState | null>(null)
  const [status, setStatus] = useState<BingoLanGuestStatus>("idle")
  const [error, setError] = useState("")
  const controllerRef = useRef<BingoLanGuestController | null>(null)

  if (controllerRef.current === null) {
    controllerRef.current = new BingoLanGuestController({
      onProfile: setProfile,
      onRoom: setRoom,
      onStatus: setStatus,
      onError: setError,
    })
  }
  useEffect(() => {
    if (invitedRoomId) controllerRef.current?.restore(invitedRoomId)
  }, [invitedRoomId])

  useEffect(() => {
    const controller = controllerRef.current
    return () => controller?.dispose()
  }, [])

  const join = useCallback((
    roomId: string,
    nickname: string,
    cards: readonly BingoCard[],
  ) => controllerRef.current?.join(roomId, nickname, cards) ?? false, [])
  const replaceCards = useCallback((cards: readonly BingoCard[]) => (
    controllerRef.current?.replaceCards(cards) ?? false
  ), [])
  const setReady = useCallback((ready: boolean) => (
    controllerRef.current?.setReady(ready) ?? false
  ), [])
  const submitClaim = useCallback((cardId: string) => (
    controllerRef.current?.submitClaim(cardId) ?? false
  ), [])
  const leave = useCallback(() => controllerRef.current?.leave(), [])
  const retry = useCallback(() => controllerRef.current?.retry(), [])

  return {
    profile,
    room,
    status,
    error,
    connected: status === "connected",
    join,
    replaceCards,
    setReady,
    submitClaim,
    leave,
    retry,
  }
}
