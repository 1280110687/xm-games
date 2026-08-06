import { describe, expect, it, vi } from "vitest"
import {
  ReconnectController,
  RtcHeartbeatController,
  getReconnectDelay,
} from "./connection"
import {
  MULTIPLAYER_PROTOCOL_VERSION,
  type MultiplayerMessage,
} from "./protocol"
import type { ReliableRtcChannel } from "./rtc-channel"

class FakeReliableChannel {
  listeners = new Set<(message: MultiplayerMessage) => void>()
  sent: MultiplayerMessage[] = []

  onMessage(listener: (message: MultiplayerMessage) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  send(message: MultiplayerMessage): void {
    this.sent.push(message)
  }

  receive(message: MultiplayerMessage): void {
    for (const listener of this.listeners) listener(message)
  }
}

describe("connection supervision", () => {
  it("sends heartbeats, responds to peer heartbeats, and detects timeout", () => {
    const channel = new FakeReliableChannel()
    let now = 0
    let intervalCallback: (() => void) | undefined
    const onTimeout = vi.fn()
    const heartbeat = new RtcHeartbeatController(
      channel as unknown as ReliableRtcChannel,
      { roomId: "ROOM01", matchId: "match-1", senderId: "peer-a" },
      {
        intervalMs: 10,
        timeoutMs: 30,
        now: () => now,
        createId: () => `id-${channel.sent.length + 1}`,
        setInterval: ((callback: TimerHandler) => {
          intervalCallback = callback as () => void
          return 1
        }) as typeof globalThis.setInterval,
        clearInterval: vi.fn() as unknown as typeof globalThis.clearInterval,
        onTimeout,
      },
    )

    heartbeat.start()
    now = 10
    intervalCallback?.()
    expect(channel.sent[0].type).toBe("peer.heartbeat")

    channel.receive({
      v: MULTIPLAYER_PROTOCOL_VERSION,
      type: "peer.heartbeat",
      messageId: "remote-heartbeat",
      roomId: "ROOM01",
      matchId: "match-1",
      senderId: "peer-b",
      sentAt: 11,
      payload: { nonce: "remote-nonce" },
    })
    expect(channel.sent.at(-1)).toEqual(expect.objectContaining({
      type: "peer.heartbeat-ack",
      payload: { nonce: "remote-nonce" },
    }))

    now = 42
    intervalCallback?.()
    intervalCallback?.()
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it("uses bounded exponential reconnect delays", () => {
    expect(getReconnectDelay(1, { random: () => 0.5, jitterRatio: 0 })).toBe(500)
    expect(getReconnectDelay(2, { random: () => 0.5, jitterRatio: 0 })).toBe(1_000)
    expect(getReconnectDelay(20, {
      maxDelayMs: 8_000,
      random: () => 0.5,
      jitterRatio: 0,
    })).toBe(8_000)
  })

  it("retries a failed connection and resets after success", async () => {
    const scheduled: Array<() => void> = []
    const connect = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined)
    const statuses: string[] = []
    const reconnect = new ReconnectController(connect, {
      jitterRatio: 0,
      setTimeout: ((callback: TimerHandler) => {
        scheduled.push(callback as () => void)
        return scheduled.length
      }) as typeof globalThis.setTimeout,
      clearTimeout: vi.fn() as unknown as typeof globalThis.clearTimeout,
      onStatusChange: (status) => statuses.push(status),
    })

    reconnect.markDisconnected()
    scheduled.shift()?.()
    await Promise.resolve()
    await Promise.resolve()
    scheduled.shift()?.()
    await Promise.resolve()
    await Promise.resolve()

    expect(connect).toHaveBeenCalledTimes(2)
    expect(statuses).toContain("connected")
  })
})
