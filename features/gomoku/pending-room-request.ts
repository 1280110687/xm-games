export const PENDING_ROOM_REQUEST_STORAGE_KEY =
  "xm-games:gomoku:pending-room-request:v1"
export const PENDING_ROOM_REQUEST_TTL_MS = 2 * 60_000

export type PendingRoomRequest =
  | {
      version: 2
      kind: "create"
      requestId: string
      expiresAt: number
    }
  | {
      version: 2
      kind: "join"
      roomId: string
      requestId: string
      expiresAt: number
    }

type PendingRoomRequestKind = PendingRoomRequest["kind"]

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)
}

export function parsePendingRoomRequest(
  value: string,
  now = Date.now(),
  ttlMs = PENDING_ROOM_REQUEST_TTL_MS,
): PendingRoomRequest | null {
  try {
    const parsed: unknown = JSON.parse(value)
    if (
      !isRecord(parsed)
      || parsed.version !== 2
      || !isUuid(parsed.requestId)
      || !Number.isSafeInteger(parsed.expiresAt)
      || Number(parsed.expiresAt) <= now
      || Number(parsed.expiresAt) > now + ttlMs
    ) return null

    if (parsed.kind === "create") {
      return {
        version: 2,
        kind: "create",
        requestId: parsed.requestId,
        expiresAt: Number(parsed.expiresAt),
      }
    }
    if (
      parsed.kind === "join"
      && typeof parsed.roomId === "string"
      && /^\d{6}$/u.test(parsed.roomId)
    ) {
      return {
        version: 2,
        kind: "join",
        roomId: parsed.roomId,
        requestId: parsed.requestId,
        expiresAt: Number(parsed.expiresAt),
      }
    }
    return null
  } catch {
    return null
  }
}

export function pendingRoomRequestMatches(
  request: PendingRoomRequest,
  kind: PendingRoomRequestKind,
  roomId?: string,
): boolean {
  if (request.kind !== kind) return false
  return kind === "create" || (request.kind === "join" && request.roomId === roomId)
}

export class PendingRoomRequestStore {
  private current: PendingRoomRequest | null = null

  constructor(
    private readonly storage: StorageLike | null,
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => number = () => Date.now(),
    private readonly ttlMs = PENDING_ROOM_REQUEST_TTL_MS,
  ) {}

  getOrCreate(kind: "create"): PendingRoomRequest
  getOrCreate(kind: "join", roomId: string): PendingRoomRequest
  getOrCreate(kind: PendingRoomRequestKind, roomId?: string): PendingRoomRequest {
    const existing = this.load()
    if (existing && pendingRoomRequestMatches(existing, kind, roomId)) return existing

    return kind === "create"
      ? this.replace("create")
      : this.replace("join", roomId ?? "")
  }

  replace(kind: "create"): PendingRoomRequest
  replace(kind: "join", roomId: string): PendingRoomRequest
  replace(kind: PendingRoomRequestKind, roomId?: string): PendingRoomRequest {
    const normalizedRoomId = roomId ?? ""
    if (kind === "join" && !/^\d{6}$/u.test(normalizedRoomId)) {
      throw new TypeError("A six-digit roomId is required for a join request")
    }

    const expiresAt = this.now() + this.ttlMs
    const request: PendingRoomRequest = kind === "create"
      ? { version: 2, kind, requestId: this.createId(), expiresAt }
      : {
          version: 2,
          kind,
          roomId: normalizedRoomId,
          requestId: this.createId(),
          expiresAt,
        }
    this.current = request
    try {
      this.storage?.setItem(PENDING_ROOM_REQUEST_STORAGE_KEY, JSON.stringify(request))
    } catch {
      // The current page can still reuse the request through memory.
    }
    return request
  }

  clear(): void {
    this.current = null
    try {
      this.storage?.removeItem(PENDING_ROOM_REQUEST_STORAGE_KEY)
    } catch {
      // Ignore restricted storage contexts.
    }
  }

  private load(): PendingRoomRequest | null {
    const now = this.now()
    if (this.current && this.current.expiresAt > now) return this.current
    this.current = null
    try {
      const raw = this.storage?.getItem(PENDING_ROOM_REQUEST_STORAGE_KEY)
      if (!raw) return null
      const parsed = parsePendingRoomRequest(raw, now, this.ttlMs)
      if (!parsed) this.storage?.removeItem(PENDING_ROOM_REQUEST_STORAGE_KEY)
      this.current = parsed
      return parsed
    } catch {
      return null
    }
  }
}
