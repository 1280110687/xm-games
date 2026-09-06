"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import {
  Check,
  Clipboard,
  Copy,
  Download,
  FileText,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import QRCode from "qrcode"

import { GameHeader } from "@/components/game-header"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale-context"
import type { Locale } from "@/lib/i18n"
import {
  createQrFileName,
  isQrErrorLevel,
  isQrExportSize,
  qrErrorLevels,
  qrExportSizes,
  type QrErrorLevel,
  type QrExportSize,
} from "@/lib/qr-code"
import { cn } from "@/lib/utils"

type QrStatus =
  | "idle"
  | "ready"
  | "copied"
  | "copiedText"
  | "contentCopied"
  | "downloaded"

const QR_COPY: Record<
  Locale,
  {
    back: string
    eyebrow: string
    title: string
    description: string
    input: string
    inputPlaceholder: string
    characterCount: string
    preview: string
    previewPlaceholder: string
    options: string
    size: string
    correction: string
    correctionLabels: Record<QrErrorLevel, string>
    generate: string
    generating: string
    copyImage: string
    copyText: string
    download: string
    generated: string
    copied: string
    copiedText: string
    contentCopied: string
    downloaded: string
    emptyError: string
    tooLongError: string
    generateError: string
    localOnly: string
    localOnlyDescription: string
    encodingNote: string
  }
> = {
  zh: {
    back: "返回首页",
    eyebrow: "离线视觉工具",
    title: "文字二维码",
    description: "把文字、文案、链接或联系方式生成为可下载的二维码。",
    input: "二维码内容",
    inputPlaceholder: "输入文字、活动文案、网址或联系方式…",
    characterCount: "字符",
    preview: "二维码预览",
    previewPlaceholder: "输入内容并点击生成",
    options: "导出设置",
    size: "图片尺寸",
    correction: "容错级别",
    correctionLabels: { L: "低", M: "中", Q: "较高", H: "高" },
    generate: "生成二维码",
    generating: "生成中…",
    copyImage: "复制图片",
    copyText: "复制内容",
    download: "下载 PNG",
    generated: "二维码已生成",
    copied: "二维码图片已复制",
    copiedText: "当前设备不支持复制图片，已复制原始内容",
    contentCopied: "原始内容已复制",
    downloaded: "PNG 已下载",
    emptyError: "请先输入需要生成二维码的内容。",
    tooLongError: "内容超过当前容错级别的二维码容量，请缩短内容。",
    generateError: "二维码生成失败，请检查内容后重试。",
    localOnly: "本地生成",
    localOnlyDescription: "内容不会发送到服务器，断网时仍可生成。",
    encodingNote: "二维码只是编码，不等于加密；敏感内容请先使用文本加密工具。",
  },
  en: {
    back: "Back to home",
    eyebrow: "Offline visual tool",
    title: "Text QR code",
    description: "Turn text, copy, links, or contact details into a downloadable QR code.",
    input: "QR content",
    inputPlaceholder: "Enter text, campaign copy, a URL, or contact details…",
    characterCount: "characters",
    preview: "QR preview",
    previewPlaceholder: "Enter content and generate a code",
    options: "Export settings",
    size: "Image size",
    correction: "Error correction",
    correctionLabels: { L: "Low", M: "Medium", Q: "Quartile", H: "High" },
    generate: "Generate QR code",
    generating: "Generating…",
    copyImage: "Copy image",
    copyText: "Copy content",
    download: "Download PNG",
    generated: "QR code generated",
    copied: "QR image copied",
    copiedText: "Image copy is unavailable, so the original content was copied",
    contentCopied: "Original content copied",
    downloaded: "PNG downloaded",
    emptyError: "Enter some content first.",
    tooLongError: "The content exceeds this QR capacity. Shorten it and try again.",
    generateError: "Could not generate the QR code. Check the content and retry.",
    localOnly: "Generated locally",
    localOnlyDescription: "Content never leaves this device and can be generated offline.",
    encodingNote: "A QR code encodes data; it does not encrypt it. Encrypt sensitive text first.",
  },
  th: {
    back: "กลับหน้าหลัก",
    eyebrow: "เครื่องมือภาพออฟไลน์",
    title: "คิวอาร์โค้ดจากข้อความ",
    description: "สร้างคิวอาร์โค้ดดาวน์โหลดได้จากข้อความ ลิงก์ หรือข้อมูลติดต่อ",
    input: "เนื้อหาคิวอาร์",
    inputPlaceholder: "ใส่ข้อความ ลิงก์ หรือข้อมูลติดต่อ…",
    characterCount: "ตัวอักษร",
    preview: "ตัวอย่างคิวอาร์โค้ด",
    previewPlaceholder: "ใส่เนื้อหาแล้วกดสร้าง",
    options: "ตั้งค่าการส่งออก",
    size: "ขนาดภาพ",
    correction: "ระดับแก้ไขข้อผิดพลาด",
    correctionLabels: { L: "ต่ำ", M: "กลาง", Q: "ค่อนข้างสูง", H: "สูง" },
    generate: "สร้างคิวอาร์โค้ด",
    generating: "กำลังสร้าง…",
    copyImage: "คัดลอกรูปภาพ",
    copyText: "คัดลอกเนื้อหา",
    download: "ดาวน์โหลด PNG",
    generated: "สร้างคิวอาร์โค้ดแล้ว",
    copied: "คัดลอกรูปคิวอาร์แล้ว",
    copiedText: "อุปกรณ์นี้คัดลอกรูปไม่ได้ จึงคัดลอกเนื้อหาต้นฉบับแทน",
    contentCopied: "คัดลอกเนื้อหาต้นฉบับแล้ว",
    downloaded: "ดาวน์โหลด PNG แล้ว",
    emptyError: "กรุณาใส่เนื้อหาก่อน",
    tooLongError: "เนื้อหายาวเกินความจุของคิวอาร์โค้ด โปรดย่อเนื้อหา",
    generateError: "สร้างคิวอาร์โค้ดไม่สำเร็จ โปรดลองอีกครั้ง",
    localOnly: "สร้างบนอุปกรณ์",
    localOnlyDescription: "เนื้อหาจะไม่ถูกส่งไปยังเซิร์ฟเวอร์และใช้งานแบบออฟไลน์ได้",
    encodingNote: "คิวอาร์โค้ดเป็นการเข้ารหัสข้อมูลเพื่ออ่าน ไม่ใช่การเข้ารหัสลับ",
  },
}

async function writeText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.append(textarea)
  textarea.select()
  const copied = document.execCommand("copy")
  textarea.remove()

  if (!copied) throw new Error("COPY_FAILED")
}

export function QrCodeTool() {
  const { locale } = useLocale()
  const copy = QR_COPY[locale]
  const requestIdRef = useRef(0)
  const [input, setInput] = useState("")
  const [size, setSize] = useState<QrExportSize>(512)
  const [level, setLevel] = useState<QrErrorLevel>("M")
  const [dataUrl, setDataUrl] = useState("")
  const [encodedText, setEncodedText] = useState("")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<QrStatus>("idle")
  const [error, setError] = useState("")

  const invalidatePreview = () => {
    requestIdRef.current += 1
    setDataUrl("")
    setEncodedText("")
    setStatus("idle")
    setError("")
    setBusy(false)
  }

  const generate = async () => {
    if (!input.trim()) {
      setError(copy.emptyError)
      return
    }

    const requestId = ++requestIdRef.current
    setBusy(true)
    setError("")
    setStatus("idle")

    try {
      const result = await QRCode.toDataURL(input, {
        type: "image/png",
        width: size,
        margin: 4,
        errorCorrectionLevel: level,
        color: {
          dark: "#111827ff",
          light: "#ffffffff",
        },
      })

      if (requestId !== requestIdRef.current) return
      setDataUrl(result)
      setEncodedText(input)
      setStatus("ready")
    } catch (caughtError) {
      if (requestId !== requestIdRef.current) return
      const message = caughtError instanceof Error ? caughtError.message : ""
      setError(/overflow|too long|amount of data/iu.test(message) ? copy.tooLongError : copy.generateError)
      setDataUrl("")
      setEncodedText("")
    } finally {
      if (requestId === requestIdRef.current) setBusy(false)
    }
  }

  const copyImage = async () => {
    if (!dataUrl) return

    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        const blob = await fetch(dataUrl).then((response) => response.blob())
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
        setStatus("copied")
      } else {
        await writeText(encodedText)
        setStatus("copiedText")
      }
    } catch {
      try {
        await writeText(encodedText)
        setStatus("copiedText")
      } catch {
        setError(copy.generateError)
      }
    }
  }

  const copyContent = async () => {
    if (!input) return

    try {
      await writeText(input)
      setStatus("contentCopied")
    } catch {
      setError(copy.generateError)
    }
  }

  const download = () => {
    if (!dataUrl) return
    const anchor = document.createElement("a")
    anchor.href = dataUrl
    anchor.download = createQrFileName()
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setStatus("downloaded")
  }

  const statusText = {
    idle: "",
    ready: copy.generated,
    copied: copy.copied,
    copiedText: copy.copiedText,
    contentCopied: copy.contentCopied,
    downloaded: copy.downloaded,
  }[status]

  return (
    <div data-page="qr-code" className="utility-page qr-page game-page">
      <GameHeader
        layout="tool"
        homeIcon="back"
        homeLabelMode="sr-only"
        homeLabel={copy.back}
        title={copy.title}
        description={copy.description}
      />

      <main className="utility-main game-content">
        <section className="utility-intro surface-panel">
          <span className="utility-intro-icon" data-tone="cyan">
            <QrCode aria-hidden="true" />
          </span>
          <div>
            <p className="utility-eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>
          <dl className="utility-facts">
            <div>
              <dt>{copy.localOnly}</dt>
              <dd>{copy.localOnlyDescription}</dd>
            </div>
            <div>
              <dt>{copy.options}</dt>
              <dd>PNG · {size}px · {level}</dd>
            </div>
          </dl>
        </section>

        <div className="qr-workspace utility-workspace">
          <section className="qr-editor utility-panel surface-card">
            <div className="utility-panel-heading">
              <div>
                <span className="utility-step">01</span>
                <h2>{copy.input}</h2>
              </div>
              <span className="utility-result-count">
                {input.length} {copy.characterCount}
              </span>
            </div>

            <textarea
              className="utility-textarea"
              value={input}
              onChange={(event) => {
                setInput(event.target.value)
                invalidatePreview()
              }}
              placeholder={copy.inputPlaceholder}
              spellCheck
            />

            <p className="utility-note">
              <ShieldCheck aria-hidden="true" />
              {copy.encodingNote}
            </p>

            {error && (
              <p className="utility-error" role="alert">
                {error}
              </p>
            )}

            <Button onClick={generate} disabled={busy}>
              <Sparkles />
              {busy ? copy.generating : copy.generate}
            </Button>
          </section>

          <section className="qr-preview utility-panel surface-panel" aria-label={copy.preview}>
            <div className="utility-panel-heading">
              <div>
                <span className="utility-step">02</span>
                <h2>{copy.preview}</h2>
              </div>
              <ScanLine aria-hidden="true" />
            </div>

            <div className={cn("qr-preview-frame", !dataUrl && "is-empty")}>
              {dataUrl ? (
                <Image
                  src={dataUrl}
                  width={512}
                  height={512}
                  unoptimized
                  alt={copy.preview}
                />
              ) : (
                <span>
                  <QrCode aria-hidden="true" />
                  {copy.previewPlaceholder}
                </span>
              )}
            </div>

            <p className="utility-status" aria-live="polite">
              {statusText}
            </p>
          </section>

          <section className="qr-options utility-panel surface-card">
            <div className="utility-panel-heading">
              <div>
                <span className="utility-step">03</span>
                <h2>{copy.options}</h2>
              </div>
              <FileText aria-hidden="true" />
            </div>

            <label className="utility-select-field">
              <span>{copy.size}</span>
              <select
                value={size}
                onChange={(event) => {
                  const nextSize = Number(event.target.value)
                  if (isQrExportSize(nextSize)) {
                    setSize(nextSize)
                    invalidatePreview()
                  }
                }}
              >
                {qrExportSizes.map((option) => (
                  <option key={option} value={option}>
                    {option} × {option} px
                  </option>
                ))}
              </select>
            </label>

            <label className="utility-select-field">
              <span>{copy.correction}</span>
              <select
                value={level}
                onChange={(event) => {
                  if (isQrErrorLevel(event.target.value)) {
                    setLevel(event.target.value)
                    invalidatePreview()
                  }
                }}
              >
                {qrErrorLevels.map((option) => (
                  <option key={option} value={option}>
                    {option} · {copy.correctionLabels[option]}
                  </option>
                ))}
              </select>
            </label>

            <div className="utility-actions utility-actions--stacked">
              <Button onClick={copyImage} disabled={!dataUrl}>
                {status === "copied" ? <Check /> : <Clipboard />}
                {copy.copyImage}
              </Button>
              <Button variant="outline" onClick={download} disabled={!dataUrl}>
                <Download />
                {copy.download}
              </Button>
              <Button variant="ghost" onClick={copyContent} disabled={!input}>
                <Copy />
                {copy.copyText}
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
