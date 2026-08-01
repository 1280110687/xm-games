import { describe, expect, it } from "vitest"

import {
  collapseBlankLines,
  decodeBase64Utf8,
  deduplicateLines,
  encodeBase64Utf8,
  formatJson,
  getTextStats,
  minifyJson,
  OfflineToolError,
  cleanText,
  trimLineWhitespace,
  validateJson,
} from "./offline-tools"

describe("JSON tools", () => {
  it("formats and minifies objects, arrays, and multilingual values", () => {
    const source = '{"name":"游戏 👾","enabled":true,"items":[1,null,"สวัสดี"]}'

    expect(formatJson(source)).toBe(`{
  "name": "游戏 👾",
  "enabled": true,
  "items": [
    1,
    null,
    "สวัสดี"
  ]
}`)
    expect(minifyJson(formatJson(source))).toBe(source)
  })

  it("preserves large numbers, duplicate keys, escapes, and number literals", () => {
    const source = String.raw`{
      "id": 90071992547409931234567890,
      "same": " first\t value ",
      "same": "second",
      "exponent": 1.2300e+004,
      "escaped": "a  b\\\" { }"
    }`
    const compact = String.raw`{"id":90071992547409931234567890,"same":" first\t value ","same":"second","exponent":1.2300e+004,"escaped":"a  b\\\" { }"}`

    expect(minifyJson(source)).toBe(compact)
    expect(formatJson(source)).toBe(String.raw`{
  "id": 90071992547409931234567890,
  "same": " first\t value ",
  "same": "second",
  "exponent": 1.2300e+004,
  "escaped": "a  b\\\" { }"
}`)
    expect(minifyJson(formatJson(source))).toBe(compact)
  })

  it("validates JSON and exposes a readable error location when available", () => {
    expect(validateJson('[1, {"ok": true}]')).toMatchObject({ valid: true })

    const result = validateJson('{"ok": true,}')
    expect(result.valid).toBe(false)

    if (!result.valid) {
      expect(result.error.message).toContain("JSON 格式错误")
      expect(result.error.position).toBe(12)
      expect(result.error.line).toBe(1)
      expect(result.error.column).toBe(13)
    }
  })

  it("returns a stable empty-input error and throws typed formatting errors", () => {
    expect(validateJson("  \n ")).toEqual({
      valid: false,
      error: {
        message: "JSON 内容不能为空（第 1 行，第 1 列）",
        position: 0,
        line: 1,
        column: 1,
      },
    })

    expect(() => formatJson("{]")).toThrow(OfflineToolError)
    expect(() => formatJson("{}", 11)).toThrow(RangeError)
  })
})

describe("UTF-8 Base64 tools", () => {
  it("round-trips Chinese, English, Thai, and emoji", () => {
    const source = "离线工具 · hello · สวัสดี · 👨‍👩‍👧‍👦"
    const encoded = encodeBase64Utf8(source)

    expect(encoded).toMatch(/^[A-Za-z0-9+/]+={0,2}$/u)
    expect(decodeBase64Utf8(encoded)).toBe(source)
  })

  it("handles empty text and known UTF-8 output", () => {
    expect(encodeBase64Utf8("")).toBe("")
    expect(decodeBase64Utf8("")).toBe("")
    expect(encodeBase64Utf8("你好")).toBe("5L2g5aW9")
  })

  it("rejects malformed, non-canonical, and non-UTF-8 Base64", () => {
    for (const invalid of ["SGVsbG8", "SGV sbG8=", "SGVsbG8===", "AB=="]) {
      expect(() => decodeBase64Utf8(invalid)).toThrow(OfflineToolError)
    }

    expect(() => decodeBase64Utf8("/w==")).toThrowError(
      expect.objectContaining({ code: "INVALID_UTF8" }),
    )
  })
})

describe("text statistics and cleanup", () => {
  it("counts grapheme characters, non-whitespace, words, and mixed newlines", () => {
    expect(getTextStats("Hi 👨‍👩‍👧‍👦\r\n世界 สวัสดี\n")).toEqual({
      characterCount: 13,
      nonWhitespaceCharacterCount: 9,
      wordCount: 3,
      lineCount: 3,
    })
    expect(getTextStats("")).toEqual({
      characterCount: 0,
      nonWhitespaceCharacterCount: 0,
      wordCount: 0,
      lineCount: 0,
    })
  })

  it("trims every line and normalizes line endings", () => {
    expect(trimLineWhitespace("  first  \r\n\tsecond\t\r third ")).toBe(
      "first\nsecond\nthird",
    )
  })

  it("compresses whitespace-only blank lines without changing content lines", () => {
    expect(collapseBlankLines("first\n \n\t\n\n  second  \n\n")).toBe(
      "first\n\n  second  \n",
    )
  })

  it("deduplicates exact lines in first-seen order", () => {
    expect(deduplicateLines("beta\nalpha\nbeta\nAlpha\nalpha")).toBe(
      "beta\nalpha\nAlpha",
    )
  })

  it("organizes text in a predictable trim, collapse, deduplicate order", () => {
    expect(cleanText("  beta \n\n \n alpha\nbeta\n alpha  ")).toBe(
      "beta\n\nalpha",
    )
  })
})
