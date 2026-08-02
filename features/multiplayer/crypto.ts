export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

const encoder = new TextEncoder()

export function encodeUtf8(value: string): Uint8Array {
  return encoder.encode(value)
}

export function canonicalizeJson(value: JsonValue): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value)
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Multiplayer JSON cannot contain non-finite numbers")
    }
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJson).join(",")}]`
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`)
    .join(",")}}`
}

export function canonicalJsonBytes(value: JsonValue): Uint8Array {
  return encodeUtf8(canonicalizeJson(value))
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function hexToBytes(value: string): Uint8Array {
  if (!/^[a-f\d]+$/i.test(value) || value.length % 2 !== 0) {
    throw new TypeError("Expected an even-length hexadecimal string")
  }

  const result = new Uint8Array(value.length / 2)
  for (let index = 0; index < result.length; index += 1) {
    result[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
  }
  return result
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)

  if (typeof btoa === "function") {
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "")
  }

  const NodeBuffer = (
    globalThis as typeof globalThis & {
      Buffer?: { from(input: Uint8Array): { toString(encoding: string): string } }
    }
  ).Buffer

  if (!NodeBuffer) throw new Error("Base64 encoding is unavailable")
  return NodeBuffer.from(bytes).toString("base64url")
}

export function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z\d_-]+$/u.test(value)) {
    throw new TypeError("Expected an unpadded base64url string")
  }

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")

  if (typeof atob === "function") {
    const binary = atob(padded)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  }

  const NodeBuffer = (
    globalThis as typeof globalThis & {
      Buffer?: { from(input: string, encoding: string): Uint8Array }
    }
  ).Buffer

  if (!NodeBuffer) throw new Error("Base64 decoding is unavailable")
  return new Uint8Array(NodeBuffer.from(value, "base64url"))
}

export interface MultiplayerCrypto {
  randomBytes(length: number): Uint8Array
  sha256(input: Uint8Array): Promise<Uint8Array>
}

function getWebCrypto(): Crypto {
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto.subtle) {
    throw new Error("Web Crypto is unavailable")
  }
  return globalThis.crypto
}

export const webMultiplayerCrypto: MultiplayerCrypto = {
  randomBytes(length) {
    if (!Number.isInteger(length) || length <= 0 || length > 65_536) {
      throw new RangeError("Random byte length is out of range")
    }
    return getWebCrypto().getRandomValues(new Uint8Array(length))
  },
  async sha256(input) {
    return new Uint8Array(await getWebCrypto().subtle.digest("SHA-256", input))
  },
}

export async function hashJson(
  value: JsonValue,
  crypto: Pick<MultiplayerCrypto, "sha256"> = webMultiplayerCrypto,
): Promise<string> {
  return bytesToHex(await crypto.sha256(canonicalJsonBytes(value)))
}
