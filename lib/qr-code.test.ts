import { describe, expect, it } from "vitest"

import {
  createQrFileName,
  isQrErrorLevel,
  isQrExportSize,
} from "./qr-code"

describe("QR code helpers", () => {
  it("creates stable timestamped PNG names", () => {
    expect(createQrFileName(new Date(2026, 7, 2, 3, 4, 5))).toBe(
      "xm-games-qr-20260802-030405.png",
    )
  })

  it("accepts only supported export sizes and correction levels", () => {
    expect(isQrExportSize(512)).toBe(true)
    expect(isQrExportSize(300)).toBe(false)
    expect(isQrErrorLevel("H")).toBe(true)
    expect(isQrErrorLevel("X")).toBe(false)
  })
})
