import {
  MAX_MULTIPLAYER_MESSAGE_BYTES,
  parseMultiplayerMessage,
  serializeMultiplayerMessage,
  type MultiplayerMessage,
} from "./protocol"

export const MULTIPLAYER_DATA_CHANNEL_LABEL = "xm-games-v1"

export class RtcChannelConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RtcChannelConfigurationError"
  }
}

export class RtcChannelStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RtcChannelStateError"
  }
}

export type RtcChannelMessageListener = (message: MultiplayerMessage) => void
export type RtcChannelErrorListener = (error: Error) => void
export type RtcChannelStateListener = (state: RTCDataChannelState) => void

export type ReliableRtcChannelOptions = {
  maxMessageBytes?: number
}

async function normalizeRtcMessageData(data: unknown): Promise<string | ArrayBuffer | ArrayBufferView> {
  if (typeof data === "string" || data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    return data
  }
  if (typeof Blob !== "undefined" && data instanceof Blob) return data.arrayBuffer()
  throw new TypeError("Unsupported RTCDataChannel message data")
}

export function assertReliableOrderedDataChannel(channel: RTCDataChannel): void {
  if (!channel.ordered) {
    throw new RtcChannelConfigurationError("Multiplayer data channel must be ordered")
  }
  if (channel.maxPacketLifeTime !== null || channel.maxRetransmits !== null) {
    throw new RtcChannelConfigurationError("Multiplayer data channel must use reliable delivery")
  }
}

export function createReliableOrderedDataChannel(
  peerConnection: RTCPeerConnection,
  label = MULTIPLAYER_DATA_CHANNEL_LABEL,
): RTCDataChannel {
  return peerConnection.createDataChannel(label, { ordered: true })
}

export class ReliableRtcChannel {
  private readonly messageListeners = new Set<RtcChannelMessageListener>()
  private readonly errorListeners = new Set<RtcChannelErrorListener>()
  private readonly stateListeners = new Set<RtcChannelStateListener>()
  private readonly maxMessageBytes: number
  private disposed = false

  constructor(
    private readonly channel: RTCDataChannel,
    options: ReliableRtcChannelOptions = {},
  ) {
    assertReliableOrderedDataChannel(channel)
    this.maxMessageBytes = options.maxMessageBytes ?? MAX_MULTIPLAYER_MESSAGE_BYTES
    channel.binaryType = "arraybuffer"
    channel.addEventListener("message", this.handleMessage)
    channel.addEventListener("open", this.handleStateChange)
    channel.addEventListener("closing", this.handleStateChange)
    channel.addEventListener("close", this.handleStateChange)
    channel.addEventListener("error", this.handleChannelError)
  }

  get readyState(): RTCDataChannelState {
    return this.channel.readyState
  }

  send(message: MultiplayerMessage): void {
    if (this.disposed) throw new RtcChannelStateError("RTCDataChannel wrapper is disposed")
    if (this.channel.readyState !== "open") {
      throw new RtcChannelStateError(`RTCDataChannel is ${this.channel.readyState}`)
    }
    this.channel.send(serializeMultiplayerMessage(message, this.maxMessageBytes))
  }

  onMessage(listener: RtcChannelMessageListener): () => void {
    this.messageListeners.add(listener)
    return () => this.messageListeners.delete(listener)
  }

  onError(listener: RtcChannelErrorListener): () => void {
    this.errorListeners.add(listener)
    return () => this.errorListeners.delete(listener)
  }

  onStateChange(listener: RtcChannelStateListener): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.channel.removeEventListener("message", this.handleMessage)
    this.channel.removeEventListener("open", this.handleStateChange)
    this.channel.removeEventListener("closing", this.handleStateChange)
    this.channel.removeEventListener("close", this.handleStateChange)
    this.channel.removeEventListener("error", this.handleChannelError)
    this.messageListeners.clear()
    this.errorListeners.clear()
    this.stateListeners.clear()
  }

  private emitError(error: unknown): void {
    const normalized = error instanceof Error ? error : new Error(String(error))
    for (const listener of this.errorListeners) listener(normalized)
  }

  private readonly handleMessage = (event: MessageEvent): void => {
    void normalizeRtcMessageData(event.data)
      .then((input) => parseMultiplayerMessage(input, this.maxMessageBytes))
      .then((message) => {
        for (const listener of this.messageListeners) listener(message)
      })
      .catch((error: unknown) => this.emitError(error))
  }

  private readonly handleStateChange = (): void => {
    for (const listener of this.stateListeners) listener(this.channel.readyState)
  }

  private readonly handleChannelError = (): void => {
    this.emitError(new Error("RTCDataChannel reported an error"))
  }
}
