import { describe, expect, it } from "vitest"

import {
  decryptText,
  encryptText,
  TextCryptoError,
  textCryptoFormat,
} from "./text-crypto"

describe("text crypto", () => {
  it("round-trips multilingual text with AES-GCM", async () => {
    const plaintext = "离线加密 · สวัสดี · hello 👋"
    const encrypted = await encryptText(plaintext, "correct horse battery staple")

    expect(encrypted).toMatch(
      /^XMG1\.600000\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u,
    )
    await expect(
      decryptText(encrypted, "correct horse battery staple"),
    ).resolves.toBe(plaintext)
  })

  it("uses fresh randomness for every encryption", async () => {
    const first = await encryptText("same content", "same password")
    const second = await encryptText("same content", "same password")

    expect(first).not.toBe(second)
  })

  it("rejects invalid payloads and wrong passwords", async () => {
    await expect(decryptText("not-an-xm-payload", "password123")).rejects.toMatchObject({
      code: "INVALID_FORMAT",
    } satisfies Partial<TextCryptoError>)

    const encrypted = await encryptText("secret", "password123")
    await expect(decryptText(encrypted, "wrong-password")).rejects.toMatchObject({
      code: "DECRYPT_FAILED",
    } satisfies Partial<TextCryptoError>)
  })

  it("exposes the versioned local format", () => {
    expect(textCryptoFormat.prefix).toBe("XMG1")
    expect(textCryptoFormat.iterations).toBeGreaterThanOrEqual(600_000)
  })
})
