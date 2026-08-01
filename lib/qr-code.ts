export const qrExportSizes = [256, 512, 1024] as const
export const qrErrorLevels = ["L", "M", "Q", "H"] as const

export type QrExportSize = (typeof qrExportSizes)[number]
export type QrErrorLevel = (typeof qrErrorLevels)[number]

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

export function createQrFileName(date = new Date()): string {
  return [
    "xm-games-qr-",
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    ".png",
  ].join("")
}

export function isQrExportSize(value: number): value is QrExportSize {
  return qrExportSizes.includes(value as QrExportSize)
}

export function isQrErrorLevel(value: string): value is QrErrorLevel {
  return qrErrorLevels.includes(value as QrErrorLevel)
}
