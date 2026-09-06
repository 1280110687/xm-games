"use client"

import { useState } from "react"
import {
  ArrowDownUp,
  ArrowRightLeft,
  Binary,
  Check,
  Copy,
  ShieldCheck,
  Trash2,
} from "lucide-react"

import { GameHeader } from "@/components/game-header"
import { Button } from "@/components/ui/button"
import { copyTextToClipboard } from "@/lib/client-clipboard"
import { useLocale } from "@/lib/locale-context"
import { OFFLINE_TOOL_COPY } from "@/lib/offline-tool-copy"
import {
  decodeBase64Utf8,
  encodeBase64Utf8,
} from "@/lib/offline-tools"
import { cn } from "@/lib/utils"

type Base64Mode = "encode" | "decode"

export function Base64Tool() {
  const { locale } = useLocale()
  const copy = OFFLINE_TOOL_COPY[locale]
  const [mode, setMode] = useState<Base64Mode>("encode")
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const [copied, setCopied] = useState(false)

  const invalidateResult = () => {
    setOutput("")
    setError("")
    setStatus("")
    setCopied(false)
  }

  const selectMode = (nextMode: Base64Mode) => {
    setMode(nextMode)
    invalidateResult()
  }

  const processInput = () => {
    if (!input) {
      setError(copy.common.inputRequired)
      setStatus("")
      return
    }

    try {
      setOutput(mode === "encode" ? encodeBase64Utf8(input) : decodeBase64Utf8(input.trim()))
      setError("")
      setStatus(mode === "encode" ? copy.base64.encoded : copy.base64.decoded)
      setCopied(false)
    } catch {
      setOutput("")
      setStatus("")
      setError(copy.base64.invalid)
    }
  }

  const copyOutput = async () => {
    if (!output) return

    try {
      await copyTextToClipboard(output)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError(copy.common.copyFailed)
    }
  }

  const useOutputAsInput = () => {
    if (!output) return
    setInput(output)
    setMode(mode === "encode" ? "decode" : "encode")
    invalidateResult()
  }

  const clearAll = () => {
    setInput("")
    invalidateResult()
  }

  return (
    <div data-page="base64-tool" className="utility-page offline-data-page game-page">
      <GameHeader
        layout="tool"
        homeIcon="back"
        homeLabelMode="sr-only"
        homeLabel={copy.common.back}
        title={copy.base64.title}
        description={copy.base64.description}
      />

      <main className="utility-main game-content">
        <section className="utility-intro surface-panel">
          <span className="utility-intro-icon" data-tone="cyan">
            <Binary aria-hidden="true" />
          </span>
          <div>
            <p className="utility-eyebrow">{copy.base64.eyebrow}</p>
            <h1>{copy.base64.title}</h1>
            <p>{copy.base64.description}</p>
          </div>
          <dl className="utility-facts">
            <div>
              <dt>{copy.common.localOnly}</dt>
              <dd>{copy.common.localDescription}</dd>
            </div>
            <div>
              <dt>{copy.base64.utf8}</dt>
              <dd>{copy.base64.utf8Description}</dd>
            </div>
          </dl>
        </section>

        <div className="offline-tool-workspace utility-workspace">
          <section className="offline-tool-editor utility-panel surface-card">
            <div className="utility-panel-heading">
              <div>
                <span className="utility-step">01</span>
                <h2>{copy.common.input}</h2>
              </div>
              <span className="utility-result-count">{input.length}</span>
            </div>
            <textarea
              className="utility-textarea offline-tool-code-input"
              value={input}
              onChange={(event) => {
                setInput(event.target.value)
                invalidateResult()
              }}
              placeholder={
                mode === "encode"
                  ? copy.base64.inputPlaceholder
                  : copy.base64.encodedPlaceholder
              }
              spellCheck={mode === "encode"}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </section>

          <section className="offline-tool-command utility-panel surface-card">
            <div className="utility-panel-heading">
              <div>
                <span className="utility-step">02</span>
                <h2>{copy.common.actions}</h2>
              </div>
              <ArrowDownUp aria-hidden="true" />
            </div>
            <div className="utility-mode-switch offline-tool-mode-switch" role="group" aria-label={copy.common.actions}>
              <button
                type="button"
                className={cn(mode === "encode" && "is-active")}
                aria-pressed={mode === "encode"}
                onClick={() => selectMode("encode")}
              >
                {copy.base64.encode}
              </button>
              <button
                type="button"
                className={cn(mode === "decode" && "is-active")}
                aria-pressed={mode === "decode"}
                onClick={() => selectMode("decode")}
              >
                {copy.base64.decode}
              </button>
            </div>
            <div className="offline-tool-command-grid">
              <Button onClick={processInput}>
                <Binary />
                {mode === "encode" ? copy.base64.encode : copy.base64.decode}
              </Button>
              <Button variant="ghost" onClick={clearAll}>
                <Trash2 />
                {copy.common.clear}
              </Button>
            </div>
            <p className="utility-note">
              <ShieldCheck aria-hidden="true" />
              {copy.base64.utf8Description}
            </p>
            {error && (
              <p className="utility-error" role="alert">
                {error}
              </p>
            )}
            <p className="offline-tool-status utility-status" aria-live="polite">
              {status}
            </p>
          </section>

          <section className="offline-tool-output utility-panel surface-panel">
            <div className="utility-panel-heading">
              <div>
                <span className="utility-step">03</span>
                <h2>{copy.common.output}</h2>
              </div>
              {output && <span className="utility-result-count">{output.length}</span>}
            </div>
            <div
              className={cn("utility-result offline-tool-code-result", !output && "is-empty")}
              aria-live="polite"
              tabIndex={output ? 0 : undefined}
            >
              {output || copy.base64.decodedPlaceholder}
            </div>
            <div className="utility-actions">
              <Button onClick={copyOutput} disabled={!output}>
                {copied ? <Check /> : <Copy />}
                {copied ? copy.common.copied : copy.common.copy}
              </Button>
              <Button variant="outline" onClick={useOutputAsInput} disabled={!output}>
                <ArrowRightLeft />
                {copy.common.useAsInput}
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
