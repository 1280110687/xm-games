import {
  TransferError,
  parseTransferPayload,
  validTransferCode,
  type ClaimedTransfer,
  type CreatedTransfer,
  type TransferPayload,
} from "./model"

const API = "/api/anime-transfer"
const RECEIVER_KEY = "xm-games-anime-transfer-receiver-v1"
let transientReceiver: string | undefined

export function getTransferReceiver(): string {
  if (transientReceiver) return transientReceiver
  try {
    const saved = sessionStorage.getItem(RECEIVER_KEY)
    if (
      saved &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
        saved,
      )
    )
      return (transientReceiver = saved)
  } catch {
    /* In-memory retries still work when sessionStorage is unavailable. */
  }
  const receiver = crypto.randomUUID()
  transientReceiver = receiver
  try {
    sessionStorage.setItem(RECEIVER_KEY, receiver)
  } catch {
    /* No persistent library data is stored here. */
  }
  return receiver
}

async function requestTransfer(
  body: unknown,
  fetcher: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetcher(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    })
    const result = await response.json()
    if (!response.ok) {
      const codes = [
        "INVALID_DATA",
        "TOO_LARGE",
        "INVALID_CODE",
        "NOT_FOUND",
        "CLAIMED",
        "RATE_LIMITED",
        "UNAVAILABLE",
        "FORBIDDEN",
      ]
      throw new TransferError(
        codes.includes(result?.error?.code) ? result.error.code : "UNAVAILABLE",
      )
    }
    if (!result || typeof result !== "object" || Array.isArray(result))
      throw new TransferError("INVALID_DATA")
    return result
  } catch (error) {
    if (error instanceof TransferError) throw error
    throw new TransferError("NETWORK")
  } finally {
    clearTimeout(timeout)
  }
}

export async function sendAnimeTransfer(
  payload: TransferPayload,
  requestId: string,
  fetcher?: typeof fetch,
): Promise<CreatedTransfer> {
  const value = await requestTransfer(
    { action: "create", payload, requestId },
    fetcher,
  )
  if (
    typeof value.code !== "string" ||
    !validTransferCode(value.code) ||
    typeof value.expiresAt !== "number" ||
    !Number.isSafeInteger(value.expiresAt) ||
    value.expiresAt <= 0
  )
    throw new TransferError("INVALID_DATA")
  return { code: value.code, expiresAt: value.expiresAt }
}

export async function claimAnimeTransfer(
  code: string,
  receiverId: string,
  fetcher?: typeof fetch,
): Promise<ClaimedTransfer> {
  const value = await requestTransfer(
    { action: "claim", code, receiverId },
    fetcher,
  )
  if (
    typeof value.transferId !== "string" ||
    !/^[0-9a-f]{64}$/u.test(value.transferId) ||
    typeof value.expiresAt !== "number" ||
    !Number.isSafeInteger(value.expiresAt) ||
    value.expiresAt <= 0
  )
    throw new TransferError("INVALID_DATA")
  return {
    transferId: value.transferId,
    expiresAt: value.expiresAt,
    payload: parseTransferPayload(value.payload),
  }
}

export async function completeAnimeTransfer(
  code: string,
  receiverId: string,
  fetcher?: typeof fetch,
): Promise<void> {
  try {
    const value = await requestTransfer(
      { action: "complete", code, receiverId },
      fetcher,
    )
    if (value.completed !== true) throw new TransferError("INVALID_DATA")
  } catch (error) {
    // Only called AFTER successful local persistence. Expired data is already gone.
    if (error instanceof TransferError && error.code === "NOT_FOUND") return
    throw error
  }
}
