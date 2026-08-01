const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

export interface JsonErrorDetails {
  message: string
  position: number | null
  line: number | null
  column: number | null
}

export type JsonValidationResult =
  | { valid: true }
  | { valid: false; error: JsonErrorDetails }

export type OfflineToolErrorCode =
  | "INVALID_JSON"
  | "INVALID_BASE64"
  | "INVALID_UTF8"

export class OfflineToolError extends Error {
  readonly code: OfflineToolErrorCode
  readonly position: number | null
  readonly line: number | null
  readonly column: number | null

  constructor(
    code: OfflineToolErrorCode,
    message: string,
    location: Omit<JsonErrorDetails, "message"> = {
      position: null,
      line: null,
      column: null,
    },
  ) {
    super(message)
    this.name = "OfflineToolError"
    this.code = code
    this.position = location.position
    this.line = location.line
    this.column = location.column
  }
}

function getLineAndColumn(
  source: string,
  position: number,
): { line: number; column: number } {
  const beforeError = source.slice(0, position)
  const lines = beforeError.split(/\r\n|\r|\n/u)

  return {
    line: lines.length,
    column: Array.from(lines.at(-1) ?? "").length + 1,
  }
}

function getJsonErrorDetails(source: string, error: unknown): JsonErrorDetails {
  if (source.trim().length === 0) {
    return {
      message: "JSON 内容不能为空（第 1 行，第 1 列）",
      position: 0,
      line: 1,
      column: 1,
    }
  }

  const nativeMessage = error instanceof Error ? error.message : ""
  const positionMatch = nativeMessage.match(/\bposition\s+(\d+)\b/iu)
  const position = positionMatch ? Number(positionMatch[1]) : null

  if (position !== null && Number.isSafeInteger(position)) {
    const { line, column } = getLineAndColumn(source, position)

    return {
      message: `JSON 格式错误（第 ${line} 行，第 ${column} 列；位置 ${position}）`,
      position,
      line,
      column,
    }
  }

  const lineColumnMatch = nativeMessage.match(
    /\bline\s+(\d+)\s+column\s+(\d+)\b/iu,
  )

  if (lineColumnMatch) {
    const line = Number(lineColumnMatch[1])
    const column = Number(lineColumnMatch[2])

    return {
      message: `JSON 格式错误（第 ${line} 行，第 ${column} 列）`,
      position: null,
      line,
      column,
    }
  }

  return {
    message: "JSON 格式错误，请检查引号、逗号和括号是否完整",
    position: null,
    line: null,
    column: null,
  }
}

function assertValidJson(source: string): void {
  try {
    JSON.parse(source)
  } catch (error) {
    const details = getJsonErrorDetails(source, error)
    throw new OfflineToolError("INVALID_JSON", details.message, details)
  }
}

function isJsonWhitespace(character: string): boolean {
  return (
    character === " " ||
    character === "\t" ||
    character === "\n" ||
    character === "\r"
  )
}

function removeJsonWhitespace(source: string): string {
  let result = ""
  let inString = false
  let escaped = false

  for (const character of source) {
    if (inString) {
      result += character

      if (escaped) {
        escaped = false
      } else if (character === "\\") {
        escaped = true
      } else if (character === '"') {
        inString = false
      }

      continue
    }

    if (character === '"') {
      inString = true
      result += character
    } else if (!isJsonWhitespace(character)) {
      result += character
    }
  }

  return result
}

function prettyPrintJson(source: string, indent: number): string {
  if (indent === 0) return source

  let result = ""
  let depth = 0
  let inString = false
  let escaped = false
  const indentation = (level: number) => " ".repeat(level * indent)

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (inString) {
      result += character

      if (escaped) {
        escaped = false
      } else if (character === "\\") {
        escaped = true
      } else if (character === '"') {
        inString = false
      }

      continue
    }

    if (character === '"') {
      inString = true
      result += character
      continue
    }

    if (character === "{" || character === "[") {
      result += character

      const closingCharacter = character === "{" ? "}" : "]"
      if (source[index + 1] !== closingCharacter) {
        depth += 1
        result += `\n${indentation(depth)}`
      }
    } else if (character === "}" || character === "]") {
      const openingCharacter = character === "}" ? "{" : "["

      if (source[index - 1] !== openingCharacter) {
        depth -= 1
        result += `\n${indentation(depth)}`
      }

      result += character
    } else if (character === ",") {
      result += `,\n${indentation(depth)}`
    } else if (character === ":") {
      result += ": "
    } else {
      result += character
    }
  }

  return result
}

function assertIndent(indent: number): void {
  if (!Number.isInteger(indent) || indent < 0 || indent > 10) {
    throw new RangeError("JSON 缩进必须是 0 到 10 之间的整数")
  }
}

/** Validates JSON without modifying the source text. */
export function validateJson(source: string): JsonValidationResult {
  try {
    assertValidJson(source)
    return { valid: true }
  } catch (error) {
    if (error instanceof OfflineToolError && error.code === "INVALID_JSON") {
      return {
        valid: false,
        error: {
          message: error.message,
          position: error.position,
          line: error.line,
          column: error.column,
        },
      }
    }

    throw error
  }
}

/** Parses and pretty-prints JSON using 2 spaces by default. */
export function formatJson(source: string, indent = 2): string {
  assertIndent(indent)
  assertValidJson(source)
  return prettyPrintJson(removeJsonWhitespace(source), indent)
}

/** Parses JSON before returning its smallest standards-compliant form. */
export function minifyJson(source: string): string {
  assertValidJson(source)
  return removeJsonWhitespace(source)
}

function encodeBase64Bytes(bytes: Uint8Array): string {
  let result = ""

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]
    const hasSecond = index + 1 < bytes.length
    const hasThird = index + 2 < bytes.length
    const second = hasSecond ? bytes[index + 1] : 0
    const third = hasThird ? bytes[index + 2] : 0
    const value = (first << 16) | (second << 8) | third

    result += BASE64_ALPHABET[(value >>> 18) & 63]
    result += BASE64_ALPHABET[(value >>> 12) & 63]
    result += hasSecond ? BASE64_ALPHABET[(value >>> 6) & 63] : "="
    result += hasThird ? BASE64_ALPHABET[value & 63] : "="
  }

  return result
}

function decodeBase64Bytes(source: string): Uint8Array {
  const isValid =
    source.length % 4 === 0 &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      source,
    )

  if (!isValid) {
    throw new OfflineToolError(
      "INVALID_BASE64",
      "Base64 格式无效，请检查字符与末尾补位",
    )
  }

  const padding = source.endsWith("==") ? 2 : source.endsWith("=") ? 1 : 0
  const bytes = new Uint8Array((source.length / 4) * 3 - padding)
  let byteIndex = 0

  for (let index = 0; index < source.length; index += 4) {
    const first = BASE64_ALPHABET.indexOf(source[index])
    const second = BASE64_ALPHABET.indexOf(source[index + 1])
    const third = source[index + 2] === "=" ? 0 : BASE64_ALPHABET.indexOf(source[index + 2])
    const fourth = source[index + 3] === "=" ? 0 : BASE64_ALPHABET.indexOf(source[index + 3])
    const value = (first << 18) | (second << 12) | (third << 6) | fourth

    if (byteIndex < bytes.length) bytes[byteIndex++] = (value >>> 16) & 255
    if (byteIndex < bytes.length) bytes[byteIndex++] = (value >>> 8) & 255
    if (byteIndex < bytes.length) bytes[byteIndex++] = value & 255
  }

  if (encodeBase64Bytes(bytes) !== source) {
    throw new OfflineToolError(
      "INVALID_BASE64",
      "Base64 格式无效，内容包含非标准补位",
    )
  }

  return bytes
}

/** Encodes text as standard Base64 after converting it to UTF-8 bytes. */
export function encodeBase64Utf8(source: string): string {
  return encodeBase64Bytes(new TextEncoder().encode(source))
}

/** Strictly decodes standard Base64 and rejects bytes that are not valid UTF-8. */
export function decodeBase64Utf8(source: string): string {
  const bytes = decodeBase64Bytes(source)

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    throw new OfflineToolError(
      "INVALID_UTF8",
      "Base64 内容不是有效的 UTF-8 文本",
    )
  }
}

export interface TextStatistics {
  characterCount: number
  nonWhitespaceCharacterCount: number
  wordCount: number
  lineCount: number
}

function getGraphemes(source: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })
    return Array.from(segmenter.segment(source), ({ segment }) => segment)
  }

  return Array.from(source)
}

function normalizeNewlines(source: string): string {
  return source.replace(/\r\n|\r/gu, "\n")
}

/** Counts visible characters, non-whitespace characters, words, and lines. */
export function getTextStats(source: string): TextStatistics {
  const graphemes = getGraphemes(source)
  const words = source.match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu)

  return {
    characterCount: graphemes.length,
    nonWhitespaceCharacterCount: graphemes.filter(
      (character) => !/^\s+$/u.test(character),
    ).length,
    wordCount: words?.length ?? 0,
    lineCount: source.length === 0 ? 0 : normalizeNewlines(source).split("\n").length,
  }
}

/** Trims leading and trailing whitespace from every line and normalizes to LF. */
export function trimLineWhitespace(source: string): string {
  return normalizeNewlines(source)
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
}

/** Replaces every run of whitespace-only lines with one empty line. */
export function collapseBlankLines(source: string): string {
  const result: string[] = []
  let previousWasBlank = false

  for (const line of normalizeNewlines(source).split("\n")) {
    const isBlank = line.trim().length === 0

    if (!isBlank || !previousWasBlank) {
      result.push(isBlank ? "" : line)
    }

    previousWasBlank = isBlank
  }

  return result.join("\n")
}

/** Removes exact duplicate lines while keeping their first occurrence. */
export function deduplicateLines(source: string): string {
  const seen = new Set<string>()

  return normalizeNewlines(source)
    .split("\n")
    .filter((line) => {
      if (seen.has(line)) return false
      seen.add(line)
      return true
    })
    .join("\n")
}

/** Applies line trimming, blank-line compression, then stable de-duplication. */
export function cleanText(source: string): string {
  return deduplicateLines(collapseBlankLines(trimLineWhitespace(source)))
}
