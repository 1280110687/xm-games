import { describe, expect, it, vi } from "vitest"
import { MULTIPLAYER_PROTOCOL_VERSION, type MultiplayerMessage } from "./protocol"
import {
  ReliableRtcChannel,
  RtcChannelConfigurationError,
} from "./rtc-channel"

class FakeRtcDataChannel extends EventTarget {
  label = "xm-games-v1"
  ordered = true
  maxPacketLifeTime: number | null = null
  maxRetransmits: number | null = null
  readyState: RTCDataChannelState = "open"
  binaryType: BinaryType = "blob"
  sent: string[] = []

  send(data: string): void {
    this.sent.push(data)
  }

  receive(data: unknown): void {
    this.dispatchEvent(new MessageEvent("message", { data }))
  }
}

const heartbeat: MultiplayerMessage<"peer.heartbeat"> = {
  v: MULTIPLAYER_PROTOCOL_VERSION,
  type: "peer.heartbeat",
  messageId: "message-1",
  roomId: "ROOM01",
  matchId: "match-1",
  senderId: "peer-a",
  sentAt: 10,
  payload: { nonce: "nonce-1" },
}

describe("reliable RTC data channel", () => {
  it("rejects unordered or partially reliable channels", () => {
    const unordered = new FakeRtcDataChannel()
    unordered.ordered = false
    expect(() => new ReliableRtcChannel(unordered as unknown as RTCDataChannel))
      .toThrow(RtcChannelConfigurationError)

    const expiring = new FakeRtcDataChannel()
    expiring.maxPacketLifeTime = 2_000
    expect(() => new ReliableRtcChannel(expiring as unknown as RTCDataChannel))
      .toThrow(RtcChannelConfigurationError)
  })

  it("serializes outgoing messages and validates incoming messages", async () => {
    const dataChannel = new FakeRtcDataChannel()
    const channel = new ReliableRtcChannel(dataChannel as unknown as RTCDataChannel)
    const received = new Promise<MultiplayerMessage>((resolve) => channel.onMessage(resolve))

    channel.send(heartbeat)
    expect(JSON.parse(dataChannel.sent[0])).toEqual(heartbeat)

    dataChannel.receive(new TextEncoder().encode(JSON.stringify(heartbeat)))
    await expect(received).resolves.toEqual(heartbeat)
  })

  it("reports malformed inbound data without notifying game listeners", async () => {
    const dataChannel = new FakeRtcDataChannel()
    const channel = new ReliableRtcChannel(dataChannel as unknown as RTCDataChannel)
    const messageListener = vi.fn()
    channel.onMessage(messageListener)
    const error = new Promise<Error>((resolve) => channel.onError(resolve))

    dataChannel.receive("not-json")
    await expect(error).resolves.toEqual(expect.objectContaining({ code: "INVALID_JSON" }))
    expect(messageListener).not.toHaveBeenCalled()
  })
})
