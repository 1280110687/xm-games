"use client"

import { useMemo, useState } from "react"
import {
  AlignJustify,
  ArrowRightLeft,
  Check,
  Copy,
  ListFilter,
  Rows3,
  Sparkles,
  TextCursorInput,
  Trash2,
} from "lucide-react"

import { GameHeader } from "@/components/game-header"
import { Button } from "@/components/ui/button"
import { copyTextToClipboard } from "@/lib/client-clipboard"
import { useLocale } from "@/lib/locale-context"
import { OFFLINE_TOOL_COPY } from "@/lib/offline-tool-copy"
import {
  cleanText,
  collapseBlankLines,
  deduplicateLines,
  getTextStats,
  trimLineWhitespace,
} from "@/lib/offline-tools"
import { cn } from "@/lib/utils"

type TextAction = "trim" | "collapse" | "deduplicate" | "clean"

export function TextTool() {
  const { locale } = useLocale()
  const copy = OFFLINE_TOOL_COPY[locale]
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const [copied, setCopied] = useState(false)
  const inputStats = useMemo(() => getTextStats(input), [input])
  const outputStats = useMemo(() => getTextStats(output), [output])

  const invalidateResult = () => {
    setOutput("")
    setError("")
    setStatus("")
    setCopied(false)
  }

  const processText = (action: TextAction) => {
    if (!input) {
      setError(copy.common.inputRequired)
      setStatus("")
      return
    }

    const handlers = {
      trim: trimLineWhitespace,
      collapse: collapseBlankLines,
      deduplicate: deduplicateLines,
      clean: cleanText,
    } satisfies Record<TextAction, (value: string) => string>

    setOutput(handlers[action](input))
    setError("")
    setStatus(copy.text.cleaned)
    setCopied(false)
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

  const stats = [
    [copy.text.characters, inputStats.characterCount],
    [copy.text.nonWhitespace, inputStats.nonWhitespaceCharacterCount],
    [copy.text.words, inputStats.wordCount],
    [copy.text.lines, inputStats.lineCount],
  ] as const

  return (
    <div data-page="text-tool" className="utility-page offline-data-page game-page">
      <GameHeader
        layout="tool"
        homeIcon="back"
        homeLabelMode="sr-only"
        homeLabel={copy.common.back}
        title={copy.text.title}
        description={copy.text.description}
      />

      <main className="utility-main game-content">
        <section className="utility-intro surface-panel">
          <span className="utility-intro-icon" data-tone="rose">
            <TextCursorInput aria-hidden="true" />
          </span>
          <div>
            <p className="utility-eyebrow">{copy.text.eyebrow}</p>
            <h1>{copy.text.title}</h1>
            <p>{copy.text.description}</p>
          </div>
          <dl className="utility-facts">
            <div>
              <dt>{copy.common.localOnly}</dt>
              <dd>{copy.common.localDescription}</dd>
            </div>
            <div>
              <dt>{copy.text.rules}</dt>
              <dd>{copy.text.rulesDescription}</dd>
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
              <span className="utility-result-count">{copy.text.analyzed}</span>
            </div>
            <textarea
              className="utility-textarea offline-tool-text-input"
              value={input}
              onChange={(event) => {
                setInput(event.target.value)
                invalidateResult()
              }}
              placeholder={copy.text.inputPlaceholder}
              spellCheck
            />
          </section>

          <section className="offline-tool-command utility-panel surface-card">
            <div className="utility-panel-heading">
              <div>
                <span className="utility-step">02</span>
                <h2>{copy.common.actions}</h2>
              </div>
              <ListFilter aria-hidden="true" />
            </div>
            <dl className="offline-tool-stats">
              {stats.map(([label, value]) => (
                <div className="offline-tool-stat" key={label}>
                  <dt>{label}</dt>
                  <dd>{value.toLocaleString(locale)}</dd>
                </div>
              ))}
            </dl>
            <div className="offline-tool-command-grid">
              <Button variant="outline" onClick={() => processText("trim")}>
                <AlignJustify />
                {copy.text.trimLines}
              </Button>
              <Button variant="outline" onClick={() => processText("collapse")}>
                <Rows3 />
                {copy.text.collapseBlankLines}
              </Button>
              <Button variant="outline" onClick={() => processText("deduplicate")}>
                <ListFilter />
                {copy.text.deduplicateLines}
              </Button>
              <Button onClick={() => processText("clean")}>
                <Sparkles />
                {copy.text.cleanAll}
              </Button>
              <Button className="offline-tool-clear" variant="ghost" onClick={clearAll}>
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
              {output && (
                <span className="utility-result-count">
                  {outputStats.characterCount.toLocaleString(locale)}
                </span>
              )}
            </div>
            <div
              className={cn("utility-result offline-tool-text-result", !output && "is-empty")}
              aria-live="polite"
              tabIndex={output ? 0 : undefined}
            >
              {output || copy.text.outputPlaceholder}
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
