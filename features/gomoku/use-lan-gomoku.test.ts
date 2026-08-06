import { describe, expect, it } from "vitest"

import { createGomokuState } from "./engine"
import { gomokuLanAdapter } from "./lan"
import { LanSignalingError } from "../multiplayer/signaling-client"
import {
  GUEST_RENEGOTIATION_MAX_RETRIES,
  createGuestRenegotiationOperation,
  getGuestRenegotiationRetryDelay,
  getSignalPollDelay,
  openRoomWithSingleRetry,
  parseStoredSession,
  recordGuestRenegotiationAttempt,
  shouldClearRoomSession,
  shouldHostNegotiate,
  shouldRetryGuestRenegotiation,
  shouldRetainPendingRoomRequest,
  type StoredLanSession,
} from "./use-lan-gomoku"

function createStoredSession(expiresAt: string): StoredLanSession {
  return {
    version: 3,
    session: {
      gameId: "gomoku",
      engineVersion: gomokuLanAdapter.engineVersion,
      roomId: "123456",
      peerId: "peer-host-0000001",
      role: "host",
      token: "a".repeat(43),
      cursor: 0,
      expiresAt,
    },
    matchId: "123456",
    remotePeerId: null,
    phase: "waiting",
    localReady: false,
    remoteReady: false,
    game: gomokuLanAdapter.encodeSnapshot(createGomokuState()),
    revision: 0,
    firstPeerId: null,
    diceRuntime: null,
    dice: null,
    pendingAction: null,
    acknowledgements: [],
    matchSeries: null,
  }
}

describe("parseStoredSession", () => {
  it("keeps structurally valid credentials even when the cached room lease is stale", async () => {
    const stored = createStoredSession("2020-01-01T00:00:00.000Z")

    expect(await parseStoredSession(JSON.stringify(stored))).toMatchObject({
      ...stored,
      game: createGomokuState(),
    })
  })

  it("still rejects an invalid expiration timestamp", async () => {
    expect(await parseStoredSession(
      JSON.stringify(createStoredSession("not-a-date")),
    )).toBeNull()
  })
})

describe("pending room request retry policy", () => {
  it("retains network failures and clears definitive client errors", () => {
    expect(shouldRetainPendingRoomRequest(
      new LanSignalingError("offline", 0, "NETWORK_ERROR"),
    )).toBe(true)
    expect(shouldRetainPendingRoomRequest(
      new LanSignalingError("rooms busy", 503, "ROOM_LIMIT_REACHED"),
    )).toBe(true)
    expect(shouldRetainPendingRoomRequest(
      new LanSignalingError("polls busy", 429, "POLL_LIMIT_REACHED"),
    )).toBe(true)
    expect(shouldRetainPendingRoomRequest(
      new LanSignalingError("full", 409, "ROOM_FULL"),
    )).toBe(false)
  })

  it("retries the same active operation once after a retryable lost response", async () => {
    const session = createStoredSession("2030-01-01T00:00:00.000Z").session
    let attempts = 0
    const openRoom = async () => {
      attempts += 1
      if (attempts === 1) {
        throw new LanSignalingError("response lost", 0, "NETWORK_ERROR")
      }
      return session
    }

    await expect(openRoomWithSingleRetry(openRoom, () => true, async () => {}))
      .resolves.toEqual(session)
    expect(attempts).toBe(2)
  })

  it("does not retry a cancelled or definitive operation", async () => {
    let attempts = 0
    const missingRoom = async () => {
      attempts += 1
      throw new LanSignalingError("missing", 404, "ROOM_NOT_FOUND")
    }

    await expect(openRoomWithSingleRetry(missingRoom, () => true, async () => {}))
      .rejects.toMatchObject({ code: "ROOM_NOT_FOUND" })
    expect(attempts).toBe(1)

    const networkFailure = async () => {
      attempts += 1
      throw new LanSignalingError("offline", 0, "NETWORK_ERROR")
    }
    await expect(openRoomWithSingleRetry(networkFailure, () => false, async () => {}))
      .rejects.toMatchObject({ code: "NETWORK_ERROR" })
    expect(attempts).toBe(2)
  })
})

describe("terminal room failure policy", () => {
  it("discards credentials only when the signaling service definitively rejects the room", () => {
    expect(shouldClearRoomSession("ROOM_NOT_FOUND")).toBe(true)
    expect(shouldClearRoomSession("ROOM_EXPIRED")).toBe(true)
    expect(shouldClearRoomSession("NETWORK_ERROR")).toBe(false)
    expect(shouldClearRoomSession("CONNECTION_FAILED")).toBe(false)
  })
})

describe("free-tier signal polling cadence", () => {
  it("backs off while negotiating and slows down once connected or hidden", () => {
    const withoutJitter = { connected: false, hidden: false, random: () => 0 }
    expect(getSignalPollDelay(0, withoutJitter)).toBe(500)
    expect(getSignalPollDelay(1, withoutJitter)).toBe(1_000)
    expect(getSignalPollDelay(2, withoutJitter)).toBe(2_000)
    expect(getSignalPollDelay(20, withoutJitter)).toBe(2_000)
    expect(getSignalPollDelay(0, {
      connected: true,
      hidden: false,
      random: () => 0,
    })).toBe(8_000)
    expect(getSignalPollDelay(0, {
      connected: true,
      hidden: true,
      random: () => 0,
    })).toBe(15_000)
  })

  it("adds at most twenty percent jitter", () => {
    expect(getSignalPollDelay(0, {
      connected: false,
      hidden: false,
      random: () => 1,
    })).toBe(600)
  })
})

describe("host negotiation gating", () => {
  it("waits for a guest signal until the host knows the remote peer", () => {
    expect(shouldHostNegotiate("host", null)).toBe(false)
    expect(shouldHostNegotiate("host", "peer-guest-00001")).toBe(true)
    expect(shouldHostNegotiate("guest", "peer-host-000001")).toBe(false)
  })
})

describe("guest renegotiation retry policy", () => {
  it("keeps one negotiation and message ID across the finite retry budget", () => {
    const ids = ["negotiation-id", "client-message-id"]
    const operation = createGuestRenegotiationOperation(() => ids.shift()!)
    let attempted = operation

    expect(operation).toEqual({
      negotiationId: "negotiation-id",
      clientMessageId: "client-message-id",
      attempts: 0,
    })

    for (let attempt = 1; attempt <= GUEST_RENEGOTIATION_MAX_RETRIES + 1; attempt += 1) {
      attempted = recordGuestRenegotiationAttempt(attempted)
      expect(attempted.negotiationId).toBe(operation.negotiationId)
      expect(attempted.clientMessageId).toBe(operation.clientMessageId)
      expect(shouldRetryGuestRenegotiation(attempted.attempts)).toBe(
        attempt <= GUEST_RENEGOTIATION_MAX_RETRIES,
      )
    }
  })

  it("uses bounded zero-to-twenty-percent jitter on exponential delays", () => {
    expect(getGuestRenegotiationRetryDelay(1, () => 0)).toBe(1_000)
    expect(getGuestRenegotiationRetryDelay(1, () => 1)).toBe(1_200)
    expect(getGuestRenegotiationRetryDelay(2, () => 0)).toBe(2_000)
    expect(getGuestRenegotiationRetryDelay(4, () => 0)).toBe(8_000)
    expect(getGuestRenegotiationRetryDelay(4, () => 1)).toBe(9_600)
  })
})
