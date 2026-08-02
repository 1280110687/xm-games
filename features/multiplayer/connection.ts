import { MULTIPLAYER_PROTOCOL_VERSION, type MultiplayerMessage } from "./protocol"
import type { ReliableRtcChannel } from "./rtc-channel"

export type ConnectionStatus = "idle" | "connected" | "reconnecting" | "stopped"

export type HeartbeatContext = {
  roomId: string
  matchId: string
  senderId: string
}

export type HeartbeatOptions = {
  intervalMs?: number
  timeoutMs?: number
  now?: () => number
  createId?: () => string
  setInterval?: typeof globalThis.setInterval
  clearInterval?: typeof globalThis.clearInterval
  onTimeout?: () => void
}

function createRandomId(): string {
  if (!globalThis.crypto?.randomUUID) throw new Error("crypto.randomUUID is unavailable")
  return globalThis.crypto.randomUUID()
}

export class RtcHeartbeatController {
  private readonly intervalMs: number
  private readonly timeoutMs: number
  private readonly now: () => number
  private readonly createId: () => string
  private readonly scheduleInterval: typeof globalThis.setInterval
  private readonly cancelInterval: typeof globalThis.clearInterval
  private readonly onTimeout: () => void
  private timer: ReturnType<typeof setInterval> | null = null
  private lastInboundAt = 0
  private timedOut = false
  private unsubscribe: (() => void) | null = null

  constructor(
    private readonly channel: ReliableRtcChannel,
    private readonly context: HeartbeatContext,
    options: HeartbeatOptions = {},
  ) {
    this.intervalMs = options.intervalMs ?? 10_000
    this.timeoutMs = options.timeoutMs ?? 30_000
    if (this.intervalMs <= 0 || this.timeoutMs <= this.intervalMs) {
      throw new RangeError("Heartbeat timeout must be greater than its interval")
    }
    this.now = options.now ?? Date.now
    this.createId = options.createId ?? createRandomId
    this.scheduleInterval = options.setInterval ?? globalThis.setInterval.bind(globalThis)
    this.cancelInterval = options.clearInterval ?? globalThis.clearInterval.bind(globalThis)
    this.onTimeout = options.onTimeout ?? (() => {})
  }

  start(): void {
    if (this.timer !== null) return
    this.lastInboundAt = this.now()
    this.timedOut = false
    this.unsubscribe = this.channel.onMessage((message) => this.handleMessage(message))
    this.timer = this.scheduleInterval(() => this.tick(), this.intervalMs)
  }

  stop(): void {
    if (this.timer !== null) this.cancelInterval(this.timer)
    this.timer = null
    this.unsubscribe?.()
    this.unsubscribe = null
  }

  noteInbound(): void {
    this.lastInboundAt = this.now()
    this.timedOut = false
  }

  tick(): void {
    if (this.timer === null) return
    if (this.now() - this.lastInboundAt >= this.timeoutMs) {
      if (!this.timedOut) {
        this.timedOut = true
        this.onTimeout()
      }
      return
    }
    this.sendHeartbeat("peer.heartbeat", this.createId())
  }

  private handleMessage(message: MultiplayerMessage): void {
    this.noteInbound()
    if (message.type === "peer.heartbeat") {
      this.sendHeartbeat("peer.heartbeat-ack", message.payload.nonce)
    }
  }

  private sendHeartbeat(
    type: "peer.heartbeat" | "peer.heartbeat-ack",
    nonce: string,
  ): void {
    const message: MultiplayerMessage<typeof type> = {
      v: MULTIPLAYER_PROTOCOL_VERSION,
      type,
      messageId: this.createId(),
      roomId: this.context.roomId,
      matchId: this.context.matchId,
      senderId: this.context.senderId,
      sentAt: this.now(),
      payload: { nonce },
    }
    this.channel.send(message)
  }
}

export type ReconnectOptions = {
  baseDelayMs?: number
  maxDelayMs?: number
  maxAttempts?: number
  jitterRatio?: number
  random?: () => number
  setTimeout?: typeof globalThis.setTimeout
  clearTimeout?: typeof globalThis.clearTimeout
  onStatusChange?: (status: ConnectionStatus, attempt: number) => void
}

export function getReconnectDelay(
  attempt: number,
  options: Pick<ReconnectOptions, "baseDelayMs" | "maxDelayMs" | "jitterRatio" | "random"> = {},
): number {
  const baseDelayMs = options.baseDelayMs ?? 500
  const maxDelayMs = options.maxDelayMs ?? 8_000
  const jitterRatio = options.jitterRatio ?? 0.2
  const random = options.random ?? Math.random
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1))
  const jitter = exponential * jitterRatio * (random() * 2 - 1)
  return Math.max(0, Math.round(exponential + jitter))
}

export class ReconnectController {
  private readonly maxAttempts: number
  private readonly scheduleTimeout: typeof globalThis.setTimeout
  private readonly cancelTimeout: typeof globalThis.clearTimeout
  private readonly onStatusChange: (status: ConnectionStatus, attempt: number) => void
  private timer: ReturnType<typeof setTimeout> | null = null
  private attempt = 0
  private stopped = false
  private status: ConnectionStatus = "idle"

  constructor(
    private readonly connect: () => Promise<void>,
    private readonly options: ReconnectOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? Number.POSITIVE_INFINITY
    this.scheduleTimeout = options.setTimeout ?? globalThis.setTimeout.bind(globalThis)
    this.cancelTimeout = options.clearTimeout ?? globalThis.clearTimeout.bind(globalThis)
    this.onStatusChange = options.onStatusChange ?? (() => {})
  }

  markConnected(): void {
    if (this.stopped) return
    this.cancelScheduledAttempt()
    this.attempt = 0
    this.setStatus("connected")
  }

  markDisconnected(): void {
    if (this.stopped || this.timer !== null) return
    this.setStatus("reconnecting")
    this.scheduleNextAttempt()
  }

  stop(): void {
    this.stopped = true
    this.cancelScheduledAttempt()
    this.setStatus("stopped")
  }

  private scheduleNextAttempt(): void {
    if (this.attempt >= this.maxAttempts) {
      this.stop()
      return
    }
    this.attempt += 1
    const delay = getReconnectDelay(this.attempt, this.options)
    this.timer = this.scheduleTimeout(() => {
      this.timer = null
      void this.connect()
        .then(() => this.markConnected())
        .catch(() => this.scheduleNextAttempt())
    }, delay)
    this.onStatusChange(this.status, this.attempt)
  }

  private cancelScheduledAttempt(): void {
    if (this.timer !== null) this.cancelTimeout(this.timer)
    this.timer = null
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status
    this.onStatusChange(status, this.attempt)
  }
}
