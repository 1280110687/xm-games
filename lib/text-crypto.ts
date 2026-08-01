const PAYLOAD_PREFIX = "XMG1"
const SALT_BYTES = 16
const IV_BYTES = 12
const KEY_LENGTH = 256
const PBKDF2_ITERATIONS = 600_000
const MIN_PBKDF2_ITERATIONS = 100_000
const MAX_PBKDF2_ITERATIONS = 1_200_000

export type TextCryptoErrorCode =
  | "INVALID_FORMAT"
  | "DECRYPT_FAILED"
  | "UNSUPPORTED"

export class TextCryptoError extends Error {
  constructor(public readonly code: TextCryptoErrorCode) {
    super(code)
    this.name = "TextCryptoError"
  }
}

function getWebCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new TextCryptoError("UNSUPPORTED")
  }

  return globalThis.crypto
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "")
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new TextCryptoError("INVALID_FORMAT")
  }

  const normalized = value.replaceAll("-", "+").replaceAll("_", "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")

  try {
    const binary = atob(padded)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    throw new TextCryptoError("INVALID_FORMAT")
  }
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const webCrypto = getWebCrypto()
  const passwordKey = await webCrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  )

  return webCrypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    passwordKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  )
}

export async function encryptText(
  plaintext: string,
  password: string,
): Promise<string> {
  const webCrypto = getWebCrypto()
  const salt = webCrypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = webCrypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS)
  const header = `${PAYLOAD_PREFIX}.${PBKDF2_ITERATIONS}`
  const ciphertext = await webCrypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: new TextEncoder().encode(header),
      tagLength: 128,
    },
    key,
    new TextEncoder().encode(plaintext),
  )

  return [
    PAYLOAD_PREFIX,
    String(PBKDF2_ITERATIONS),
    bytesToBase64Url(salt),
    bytesToBase64Url(iv),
    bytesToBase64Url(new Uint8Array(ciphertext)),
  ].join(".")
}

export async function decryptText(
  payload: string,
  password: string,
): Promise<string> {
  const parts = payload.trim().split(".")

  if (parts.length !== 5 || parts[0] !== PAYLOAD_PREFIX) {
    throw new TextCryptoError("INVALID_FORMAT")
  }

  const iterations = Number(parts[1])

  if (
    !Number.isSafeInteger(iterations) ||
    iterations < MIN_PBKDF2_ITERATIONS ||
    iterations > MAX_PBKDF2_ITERATIONS
  ) {
    throw new TextCryptoError("INVALID_FORMAT")
  }

  const salt = base64UrlToBytes(parts[2])
  const iv = base64UrlToBytes(parts[3])
  const ciphertext = base64UrlToBytes(parts[4])

  if (
    salt.length !== SALT_BYTES ||
    iv.length !== IV_BYTES ||
    ciphertext.length < 16
  ) {
    throw new TextCryptoError("INVALID_FORMAT")
  }

  try {
    const header = `${PAYLOAD_PREFIX}.${iterations}`
    const key = await deriveKey(password, salt, iterations)
    const plaintext = await getWebCrypto().subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: new TextEncoder().encode(header),
        tagLength: 128,
      },
      key,
      ciphertext,
    )

    return new TextDecoder("utf-8", { fatal: true }).decode(plaintext)
  } catch (error) {
    if (error instanceof TextCryptoError) throw error
    throw new TextCryptoError("DECRYPT_FAILED")
  }
}

export const textCryptoFormat = {
  prefix: PAYLOAD_PREFIX,
  iterations: PBKDF2_ITERATIONS,
} as const
