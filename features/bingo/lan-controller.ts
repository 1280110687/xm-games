import {
  LanSignalingClient,
  LanSignalingError,
  type LanIceCandidatePayload,
  type LanRoomSession,
  type LanSignalMessage,
} from "../multiplayer/signaling-client"
import { cloneBingoCards, isBingoCard, type BingoCard } from "./cards"
import {
  canStartBingoLanGame,
  connectBingoLanPlayer,
  createBingoLanHostState,
  disconnectBingoLanPlayer,
  drawBingoLanNumber,
  finishBingoLanSettlement,
  resetBingoLanRound,
  setBingoLanPlayerReady,
  startBingoLanGame,
  submitBingoLanClaim,
  toBingoLanPublicState,
  type BingoLanHostState,
  type BingoLanPublicState,
} from "./lan-game"
import {
  createBingoLanMessage,
  parseBingoLanMessage,
  serializeBingoLanMessage,
  type BingoLanMessage,
  type BingoLanMessageType,
  type BingoLanRejectCode,
} from "./lan-protocol"

export const BINGO_LAN_GAME_ID = "bingo"
export const BINGO_LAN_ENGINE_VERSION = "bingo-caller-v1"
export const BINGO_LAN_DATA_CHANNEL_LABEL = "xm-games-bingo-v1"
export const BINGO_LAN_HOST_STORAGE_KEY = "xm-games:bingo:lan-host:v1"
export const BINGO_LAN_GUEST_STORAGE_KEY = "xm-games:bingo:lan-guest:v1"

const SIGNAL_POLL_DELAY_MS = 750
const SIGNAL_POLL_HIDDEN_DELAY_MS = 2_500
const SIGNAL_RELEASE_DELAY_MS = 2_000
const DATA_HEARTBEAT_MS = 10_000
const DATA_TIMEOUT_MS = 35_000

export type BingoLanHostStatus =
  | "idle"
  | "creating"
  | "waiting"
  | "active"
  | "closed"
  | "error"

export type BingoLanGuestStatus =
  | "idle"
  | "joining"
  | "waiting"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed"
  | "error"

export interface BingoLanGuestProfile {
  roomId: string
  playerId: string
  nickname: string
  cards: BingoCard[]
  ready: boolean
}

export interface BingoLanHostCallbacks {
  onState: (state: BingoLanHostState | null) => void
  onStatus: (status: BingoLanHostStatus) => void
  onError: (error: string) => void
}

export interface BingoLanGuestCallbacks {
  onProfile: (profile: BingoLanGuestProfile | null) => void
  onRoom: (room: BingoLanPublicState | null) => void
  onStatus: (status: BingoLanGuestStatus) => void
  onError: (error: string) => void
}

interface HostPeer {
  signalPeerId: string
  negotiationId: string
  peerConnection: RTCPeerConnection
  channel: RTCDataChannel | null
  playerId: string | null
  pendingCandidates: RTCIceCandidateInit[]
  remoteDescriptionSet: boolean
  heartbeatTimer: ReturnType<typeof setInterval> | null
  lastInboundAt: number
  closing: boolean
}

interface StoredHostSession {
  version: 1
  session: LanRoomSession
  state: BingoLanHostState
}

function signalingClient(): LanSignalingClient {
  return new LanSignalingClient({
    gameIdentity: {
      gameId: BINGO_LAN_GAME_ID,
      engineVersion: BINGO_LAN_ENGINE_VERSION,
    },
  })
}

function createId(): string {
  if (!globalThis.crypto?.randomUUID) throw new Error("crypto.randomUUID is unavailable")
  return globalThis.crypto.randomUUID()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isHostSession(value: unknown): value is LanRoomSession {
  if (!isRecord(value)) return false
  return (
    value.gameId === BINGO_LAN_GAME_ID
    && value.engineVersion === BINGO_LAN_ENGINE_VERSION
    && typeof value.roomId === "string"
    && typeof value.peerId === "string"
    && value.role === "host"
    && typeof value.token === "string"
    && Number.isSafeInteger(value.cursor)
    && typeof value.expiresAt === "string"
  )
}

function isHostState(value: unknown): value is BingoLanHostState {
  if (!isRecord(value) || !Array.isArray(value.players)) return false
  try {
    const publicState = toBingoLanPublicState(value as unknown as BingoLanHostState)
    if (publicState.roomId !== value.roomId) return false
    return value.players.every((player) => (
      isRecord(player)
      && Array.isArray(player.cards)
      && player.cards.length <= 4
      && player.cards.every(isBingoCard)
    ))
  } catch {
    return false
  }
}

function isGuestProfile(value: unknown): value is BingoLanGuestProfile {
  if (!isRecord(value) || !Array.isArray(value.cards)) return false
  return (
    /^\d{6}$/u.test(String(value.roomId))
    && typeof value.playerId === "string"
    && value.playerId.length >= 8
    && typeof value.nickname === "string"
    && value.nickname.trim().length >= 1
    && Array.from(value.nickname.trim()).length <= 16
    && value.cards.length <= 4
    && value.cards.every(isBingoCard)
    && typeof value.ready === "boolean"
  )
}

function readHostStorage(): StoredHostSession | null {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(BINGO_LAN_HOST_STORAGE_KEY) ?? "null")
    if (
      !isRecord(parsed)
      || parsed.version !== 1
      || !isHostSession(parsed.session)
      || !isHostState(parsed.state)
      || parsed.session.roomId !== parsed.state.roomId
    ) return null
    return parsed as unknown as StoredHostSession
  } catch {
    return null
  }
}

function readGuestStorage(): BingoLanGuestProfile | null {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(BINGO_LAN_GUEST_STORAGE_KEY) ?? "null")
    return isGuestProfile(parsed) ? parsed : null
  } catch {
    return null
  }
}

function getIceServers(): RTCIceServer[] {
  const raw = process.env.NEXT_PUBLIC_LAN_ICE_SERVERS?.trim()
  if (!raw) return []
  const urls = raw.split(",").map((url) => url.trim()).filter(Boolean)
  return urls.length > 0 ? [{ urls }] : []
}

function waitFor(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener("abort", () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
  })
}

function signalPollDelay(): number {
  return typeof document !== "undefined" && document.hidden
    ? SIGNAL_POLL_HIDDEN_DELAY_MS
    : SIGNAL_POLL_DELAY_MS
}

function signalDescription(message: LanSignalMessage): RTCSessionDescriptionInit | null {
  if ((message.type !== "offer" && message.type !== "answer") || !isRecord(message.payload)) {
    return null
  }
  if (typeof message.payload.sdp !== "string") return null
  return { type: message.type, sdp: message.payload.sdp }
}

function signalCandidate(message: LanSignalMessage): RTCIceCandidateInit | null {
  if (message.type !== "ice" || !isRecord(message.payload)) return null
  const payload = message.payload
  if (
    typeof payload.candidate !== "string"
    || (payload.sdpMid !== null && typeof payload.sdpMid !== "string")
    || (payload.sdpMLineIndex !== null && !Number.isSafeInteger(payload.sdpMLineIndex))
  ) return null
  return {
    candidate: payload.candidate,
    sdpMid: payload.sdpMid as string | null,
    sdpMLineIndex: payload.sdpMLineIndex as number | null,
    ...(payload.usernameFragment === undefined
      ? {}
      : { usernameFragment: payload.usernameFragment as string | null }),
  }
}

function icePayload(candidate: RTCIceCandidate): LanIceCandidatePayload {
  const json = candidate.toJSON()
  return {
    candidate: candidate.candidate,
    sdpMid: json.sdpMid ?? null,
    sdpMLineIndex: json.sdpMLineIndex ?? null,
    ...(json.usernameFragment === undefined
      ? {}
      : { usernameFragment: json.usernameFragment }),
  }
}

function sendChannelMessage<Type extends BingoLanMessageType>(
  channel: RTCDataChannel,
  message: BingoLanMessage<Type>,
): boolean {
  if (channel.readyState !== "open") return false
  try {
    channel.send(serializeBingoLanMessage(message))
    return true
  } catch {
    return false
  }
}

function terminalSignalError(error: unknown): boolean {
  return error instanceof LanSignalingError && (
    error.status === 401
    || error.status === 404
    || error.status === 410
    || error.code === "ROOM_NOT_FOUND"
    || error.code === "GAME_MISMATCH"
    || error.code === "ENGINE_MISMATCH"
  )
}

function guestFacingSignalingError(error: unknown): string {
  if (error instanceof LanSignalingError && (
    error.code === "ROOM_NOT_FOUND"
    || error.code === "ROOM_EXPIRED"
    || error.status === 404
    || error.status === 410
  )) return "ROOM_CLOSED"
  return error instanceof Error ? error.message : String(error)
}

export class BingoLanHostController {
  private callbacks: BingoLanHostCallbacks
  private readonly client = signalingClient()
  private session: LanRoomSession | null = null
  private state: BingoLanHostState | null = null
  private pollAbort: AbortController | null = null
  private settlementTimer: ReturnType<typeof setTimeout> | null = null
  private readonly peersBySignalId = new Map<string, HostPeer>()
  private readonly peersByPlayerId = new Map<string, HostPeer>()
  private disposed = false

  constructor(callbacks: BingoLanHostCallbacks) {
    this.callbacks = callbacks
  }

  setCallbacks(callbacks: BingoLanHostCallbacks): void {
    this.callbacks = callbacks
  }

  get currentState(): BingoLanHostState | null {
    return this.state
  }

  get canStart(): boolean {
    return this.state ? canStartBingoLanGame(this.state) : false
  }

  restore(): boolean {
    if (typeof window === "undefined" || typeof RTCPeerConnection === "undefined") return false
    const stored = readHostStorage()
    if (!stored) return false

    this.session = stored.session
    this.state = {
      ...stored.state,
      players: stored.state.players.map((player) => ({
        ...player,
        cards: cloneBingoCards(player.cards),
        connected: false,
      })),
    }
    this.emitState()
    this.scheduleSettlement()
    this.callbacks.onStatus("waiting")
    this.startSignalLoop()
    return true
  }

  async createRoom(): Promise<void> {
    if (this.session) return
    this.callbacks.onError("")
    this.callbacks.onStatus("creating")
    try {
      const session = await this.client.createRoom()
      if (this.disposed) return
      this.session = session
      this.state = createBingoLanHostState(session.roomId, createId())
      this.persist()
      this.emitState()
      this.callbacks.onStatus("waiting")
      this.startSignalLoop()
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error.message : String(error))
      this.callbacks.onStatus("error")
    }
  }

  startGame(): boolean {
    if (!this.state) return false
    const transition = startBingoLanGame(this.state)
    if (!transition.ok) return false
    this.commitState(transition.state)
    return true
  }

  drawNumber(number: number): boolean {
    if (!this.state) return false
    const transition = drawBingoLanNumber(this.state, number)
    if (!transition.ok) return false
    this.commitState(transition.state)
    return true
  }

  resetRound(): void {
    if (!this.state) return
    this.commitState(resetBingoLanRound(this.state, createId()))
  }

  async closeRoom(): Promise<void> {
    const session = this.session
    this.sendRejectionToAll("ROOM_CLOSED", "ROOM_CLOSED")
    // Give the reliable data channels a brief opportunity to deliver the terminal
    // message before their peer connections are closed. Without this grace period,
    // a guest can observe the channel close first and start an unnecessary reconnect.
    await waitFor(150)
    this.stopRuntime(true)
    this.session = null
    this.state = null
    try {
      sessionStorage.removeItem(BINGO_LAN_HOST_STORAGE_KEY)
    } catch {
      // Session cleanup remains best-effort when storage is unavailable.
    }
    this.emitState()
    this.callbacks.onStatus("closed")
    if (session) {
      try {
        await this.client.leaveRoom(session)
      } catch {
        // A room that already expired is closed from the user's perspective.
      }
    }
  }

  dispose(): void {
    this.disposed = true
    this.stopRuntime(true)
  }

  private emitState(): void {
    this.callbacks.onState(this.state)
  }

  private persist(): void {
    if (!this.session || !this.state) return
    try {
      sessionStorage.setItem(BINGO_LAN_HOST_STORAGE_KEY, JSON.stringify({
        version: 1,
        session: this.session,
        state: this.state,
      } satisfies StoredHostSession))
    } catch {
      // The live room remains usable when sessionStorage is unavailable.
    }
  }

  private commitState(state: BingoLanHostState, broadcast = true): void {
    this.state = state
    this.persist()
    this.emitState()
    this.scheduleSettlement()
    if (state.players.some((player) => player.connected)) {
      this.callbacks.onStatus("active")
    } else {
      this.callbacks.onStatus("waiting")
    }
    if (broadcast) this.broadcastState()
  }

  private scheduleSettlement(): void {
    if (this.settlementTimer !== null) clearTimeout(this.settlementTimer)
    this.settlementTimer = null
    if (!this.state || this.state.phase !== "settling" || this.state.settlementDeadline === null) {
      return
    }

    const delay = Math.max(0, this.state.settlementDeadline - Date.now())
    this.settlementTimer = setTimeout(() => {
      this.settlementTimer = null
      if (!this.state) return
      const transition = finishBingoLanSettlement(this.state, Date.now())
      if (transition.ok) this.commitState(transition.state)
    }, delay + 10)
  }

  private startSignalLoop(): void {
    this.pollAbort?.abort()
    const session = this.session
    if (!session) return
    const controller = new AbortController()
    this.pollAbort = controller
    void this.runSignalLoop(session, controller.signal)
  }

  private async runSignalLoop(session: LanRoomSession, signal: AbortSignal): Promise<void> {
    let cursor = session.cursor
    while (!signal.aborted && !this.disposed && this.session?.peerId === session.peerId) {
      try {
        const response = await this.client.pollSignals(session, cursor, 5_000, signal)
        if (signal.aborted) return
        cursor = response.cursor
        this.session = { ...session, cursor, expiresAt: response.expiresAt }
        session = this.session
        this.persist()
        for (const message of response.messages) {
          await this.handleHostSignal(message)
        }
        if (response.messages.length === 0) await waitFor(signalPollDelay(), signal)
      } catch (error) {
        if (signal.aborted) return
        if (terminalSignalError(error)) {
          this.callbacks.onError(error instanceof Error ? error.message : String(error))
          this.callbacks.onStatus("closed")
          this.stopRuntime(true)
          this.session = null
          return
        }
        this.callbacks.onError(error instanceof Error ? error.message : String(error))
        await waitFor(2_000, signal)
      }
    }
  }

  private async handleHostSignal(message: LanSignalMessage): Promise<void> {
    if (message.fromRole !== "guest") return
    if (message.type === "renegotiate") {
      await this.beginPeerNegotiation(message.fromPeerId, message.negotiationId)
      return
    }

    const peer = this.peersBySignalId.get(message.fromPeerId)
    if (!peer || peer.negotiationId !== message.negotiationId || peer.closing) return
    try {
      if (message.type === "answer") {
        const description = signalDescription(message)
        if (!description) return
        await peer.peerConnection.setRemoteDescription(description)
        peer.remoteDescriptionSet = true
        await this.flushHostCandidates(peer)
      } else if (message.type === "ice") {
        const candidate = signalCandidate(message)
        if (!candidate) return
        if (peer.remoteDescriptionSet) {
          await peer.peerConnection.addIceCandidate(candidate)
        } else {
          peer.pendingCandidates.push(candidate)
        }
      } else if (message.type === "ice-complete" && peer.remoteDescriptionSet) {
        await peer.peerConnection.addIceCandidate(null)
      }
    } catch {
      this.closeHostPeer(peer, true)
    }
  }

  private async beginPeerNegotiation(signalPeerId: string, negotiationId: string): Promise<void> {
    if (!this.session) return
    const previous = this.peersBySignalId.get(signalPeerId)
    if (previous) this.closeHostPeer(previous, false)

    const peerConnection = new RTCPeerConnection({ iceServers: getIceServers() })
    const peer: HostPeer = {
      signalPeerId,
      negotiationId,
      peerConnection,
      channel: null,
      playerId: null,
      pendingCandidates: [],
      remoteDescriptionSet: false,
      heartbeatTimer: null,
      lastInboundAt: Date.now(),
      closing: false,
    }
    this.peersBySignalId.set(signalPeerId, peer)

    peerConnection.addEventListener("icecandidate", (event) => {
      if (peer.closing || !this.session) return
      void this.client.sendSignal(
        this.session,
        event.candidate ? "ice" : "ice-complete",
        event.candidate ? icePayload(event.candidate) : {},
        negotiationId,
      ).catch(() => this.closeHostPeer(peer, true))
    })
    peerConnection.addEventListener("connectionstatechange", () => {
      if (
        peerConnection.connectionState === "failed"
        || peerConnection.connectionState === "closed"
      ) this.closeHostPeer(peer, true)
    })

    const channel = peerConnection.createDataChannel(BINGO_LAN_DATA_CHANNEL_LABEL, { ordered: true })
    this.attachHostChannel(peer, channel)

    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      if (!this.session || peer.closing) return
      await this.client.sendSignal(
        this.session,
        "offer",
        { sdp: offer.sdp ?? "" },
        negotiationId,
      )
    } catch {
      this.closeHostPeer(peer, true)
    }
  }

  private attachHostChannel(peer: HostPeer, channel: RTCDataChannel): void {
    if (channel.label !== BINGO_LAN_DATA_CHANNEL_LABEL || !channel.ordered) {
      channel.close()
      this.closeHostPeer(peer, true)
      return
    }
    peer.channel = channel
    channel.addEventListener("message", (event) => {
      peer.lastInboundAt = Date.now()
      try {
        const message = parseBingoLanMessage(event.data)
        this.handleGuestMessage(peer, message)
      } catch {
        this.sendHostMessage(peer, "host.reject", {
          code: "INVALID_MESSAGE",
          message: "INVALID_MESSAGE",
        })
      }
    })
    channel.addEventListener("close", () => this.closeHostPeer(peer, true))
    channel.addEventListener("error", () => this.closeHostPeer(peer, true))
    channel.addEventListener("open", () => {
      peer.lastInboundAt = Date.now()
      if (peer.heartbeatTimer !== null) clearInterval(peer.heartbeatTimer)
      peer.heartbeatTimer = setInterval(() => {
        if (Date.now() - peer.lastInboundAt >= DATA_TIMEOUT_MS) {
          this.closeHostPeer(peer, true)
          return
        }
        this.sendHostMessage(peer, "peer.ping", { nonce: createId() })
      }, DATA_HEARTBEAT_MS)
    })
  }

  private handleGuestMessage(peer: HostPeer, message: BingoLanMessage): void {
    if (!this.session || !this.state) return
    if (message.type === "guest.hello") {
      if (message.senderId !== message.payload.playerId) return
      const transition = connectBingoLanPlayer(this.state, message.payload)
      if (!transition.ok) {
        const code = transition.code === "ROOM_FULL"
          ? "ROOM_FULL"
          : transition.code === "ROOM_LOCKED"
            ? "ROOM_LOCKED"
            : "NICKNAME_TAKEN"
        this.rejectAndClose(peer, code, transition.code)
        return
      }

      const previousPeer = this.peersByPlayerId.get(message.payload.playerId)
      if (previousPeer && previousPeer !== peer) this.closeHostPeer(previousPeer, false)
      peer.playerId = message.payload.playerId
      this.peersByPlayerId.set(message.payload.playerId, peer)
      this.commitState(transition.state, false)
      this.sendHostMessage(peer, "host.accept", {
        state: toBingoLanPublicState(transition.state),
      })
      this.broadcastState()
      return
    }

    if (!peer.playerId || message.senderId !== peer.playerId) return
    if (message.type === "guest.lobby") {
      const transition = setBingoLanPlayerReady(
        this.state,
        peer.playerId,
        message.payload.cards,
        message.payload.ready,
      )
      if (transition.ok) {
        this.commitState(transition.state)
      } else {
        this.sendHostMessage(peer, "host.reject", {
          code: transition.code === "ROOM_LOCKED" ? "ROOM_LOCKED" : "INVALID_CARDS",
          message: transition.code,
        })
      }
    } else if (message.type === "guest.claim") {
      const transition = submitBingoLanClaim(this.state, {
        playerId: peer.playerId,
        ...message.payload,
      })
      if (transition.ok) this.commitState(transition.state)
    } else if (message.type === "guest.leave") {
      const next = disconnectBingoLanPlayer(this.state, peer.playerId, true)
      this.commitState(next)
      this.closeHostPeer(peer, false)
    } else if (message.type === "peer.pong") {
      peer.lastInboundAt = Date.now()
    }
  }

  private sendHostMessage<Type extends "host.accept" | "host.reject" | "host.state" | "peer.ping">(
    peer: HostPeer,
    type: Type,
    payload: Parameters<typeof createBingoLanMessage<Type>>[2],
  ): boolean {
    if (!this.session || !peer.channel) return false
    return sendChannelMessage(
      peer.channel,
      createBingoLanMessage(type, this.session.peerId, payload),
    )
  }

  private broadcastState(): void {
    if (!this.state) return
    const state = toBingoLanPublicState(this.state)
    for (const peer of this.peersByPlayerId.values()) {
      this.sendHostMessage(peer, "host.state", { state })
    }
  }

  private sendRejectionToAll(code: BingoLanRejectCode, message: string): void {
    for (const peer of this.peersByPlayerId.values()) {
      this.sendHostMessage(peer, "host.reject", { code, message })
    }
  }

  private rejectAndClose(peer: HostPeer, code: BingoLanRejectCode, message: string): void {
    this.sendHostMessage(peer, "host.reject", { code, message })
    setTimeout(() => this.closeHostPeer(peer, false), 100)
  }

  private async flushHostCandidates(peer: HostPeer): Promise<void> {
    const candidates = peer.pendingCandidates.splice(0)
    for (const candidate of candidates) {
      await peer.peerConnection.addIceCandidate(candidate)
    }
  }

  private closeHostPeer(peer: HostPeer, markDisconnected: boolean): void {
    if (peer.closing) return
    peer.closing = true
    if (peer.heartbeatTimer !== null) clearInterval(peer.heartbeatTimer)
    peer.heartbeatTimer = null
    this.peersBySignalId.delete(peer.signalPeerId)
    if (peer.playerId && this.peersByPlayerId.get(peer.playerId) === peer) {
      this.peersByPlayerId.delete(peer.playerId)
      if (markDisconnected && this.state) {
        this.commitState(disconnectBingoLanPlayer(this.state, peer.playerId))
      }
    }
    try {
      peer.channel?.close()
      peer.peerConnection.close()
    } catch {
      // Closing an already-closed WebRTC peer is safe to ignore.
    }
  }

  private stopRuntime(closePeers: boolean): void {
    this.pollAbort?.abort()
    this.pollAbort = null
    if (this.settlementTimer !== null) clearTimeout(this.settlementTimer)
    this.settlementTimer = null
    if (closePeers) {
      for (const peer of [...this.peersBySignalId.values()]) {
        this.closeHostPeer(peer, false)
      }
      this.peersBySignalId.clear()
      this.peersByPlayerId.clear()
    }
  }
}

export class BingoLanGuestController {
  private callbacks: BingoLanGuestCallbacks
  private readonly client = signalingClient()
  private profile: BingoLanGuestProfile | null = null
  private room: BingoLanPublicState | null = null
  private signalSession: LanRoomSession | null = null
  private peerConnection: RTCPeerConnection | null = null
  private channel: RTCDataChannel | null = null
  private connectAbort: AbortController | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null
  private connectionEpoch = 0
  private accepted = false
  private manualClose = false
  private disposed = false

  constructor(callbacks: BingoLanGuestCallbacks) {
    this.callbacks = callbacks
  }

  setCallbacks(callbacks: BingoLanGuestCallbacks): void {
    this.callbacks = callbacks
  }

  get currentProfile(): BingoLanGuestProfile | null {
    return this.profile
  }

  get currentRoom(): BingoLanPublicState | null {
    return this.room
  }

  restore(roomId: string): boolean {
    if (typeof window === "undefined" || typeof RTCPeerConnection === "undefined") return false
    const profile = readGuestStorage()
    if (!profile || profile.roomId !== roomId) return false
    this.profile = { ...profile, cards: cloneBingoCards(profile.cards) }
    this.callbacks.onProfile(this.profile)
    this.manualClose = false
    this.beginConnection("reconnecting")
    return true
  }

  join(roomId: string, nickname: string, cards: readonly BingoCard[]): boolean {
    const normalizedRoom = roomId.replace(/\D/gu, "").slice(0, 6)
    const normalizedNickname = nickname.trim().replace(/\s+/gu, " ")
    if (
      normalizedRoom.length !== 6
      || normalizedNickname.length === 0
      || Array.from(normalizedNickname).length > 16
      || cards.length < 1
      || cards.length > 4
      || cards.some((card) => !isBingoCard(card))
    ) return false

    this.profile = {
      roomId: normalizedRoom,
      playerId: createId(),
      nickname: normalizedNickname,
      cards: cloneBingoCards(cards),
      ready: false,
    }
    this.persistProfile()
    this.callbacks.onProfile(this.profile)
    this.callbacks.onError("")
    this.manualClose = false
    this.beginConnection("joining")
    return true
  }

  replaceCards(cards: readonly BingoCard[]): boolean {
    if (
      !this.profile
      || cards.length > 4
      || cards.some((card) => !isBingoCard(card))
      || this.profile.ready
      || (this.room && this.room.phase !== "lobby")
    ) return false
    this.profile = { ...this.profile, cards: cloneBingoCards(cards) }
    this.persistProfile()
    this.callbacks.onProfile(this.profile)
    this.sendGuestMessage("guest.lobby", { cards: this.profile.cards, ready: false })
    return true
  }

  setReady(ready: boolean): boolean {
    if (
      !this.profile
      || !this.room
      || this.room.phase !== "lobby"
      || (ready && this.profile.cards.length === 0)
    ) return false
    this.profile = { ...this.profile, ready }
    this.persistProfile()
    this.callbacks.onProfile(this.profile)
    return this.sendGuestMessage("guest.lobby", {
      cards: this.profile.cards,
      ready,
    })
  }

  submitClaim(cardId: string): boolean {
    if (!this.profile || !this.room || this.room.drawRevision <= 0) return false
    return this.sendGuestMessage("guest.claim", {
      roundId: this.room.roundId,
      drawRevision: this.room.drawRevision,
      cardId,
    })
  }

  leave(): void {
    this.manualClose = true
    this.sendGuestMessage("guest.leave", {})
    this.stopConnection(true)
    this.profile = null
    this.room = null
    try {
      sessionStorage.removeItem(BINGO_LAN_GUEST_STORAGE_KEY)
    } catch {
      // Session cleanup remains best-effort.
    }
    this.callbacks.onProfile(null)
    this.callbacks.onRoom(null)
    this.callbacks.onError("")
    this.callbacks.onStatus("idle")
  }

  retry(): void {
    if (!this.profile) return
    this.manualClose = false
    this.beginConnection("reconnecting")
  }

  dispose(): void {
    this.disposed = true
    this.manualClose = true
    this.stopConnection(true)
  }

  private persistProfile(): void {
    if (!this.profile) return
    try {
      sessionStorage.setItem(BINGO_LAN_GUEST_STORAGE_KEY, JSON.stringify(this.profile))
    } catch {
      // The current tab remains usable when sessionStorage is unavailable.
    }
  }

  private beginConnection(initialStatus: BingoLanGuestStatus): void {
    this.stopConnection(true)
    if (!this.profile || this.disposed) return
    this.connectionEpoch += 1
    const epoch = this.connectionEpoch
    const controller = new AbortController()
    this.connectAbort = controller
    this.accepted = false
    this.callbacks.onStatus(initialStatus)
    void this.connectProfile(this.profile, epoch, controller.signal)
  }

  private async connectProfile(
    profile: BingoLanGuestProfile,
    epoch: number,
    signal: AbortSignal,
  ): Promise<void> {
    const requestId = createId()
    let session: LanRoomSession
    while (!signal.aborted && this.isCurrent(epoch)) {
      try {
        session = await this.client.joinRoom(profile.roomId, requestId)
        break
      } catch (error) {
        if (signal.aborted) return
        if (error instanceof LanSignalingError && error.code === "ROOM_FULL") {
          this.callbacks.onStatus("waiting")
          await waitFor(1_200, signal)
          continue
        }
        this.callbacks.onError(guestFacingSignalingError(error))
        this.callbacks.onStatus(terminalSignalError(error) ? "closed" : "error")
        return
      }
    }
    if (signal.aborted || !this.isCurrent(epoch) || !session!) return

    this.signalSession = session
    this.callbacks.onStatus("connecting")
    const negotiationId = createId()
    const peerConnection = new RTCPeerConnection({ iceServers: getIceServers() })
    this.peerConnection = peerConnection
    const pendingCandidates: RTCIceCandidateInit[] = []
    let remoteDescriptionSet = false

    peerConnection.addEventListener("datachannel", (event) => {
      if (this.isCurrent(epoch)) this.attachGuestChannel(event.channel, epoch)
    })
    peerConnection.addEventListener("icecandidate", (event) => {
      if (!this.isCurrent(epoch) || !this.signalSession) return
      void this.client.sendSignal(
        this.signalSession,
        event.candidate ? "ice" : "ice-complete",
        event.candidate ? icePayload(event.candidate) : {},
        negotiationId,
      ).catch(() => this.scheduleReconnect())
    })
    peerConnection.addEventListener("connectionstatechange", () => {
      if (!this.isCurrent(epoch)) return
      if (peerConnection.connectionState === "connected") {
        if (this.disconnectTimer !== null) clearTimeout(this.disconnectTimer)
        this.disconnectTimer = null
      } else if (peerConnection.connectionState === "disconnected") {
        if (this.disconnectTimer !== null) clearTimeout(this.disconnectTimer)
        this.disconnectTimer = setTimeout(() => {
          if (peerConnection.connectionState === "disconnected") this.scheduleReconnect()
        }, 5_000)
      } else if (
        peerConnection.connectionState === "failed"
        || peerConnection.connectionState === "closed"
      ) {
        this.scheduleReconnect()
      }
    })

    try {
      await this.client.sendSignal(session, "renegotiate", {}, negotiationId)
    } catch (error) {
      if (this.isCurrent(epoch)) {
        this.callbacks.onError(guestFacingSignalingError(error))
        this.scheduleReconnect()
      }
      return
    }

    let cursor = session.cursor
    while (!signal.aborted && this.isCurrent(epoch) && !this.accepted) {
      try {
        const response = await this.client.pollSignals(session, cursor, 5_000, signal)
        cursor = response.cursor
        this.signalSession = { ...session, cursor, expiresAt: response.expiresAt }
        session = this.signalSession
        for (const message of response.messages) {
          if (message.fromRole !== "host" || message.negotiationId !== negotiationId) continue
          if (message.type === "offer") {
            const description = signalDescription(message)
            if (!description) continue
            await peerConnection.setRemoteDescription(description)
            remoteDescriptionSet = true
            for (const candidate of pendingCandidates.splice(0)) {
              await peerConnection.addIceCandidate(candidate)
            }
            const answer = await peerConnection.createAnswer()
            await peerConnection.setLocalDescription(answer)
            await this.client.sendSignal(
              session,
              "answer",
              { sdp: answer.sdp ?? "" },
              negotiationId,
            )
          } else if (message.type === "ice") {
            const candidate = signalCandidate(message)
            if (!candidate) continue
            if (remoteDescriptionSet) {
              await peerConnection.addIceCandidate(candidate)
            } else {
              pendingCandidates.push(candidate)
            }
          } else if (message.type === "ice-complete" && remoteDescriptionSet) {
            await peerConnection.addIceCandidate(null)
          }
        }
        if (response.messages.length === 0) await waitFor(signalPollDelay(), signal)
      } catch (error) {
        if (signal.aborted) return
        if (terminalSignalError(error)) {
          this.callbacks.onError(guestFacingSignalingError(error))
          this.callbacks.onStatus("closed")
          return
        }
        await waitFor(1_500, signal)
      }
    }
  }

  private attachGuestChannel(channel: RTCDataChannel, epoch: number): void {
    if (channel.label !== BINGO_LAN_DATA_CHANNEL_LABEL || !channel.ordered) {
      channel.close()
      this.scheduleReconnect()
      return
    }
    this.channel = channel
    channel.addEventListener("open", () => {
      if (!this.profile || !this.isCurrent(epoch)) return
      this.sendGuestMessage("guest.hello", {
        playerId: this.profile.playerId,
        nickname: this.profile.nickname,
      })
    })
    channel.addEventListener("message", (event) => {
      if (!this.isCurrent(epoch)) return
      try {
        this.handleHostMessage(parseBingoLanMessage(event.data))
      } catch {
        this.callbacks.onError("INVALID_MESSAGE")
      }
    })
    channel.addEventListener("close", () => this.scheduleReconnect())
    channel.addEventListener("error", () => this.scheduleReconnect())
    if (channel.readyState === "open" && this.profile) {
      this.sendGuestMessage("guest.hello", {
        playerId: this.profile.playerId,
        nickname: this.profile.nickname,
      })
    }
  }

  private handleHostMessage(message: BingoLanMessage): void {
    if (!this.profile) return
    if (message.type === "host.accept") {
      this.accepted = true
      this.room = message.payload.state
      this.callbacks.onRoom(this.room)
      this.callbacks.onError("")
      this.callbacks.onStatus("connected")
      if (this.room.phase === "lobby") {
        this.sendGuestMessage("guest.lobby", {
          cards: this.profile.cards,
          ready: this.profile.ready,
        })
      }
      void this.releaseSignalSeat()
    } else if (message.type === "host.state") {
      const previousPhase = this.room?.phase
      this.room = message.payload.state
      this.callbacks.onRoom(this.room)
      const player = this.room.players.find((candidate) => candidate.playerId === this.profile?.playerId)
      if (this.room.phase === "lobby" && previousPhase && previousPhase !== "lobby") {
        this.profile = { ...this.profile, ready: false }
        this.persistProfile()
        this.callbacks.onProfile(this.profile)
      } else if (this.room.phase === "lobby" && player && player.ready !== this.profile.ready) {
        this.profile = { ...this.profile, ready: player.ready }
        this.persistProfile()
        this.callbacks.onProfile(this.profile)
      }
    } else if (message.type === "host.reject") {
      this.callbacks.onError(message.payload.message)
      this.callbacks.onStatus(message.payload.code === "ROOM_CLOSED" ? "closed" : "error")
      this.manualClose = true
      this.stopConnection(true)
    } else if (message.type === "peer.ping") {
      this.sendGuestMessage("peer.pong", { nonce: message.payload.nonce })
    }
  }

  private sendGuestMessage<Type extends
    | "guest.hello"
    | "guest.lobby"
    | "guest.claim"
    | "guest.leave"
    | "peer.pong"
  >(
    type: Type,
    payload: Parameters<typeof createBingoLanMessage<Type>>[2],
  ): boolean {
    if (!this.profile || !this.channel) return false
    return sendChannelMessage(
      this.channel,
      createBingoLanMessage(type, this.profile.playerId, payload),
    )
  }

  private async releaseSignalSeat(): Promise<void> {
    const session = this.signalSession
    if (!session) return
    await waitFor(SIGNAL_RELEASE_DELAY_MS)
    if (this.signalSession?.peerId !== session.peerId || !this.accepted) return
    this.connectAbort?.abort()
    this.signalSession = null
    await waitFor(150)
    try {
      await this.client.leaveRoom(session)
    } catch {
      // The point-to-point connection remains valid after signaling cleanup.
    }
  }

  private scheduleReconnect(): void {
    if (this.manualClose || this.disposed || !this.profile) return
    if (this.reconnectTimer !== null) return
    this.callbacks.onStatus("reconnecting")
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.manualClose && !this.disposed && this.profile) {
        this.beginConnection("reconnecting")
      }
    }, 1_500)
  }

  private stopConnection(closePeer: boolean): void {
    this.connectAbort?.abort()
    this.connectAbort = null
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    if (this.disconnectTimer !== null) clearTimeout(this.disconnectTimer)
    this.disconnectTimer = null
    const session = this.signalSession
    this.signalSession = null
    if (session) {
      void waitFor(150).then(() => this.client.leaveRoom(session)).catch(() => {})
    }
    if (closePeer) {
      try {
        this.channel?.close()
        this.peerConnection?.close()
      } catch {
        // Closing an already-closed peer is safe to ignore.
      }
      this.channel = null
      this.peerConnection = null
    }
    this.accepted = false
  }

  private isCurrent(epoch: number): boolean {
    return !this.disposed && this.connectionEpoch === epoch
  }
}
