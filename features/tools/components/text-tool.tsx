"use client"

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
import { cn } from "@/lib/utils"

import { useTextTool } from "../hooks/use-text-tool"
import { useTheme } from "@/features/themes/shared/theme-provider"
import { ArcadeTextTool } from "@/features/themes/theme-arcade/text-tool"

export function TextTool() {
  const controller = useTextTool()
  const { theme } = useTheme()
  const { locale, copy, input, setInput, output, outputStats, error, status, copied, stats, invalidateResult, processText, copyOutput, useOutputAsInput, clearAll } = controller

  if (theme === "theme-arcade") return <ArcadeTextTool controller={controller} />

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
          <section data-t3-glass="panel" className="offline-tool-editor utility-panel surface-card">
            <div className="utility-panel-heading">
              <div>
                <span className="utility-step">01</span>
                <h2 id="text-tool-input-label">{copy.common.input}</h2>
              </div>
              <span className="utility-result-count">{copy.text.analyzed}</span>
            </div>
            <textarea
              className="utility-textarea offline-tool-text-input"
              aria-labelledby="text-tool-input-label"
              value={input}
              onChange={(event) => {
                setInput(event.target.value)
                invalidateResult()
              }}
              placeholder={copy.text.inputPlaceholder}
              spellCheck
            />
          </section>

          <section data-t3-glass="panel" className="offline-tool-command utility-panel surface-card">
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

          <section data-t3-glass="panel" className="offline-tool-output utility-panel surface-panel">
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
