import { isIP } from "node:net"
import {
  TRANSFER_MAX_BYTES,
  TransferError,
  normalizeTransferCode,
  validTransferCode,
  parseTransferPayload,
  type TransferErrorCode,
} from "../../features/anime-tracker/transfer/model"
import type {
  AnimeTransferStore,
  TransferOperation,
} from "./anime-transfer-store"

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  Vary: "Origin",
}
const STATUS: Record<TransferErrorCode, number> = {
  INVALID_DATA: 400,
  TOO_LARGE: 413,
  INVALID_CODE: 400,
  NOT_FOUND: 410,
  CLAIMED: 409,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
  NETWORK: 503,
  LOCAL_CHANGED: 409,
  STORAGE_FAILED: 400,
  BACKUP_FAILED: 400,
  FORBIDDEN: 403,
}
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

async function readBody(request: Request): Promise<unknown> {
  if (
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase() !== "application/json"
  )
    throw new TransferError("INVALID_DATA")
  const limit = TRANSFER_MAX_BYTES + 2048
  const length = request.headers.get("content-length")
  if (length !== null && (!/^\d+$/u.test(length) || Number(length) > limit))
    throw new TransferError("TOO_LARGE")
  if (!request.body) throw new TransferError("INVALID_DATA")
  const reader = request.body.getReader()
  const parts: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new TransferError("TOO_LARGE")
      }
      parts.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.byteLength
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))
  } catch {
    throw new TransferError("INVALID_DATA")
  }
}

export function parseTransferOperation(value: unknown): TransferOperation {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TransferError("INVALID_DATA")
  const input = value as Record<string, unknown>
  if (input.action === "create") {
    if (typeof input.requestId !== "string" || !UUID.test(input.requestId))
      throw new TransferError("INVALID_DATA")
    return {
      action: "create",
      requestId: input.requestId,
      payload: parseTransferPayload(input.payload),
    }
  }
  if (input.action !== "claim" && input.action !== "complete")
    throw new TransferError("INVALID_DATA")
  if (typeof input.receiverId !== "string" || !UUID.test(input.receiverId))
    throw new TransferError("INVALID_DATA")
  const code =
    typeof input.code === "string" ? normalizeTransferCode(input.code) : ""
  if (!validTransferCode(code)) throw new TransferError("INVALID_CODE")
  return { action: input.action, code, receiverId: input.receiverId }
}

export function transferActor(
  request: Request,
  environment: Record<string, string | undefined>,
): string {
  // Trust only headers overwritten by the actual hosting platform. On unknown
  // proxies use a shared bucket instead of trusting spoofable forwarded IPs.
  const ip =
    environment.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : environment.CF_WORKER === "1"
        ? request.headers.get("cf-connecting-ip")?.trim()
        : undefined
  return ip && isIP(ip) ? ip : "shared"
}

export async function handleAnimeTransfer(
  request: Request,
  store: AnimeTransferStore,
  environment: Record<string, string | undefined> = process.env,
): Promise<Response> {
  try {
    if (request.method !== "POST")
      return new Response(null, {
        status: 405,
        headers: { ...HEADERS, Allow: "POST" },
      })
    const url = new URL(request.url)
    // Next's URL can retain its listening port behind a local/hosting proxy.
    // Host is the browser's destination; never trust X-Forwarded-Host here.
    const expectedOrigin = `${url.protocol}//${request.headers.get("host") ?? url.host}`
    if (
      request.headers.get("origin") !== expectedOrigin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new TransferError("FORBIDDEN")
    const input = parseTransferOperation(await readBody(request))
    const result = await store.execute(
      input,
      transferActor(request, environment),
    )
    return new Response(JSON.stringify(result), { headers: HEADERS })
  } catch (error) {
    // Never return/log provider messages, payloads, codes, URLs or credentials.
    const code =
      error instanceof TransferError && error.code in STATUS
        ? error.code
        : "UNAVAILABLE"
    return new Response(JSON.stringify({ error: { code } }), {
      status: STATUS[code],
      headers: {
        ...HEADERS,
        ...(code === "RATE_LIMITED" ? { "Retry-After": "600" } : {}),
      },
    })
  }
}
