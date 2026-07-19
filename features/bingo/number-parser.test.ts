import { describe, expect, it } from "vitest"

import { parseBingoNumbers } from "./number-parser"

const CHINESE_UNITS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"]
const THAI_UNITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"]
const ENGLISH_UNITS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]
const ENGLISH_TEENS = [
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
]
const ENGLISH_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy"]

function toChinese(value: number): string {
  if (value < 10) return CHINESE_UNITS[value]
  const tens = Math.floor(value / 10)
  const units = value % 10
  return `${tens === 1 ? "" : CHINESE_UNITS[tens]}十${CHINESE_UNITS[units]}`
}

function toThai(value: number): string {
  if (value < 10) return THAI_UNITS[value]
  const tens = Math.floor(value / 10)
  const units = value % 10
  const tensWord = tens === 1 ? "" : tens === 2 ? "ยี่" : THAI_UNITS[tens]
  const unitsWord = units === 1 ? "เอ็ด" : THAI_UNITS[units]
  return `${tensWord}สิบ${unitsWord}`
}

function toEnglish(value: number): string {
  if (value < 10) return ENGLISH_UNITS[value]
  if (value < 20) return ENGLISH_TEENS[value - 10]
  const tens = Math.floor(value / 10)
  const units = value % 10
  return `${ENGLISH_TENS[tens]}${units === 0 ? "" : ` ${ENGLISH_UNITS[units]}`}`
}

describe("parseBingoNumbers", () => {
  it("parses Chinese simple and compound words", () => {
    expect(parseBingoNumbers("二十五、十五、二十、两", "zh")).toEqual([25, 15, 20, 2])
  })

  it("parses Thai compound words", () => {
    expect(parseBingoNumbers("ยี่สิบห้า, ยี่สิบเอ็ด", "th")).toEqual([25, 21])
  })

  it("parses English compounds, Arabic digits, and removes duplicates", () => {
    expect(parseBingoNumbers("twenty five, 25, twenty-five", "en")).toEqual([25])
    expect(parseBingoNumbers("twenty five, then 30, then five", "en")).toEqual([25, 30, 5])
  })

  it("accepts every Bingo number as Chinese, Thai, and English words", () => {
    const expected = Array.from({ length: 75 }, (_, index) => index + 1)

    expect(parseBingoNumbers(expected.map(toChinese).join("，"), "zh")).toEqual(expected)
    expect(parseBingoNumbers(expected.map(toThai).join(","), "th")).toEqual(expected)
    expect(parseBingoNumbers(expected.map(toEnglish).join(","), "en")).toEqual(expected)
  })

  it("keeps only Arabic digits in the Bingo range", () => {
    expect(parseBingoNumbers("0, 1, 25, 75, 76, 25", "en")).toEqual([1, 25, 75])
  })
})
