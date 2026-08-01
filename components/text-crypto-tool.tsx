"use client"

import { useState } from "react"
import {
  ArrowRightLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  UnlockKeyhole,
} from "lucide-react"

import { GameHeader } from "@/components/game-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLocale } from "@/lib/locale-context"
import type { Locale } from "@/lib/i18n"
import {
  decryptText,
  encryptText,
  TextCryptoError,
  textCryptoFormat,
} from "@/lib/text-crypto"
import { cn } from "@/lib/utils"

type CryptoMode = "encrypt" | "decrypt"

const CRYPTO_COPY: Record<
  Locale,
  {
    back: string
    eyebrow: string
    title: string
    description: string
    encrypt: string
    decrypt: string
    inputLabel: string
    encryptPlaceholder: string
    decryptPlaceholder: string
    password: string
    passwordPlaceholder: string
    showPassword: string
    hidePassword: string
    process: string
    processing: string
    clear: string
    output: string
    outputPlaceholder: string
    copy: string
    copied: string
    useAsInput: string
    localOnly: string
    localOnlyDescription: string
    format: string
    inputRequired: string
    passwordShort: string
    invalidFormat: string
    decryptFailed: string
    unsupported: string
    unknownError: string
  }
> = {
  zh: {
    back: "返回首页",
    eyebrow: "离线隐私工具",
    title: "文本加解密",
    description: "使用密码在本机加密或解密文字，不会上传任何内容。",
    encrypt: "加密",
    decrypt: "解密",
    inputLabel: "待处理文本",
    encryptPlaceholder: "输入需要加密的文字、文案或私密备注…",
    decryptPlaceholder: "粘贴以 XMG1. 开头的加密文本…",
    password: "加密密码",
    passwordPlaceholder: "至少 8 个字符",
    showPassword: "显示密码",
    hidePassword: "隐藏密码",
    process: "开始处理",
    processing: "处理中…",
    clear: "清空",
    output: "处理结果",
    outputPlaceholder: "完成后结果会显示在这里",
    copy: "复制结果",
    copied: "已复制",
    useAsInput: "作为下一步输入",
    localOnly: "仅在本机处理",
    localOnlyDescription: "采用 AES-256-GCM 与 PBKDF2，不保存密码或文本。",
    format: "兼容格式",
    inputRequired: "请先输入需要处理的文本。",
    passwordShort: "密码至少需要 8 个字符。",
    invalidFormat: "无法识别该加密文本，请确认内容完整。",
    decryptFailed: "解密失败，请检查密码或加密文本。",
    unsupported: "当前浏览器不支持本地加密能力。",
    unknownError: "处理失败，请稍后重试。",
  },
  en: {
    back: "Back to home",
    eyebrow: "Offline privacy tool",
    title: "Text encryption",
    description: "Encrypt or decrypt text with a password on this device. Nothing is uploaded.",
    encrypt: "Encrypt",
    decrypt: "Decrypt",
    inputLabel: "Input text",
    encryptPlaceholder: "Enter copy, notes, or private text to encrypt…",
    decryptPlaceholder: "Paste encrypted text beginning with XMG1.…",
    password: "Password",
    passwordPlaceholder: "At least 8 characters",
    showPassword: "Show password",
    hidePassword: "Hide password",
    process: "Process text",
    processing: "Processing…",
    clear: "Clear",
    output: "Result",
    outputPlaceholder: "The result will appear here",
    copy: "Copy result",
    copied: "Copied",
    useAsInput: "Use as next input",
    localOnly: "Processed only on this device",
    localOnlyDescription: "Uses AES-256-GCM and PBKDF2 without storing passwords or text.",
    format: "Compatible format",
    inputRequired: "Enter some text first.",
    passwordShort: "Use a password with at least 8 characters.",
    invalidFormat: "This encrypted text is incomplete or unrecognized.",
    decryptFailed: "Decryption failed. Check the password and encrypted text.",
    unsupported: "This browser does not support local encryption.",
    unknownError: "Processing failed. Please try again.",
  },
  th: {
    back: "กลับหน้าหลัก",
    eyebrow: "เครื่องมือความเป็นส่วนตัวออฟไลน์",
    title: "เข้ารหัสข้อความ",
    description: "เข้ารหัสหรือถอดรหัสข้อความด้วยรหัสผ่านบนอุปกรณ์นี้โดยไม่อัปโหลดข้อมูล",
    encrypt: "เข้ารหัส",
    decrypt: "ถอดรหัส",
    inputLabel: "ข้อความต้นฉบับ",
    encryptPlaceholder: "ใส่ข้อความ โน้ต หรือข้อมูลส่วนตัวที่ต้องการเข้ารหัส…",
    decryptPlaceholder: "วางข้อความเข้ารหัสที่ขึ้นต้นด้วย XMG1.…",
    password: "รหัสผ่าน",
    passwordPlaceholder: "อย่างน้อย 8 ตัวอักษร",
    showPassword: "แสดงรหัสผ่าน",
    hidePassword: "ซ่อนรหัสผ่าน",
    process: "เริ่มประมวลผล",
    processing: "กำลังประมวลผล…",
    clear: "ล้าง",
    output: "ผลลัพธ์",
    outputPlaceholder: "ผลลัพธ์จะแสดงที่นี่",
    copy: "คัดลอกผลลัพธ์",
    copied: "คัดลอกแล้ว",
    useAsInput: "ใช้เป็นข้อมูลขั้นถัดไป",
    localOnly: "ประมวลผลบนอุปกรณ์เท่านั้น",
    localOnlyDescription: "ใช้ AES-256-GCM และ PBKDF2 โดยไม่บันทึกรหัสผ่านหรือข้อความ",
    format: "รูปแบบที่รองรับ",
    inputRequired: "กรุณาใส่ข้อความก่อน",
    passwordShort: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
    invalidFormat: "รูปแบบข้อความเข้ารหัสไม่ถูกต้องหรือข้อมูลไม่ครบ",
    decryptFailed: "ถอดรหัสไม่สำเร็จ โปรดตรวจสอบรหัสผ่านและข้อความ",
    unsupported: "เบราว์เซอร์นี้ไม่รองรับการเข้ารหัสบนอุปกรณ์",
    unknownError: "ประมวลผลไม่สำเร็จ โปรดลองอีกครั้ง",
  },
}

async function writeClipboard(value: string): Promise<void> {
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

export function TextCryptoTool() {
  const { locale } = useLocale()
  const copy = CRYPTO_COPY[locale]
  const [mode, setMode] = useState<CryptoMode>("encrypt")
  const [input, setInput] = useState("")
  const [password, setPassword] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const selectMode = (nextMode: CryptoMode) => {
    setMode(nextMode)
    setOutput("")
    setError("")
    setCopied(false)
  }

  const processText = async () => {
    setError("")
    setCopied(false)

    if (!input.trim()) {
      setError(copy.inputRequired)
      return
    }

    if (password.length < 8) {
      setError(copy.passwordShort)
      return
    }

    setBusy(true)

    try {
      const result =
        mode === "encrypt"
          ? await encryptText(input, password)
          : await decryptText(input, password)
      setOutput(result)
    } catch (caughtError) {
      if (caughtError instanceof TextCryptoError) {
        const messages = {
          INVALID_FORMAT: copy.invalidFormat,
          DECRYPT_FAILED: copy.decryptFailed,
          UNSUPPORTED: copy.unsupported,
        }
        setError(messages[caughtError.code])
      } else {
        setError(copy.unknownError)
      }
      setOutput("")
    } finally {
      setBusy(false)
    }
  }

  const copyOutput = async () => {
    if (!output) return

    try {
      await writeClipboard(output)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError(copy.unknownError)
    }
  }

  const useOutputAsInput = () => {
    if (!output) return
    setInput(output)
    setOutput("")
    setError("")
    setMode(mode === "encrypt" ? "decrypt" : "encrypt")
    setCopied(false)
  }

  const clearAll = () => {
    setInput("")
    setPassword("")
    setOutput("")
    setError("")
    setCopied(false)
  }

  return (
    <div data-page="text-crypto" className="utility-page game-page">
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
          <span className="utility-intro-icon" data-tone="emerald">
            <ShieldCheck aria-hidden="true" />
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
              <dt>{copy.format}</dt>
              <dd>
                {textCryptoFormat.prefix} · {textCryptoFormat.iterations.toLocaleString(locale)} PBKDF2
              </dd>
            </div>
          </dl>
        </section>

        <div className="utility-workspace">
          <section className="utility-panel surface-card" aria-label={copy.inputLabel}>
            <div className="utility-panel-heading">
              <div>
                <span className="utility-step">01</span>
                <h2>{copy.inputLabel}</h2>
              </div>
              <div className="utility-mode-switch" role="group" aria-label={copy.inputLabel}>
                <button
                  type="button"
                  className={cn(mode === "encrypt" && "is-active")}
                  aria-pressed={mode === "encrypt"}
                  onClick={() => selectMode("encrypt")}
                >
                  <LockKeyhole aria-hidden="true" />
                  {copy.encrypt}
                </button>
                <button
                  type="button"
                  className={cn(mode === "decrypt" && "is-active")}
                  aria-pressed={mode === "decrypt"}
                  onClick={() => selectMode("decrypt")}
                >
                  <UnlockKeyhole aria-hidden="true" />
                  {copy.decrypt}
                </button>
              </div>
            </div>

            <textarea
              className="utility-textarea"
              value={input}
              onChange={(event) => {
                setInput(event.target.value)
                setOutput("")
                setError("")
                setCopied(false)
              }}
              placeholder={
                mode === "encrypt"
                  ? copy.encryptPlaceholder
                  : copy.decryptPlaceholder
              }
              spellCheck={mode === "encrypt"}
            />

            <label className="utility-password-field">
              <span>
                <KeyRound aria-hidden="true" />
                {copy.password}
              </span>
              <span className="utility-password-control">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setOutput("")
                    setError("")
                    setCopied(false)
                  }}
                  placeholder={copy.passwordPlaceholder}
                  autoComplete="off"
                  maxLength={1024}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
            </label>

            {error && (
              <p className="utility-error" role="alert">
                {error}
              </p>
            )}

            <div className="utility-actions">
              <Button onClick={processText} disabled={busy}>
                {mode === "encrypt" ? <LockKeyhole /> : <UnlockKeyhole />}
                {busy ? copy.processing : copy.process}
              </Button>
              <Button variant="outline" onClick={clearAll} disabled={busy}>
                <Trash2 />
                {copy.clear}
              </Button>
            </div>
          </section>

          <section className="utility-panel utility-output surface-panel" aria-label={copy.output}>
            <div className="utility-panel-heading">
              <div>
                <span className="utility-step">02</span>
                <h2>{copy.output}</h2>
              </div>
              {output && <span className="utility-result-count">{output.length}</span>}
            </div>

            <div
              className={cn("utility-result", !output && "is-empty")}
              aria-live="polite"
            >
              {output || copy.outputPlaceholder}
            </div>

            <div className="utility-actions">
              <Button onClick={copyOutput} disabled={!output}>
                {copied ? <Check /> : <Copy />}
                {copied ? copy.copied : copy.copy}
              </Button>
              <Button variant="outline" onClick={useOutputAsInput} disabled={!output}>
                <ArrowRightLeft />
                {copy.useAsInput}
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
