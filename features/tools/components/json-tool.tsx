"use client"

import { useState } from "react"
import {
  ArrowRightLeft,
  Braces,
  Check,
  ClipboardCheck,
  Copy,
  Minimize2,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react"

import { GameHeader } from "@/components/game-header"
import { Button } from "@/components/ui/button"
import { copyTextToClipboard } from "@/lib/client-clipboard"
import type { Locale } from "@/lib/i18n"
import { useLocale } from "@/lib/locale-context"
import { OFFLINE_TOOL_COPY } from "@/lib/offline-tool-copy"
import {
  formatJson,
  minifyJson,
  OfflineToolError,
  validateJson,
} from "@/lib/offline-tools"
import { cn } from "@/lib/utils"

type JsonAction = "format" | "minify" | "validate"

function localizedJsonError(
  locale: Locale,
  line: number | null,
  column: number | null,
  fallback: string,
): string {
  if (line === null || column === null) return fallback

  if (locale === "en") return `${fallback}: line ${line}, column ${column}.`
  if (locale === "th") return `${fallback}: บรรทัด ${line}, คอลัมน์ ${column}`
  return `${fallback}：第 ${line} 行，第 ${column} 列。`
}

export function JsonTool() {
  const { locale } = useLocale()
  const copy = OFFLINE_TOOL_COPY[locale]
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

  const processJson = (action: JsonAction) => {
    if (!input.trim()) {
      setError(copy.common.inputRequired)
      setStatus("")
      return
    }

    try {
      if (action === "validate") {
        const result = validateJson(input)

        if (!result.valid) {
          setOutput("")
          setStatus("")
          setError(
            localizedJsonError(
              locale,
              result.error.line,
              result.error.column,
              copy.json.syntaxError,
            ),
          )
          return
        }

        setOutput("")
        setError("")
        setStatus(copy.json.valid)
        return
      }

      setOutput(action === "format" ? formatJson(input) : minifyJson(input))
      setError("")
      setStatus(action === "format" ? copy.json.formatted : copy.json.minified)
      setCopied(false)
    } catch (caught) {
      const toolError = caught instanceof OfflineToolError ? caught : null
      setOutput("")
      setStatus("")
      setError(
        localizedJsonError(
          locale,
          toolError?.line ?? null,
          toolError?.column ?? null,
          copy.json.syntaxError,
        ),
      )
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
    invalidateResult()
  }

  const clearAll = () => {
    setInput("")
    invalidateResult()
  }

  return (
    <div data-page="json-tool" className="utility-page offline-data-page game-page">
      <GameHeader
        layout="tool"
        homeIcon="back"
        homeLabelMode="sr-only"
        homeLabel={copy.common.back}
        title={copy.json.title}
        description={copy.json.description}
      />

      <main className="utility-main game-content">
        <section className="utility-intro surface-panel">
          <span className="utility-intro-icon" data-tone="emerald">
            <Braces aria-hidden="true" />
          </span>
          <div>
            <p className="utility-eyebrow">{copy.json.eyebrow}</p>
            <h1>{copy.json.title}</h1>
            <p>{copy.json.description}</p>
          </div>
          <dl className="utility-facts">
            <div>
              <dt>{copy.common.localOnly}</dt>
              <dd>{copy.common.localDescription}</dd>
            </div>
            <div>
              <dt>{copy.json.structure}</dt>
              <dd>{copy.json.structureDescription}</dd>
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
              placeholder={copy.json.inputPlaceholder}
              spellCheck={false}
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
              <ClipboardCheck aria-hidden="true" />
            </div>
            <div className="offline-tool-command-grid">
              <Button onClick={() => processJson("format")}>
                <Sparkles />
                {copy.json.format}
              </Button>
              <Button variant="outline" onClick={() => processJson("minify")}>
                <Minimize2 />
                {copy.json.minify}
              </Button>
              <Button variant="outline" onClick={() => processJson("validate")}>
                <ShieldCheck />
                {copy.json.validate}
              </Button>
              <Button variant="ghost" onClick={clearAll}>
                <Trash2 />
                {copy.common.clear}
              </Button>
            </div>
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
              {output || copy.json.outputPlaceholder}
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
