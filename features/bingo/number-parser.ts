import type { Locale } from "@/lib/i18n"

interface NumberMatch {
  index: number
  length: number
  value: number
}

const CHINESE_DIGITS: Record<string, number> = {
  "一": 1,
  "二": 2,
  "两": 2,
  "三": 3,
  "四": 4,
  "五": 5,
  "六": 6,
  "七": 7,
  "八": 8,
  "九": 9,
}

const THAI_UNITS: Record<string, number> = {
  "หนึ่ง": 1,
  "เอ็ด": 1,
  "สอง": 2,
  "สาม": 3,
  "สี่": 4,
  "ห้า": 5,
  "หก": 6,
  "เจ็ด": 7,
  "แปด": 8,
  "เก้า": 9,
}

const ENGLISH_UNITS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
}

const ENGLISH_TEENS: Record<string, number> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
}

const ENGLISH_TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
}

const CHINESE_NUMBER_PATTERN =
  /(?:[一二两三四五六七八九]\s*十(?:\s*[一二两三四五六七八九])?|十(?:\s*[一二两三四五六七八九])?|[一二两三四五六七八九])/gu

const THAI_UNIT_PATTERN = "(?:หนึ่ง|เอ็ด|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)"
const THAI_NUMBER_PATTERN = new RegExp(
  `(?:(?:ยี่|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)\\s*สิบ(?:\\s*${THAI_UNIT_PATTERN})?|สิบ(?:\\s*${THAI_UNIT_PATTERN})?|${THAI_UNIT_PATTERN})`,
  "gu",
)

const ENGLISH_NUMBER_PATTERN =
  /\b(?:(?:twenty|thirty|forty|fifty|sixty|seventy)(?:[\s-]+(?:one|two|three|four|five|six|seven|eight|nine))?|(?:ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)|(?:one|two|three|four|five|six|seven|eight|nine))\b/giu

function isBingoNumber(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 75
}

function parseChineseNumber(rawValue: string): number | null {
  const value = rawValue.replace(/\s/gu, "")
  const [tensPart, unitsPart, extraPart] = value.split("十")

  if (extraPart !== undefined) return null
  if (unitsPart === undefined) return CHINESE_DIGITS[tensPart] ?? null

  const tens = tensPart === "" ? 1 : CHINESE_DIGITS[tensPart]
  const units = unitsPart === "" ? 0 : CHINESE_DIGITS[unitsPart]
  if (tens === undefined || units === undefined) return null

  return tens * 10 + units
}

function parseThaiNumber(rawValue: string): number | null {
  const value = rawValue.replace(/\s/gu, "")
  const tenIndex = value.indexOf("สิบ")

  if (tenIndex === -1) return THAI_UNITS[value] ?? null

  const tensWord = value.slice(0, tenIndex)
  const unitsWord = value.slice(tenIndex + "สิบ".length)
  const tens = tensWord === "" ? 1 : tensWord === "ยี่" ? 2 : THAI_UNITS[tensWord]
  const units = unitsWord === "" ? 0 : THAI_UNITS[unitsWord]
  if (tens === undefined || units === undefined) return null

  return tens * 10 + units
}

function parseEnglishNumber(rawValue: string): number | null {
  const words = rawValue.toLowerCase().split(/[\s-]+/u)
  if (words.length === 1) {
    return ENGLISH_UNITS[words[0]] ?? ENGLISH_TEENS[words[0]] ?? ENGLISH_TENS[words[0]] ?? null
  }

  if (words.length !== 2) return null

  const tens = ENGLISH_TENS[words[0]]
  const units = ENGLISH_UNITS[words[1]]
  if (tens === undefined || units === undefined) return null

  return tens + units
}

function collectWordMatches(text: string, locale: Locale): NumberMatch[] {
  const matches: NumberMatch[] = []
  const pattern =
    locale === "zh"
      ? CHINESE_NUMBER_PATTERN
      : locale === "th"
        ? THAI_NUMBER_PATTERN
        : ENGLISH_NUMBER_PATTERN
  const parse =
    locale === "zh"
      ? parseChineseNumber
      : locale === "th"
        ? parseThaiNumber
        : parseEnglishNumber

  for (const match of text.matchAll(pattern)) {
    const value = parse(match[0])
    if (value !== null && isBingoNumber(value)) {
      matches.push({ index: match.index, length: match[0].length, value })
    }
  }

  return matches
}

/**
 * Parses spoken Bingo numbers in transcript order. Arabic digits are accepted
 * in every locale, and repeated values are returned only once.
 */
export function parseBingoNumbers(text: string, locale: Locale): number[] {
  const matches: NumberMatch[] = collectWordMatches(text, locale)

  for (const match of text.matchAll(/\d+/gu)) {
    const value = Number.parseInt(match[0], 10)
    if (isBingoNumber(value)) {
      matches.push({ index: match.index, length: match[0].length, value })
    }
  }

  matches.sort((left, right) => left.index - right.index || right.length - left.length)

  const seen = new Set<number>()
  return matches.flatMap(({ value }) => {
    if (seen.has(value)) return []
    seen.add(value)
    return [value]
  })
}
