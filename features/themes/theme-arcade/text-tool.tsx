"use client"

import { useRef, useState } from "react"
import { AlignJustify, ArrowRightLeft, Check, Copy, ListFilter, Rows3, Sparkles, Trash2 } from "lucide-react"
import type { TextToolController } from "@/features/tools/hooks/use-text-tool"
import { ArcadeHeader } from "./header"
import { ARCADE_COPY } from "./copy"

export function ArcadeTextTool({ controller }: { controller: TextToolController }) {
  const { locale, copy, input, setInput, output, error, status, copied, stats, invalidateResult, processText, copyOutput, useOutputAsInput: reuseOutput, clearAll } = controller
  const arcade = ARCADE_COPY[locale]
  const [tab, setTab] = useState<"input" | "result">("input")
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  return <div className="arcade-page arcade-text-tool" data-page="text-tool">
    <ArcadeHeader tool />
    <main className="arcade-main">
      <p className="arcade-privacy">{arcade.privacy}</p>
      <div className="arcade-tabs" role="tablist" aria-label={arcade.text}>
        {(["input", "result"] as const).map((key, index) => <button key={key} type="button" role="tab"
          ref={node => { tabRefs.current[index] = node }} id={`arcade-${key}-tab`}
          aria-selected={tab === key} aria-controls={`arcade-${key}-panel`} tabIndex={tab === key ? 0 : -1}
          onClick={() => setTab(key)} onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
            event.preventDefault()
            const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index
            setTab(next === 0 ? "input" : "result"); tabRefs.current[next]?.focus()
          }}>{arcade[key]}</button>)}
      </div>
      <div id="arcade-input-panel" role="tabpanel" aria-labelledby="arcade-input-tab" hidden={tab !== "input"}>
        <textarea className="arcade-editor" aria-label={copy.common.input} value={input}
          onChange={event => { setInput(event.target.value); invalidateResult() }} placeholder={copy.text.inputPlaceholder} spellCheck />
      </div>
      <div id="arcade-result-panel" role="tabpanel" aria-labelledby="arcade-result-tab" hidden={tab !== "result"}>
        <pre className="arcade-editor arcade-result-editor" tabIndex={0}>{output || copy.text.outputPlaceholder}</pre>
      </div>
      <dl className="arcade-stats">
        {[stats[0], stats[2], stats[3]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value.toLocaleString(locale)}</dd></div>)}
      </dl>
      <p className="arcade-non-whitespace">{stats[1][0]} <strong>{stats[1][1].toLocaleString(locale)}</strong></p>
      <div className="arcade-command-grid">
        {([["trim", AlignJustify, copy.text.trimLines], ["collapse", Rows3, copy.text.collapseBlankLines], ["deduplicate", ListFilter, copy.text.deduplicateLines]] as const).map(([action, Icon, label]) =>
          <button type="button" key={action} onClick={() => processText(action)}><Icon aria-hidden="true" />{label}</button>)}
      </div>
      <button type="button" className="arcade-clean" onClick={() => processText("clean")}><Sparkles aria-hidden="true" />{copy.text.cleanAll}</button>
      {error && <p className="arcade-error" role="alert">{error}</p>}
      <p className="arcade-status" role="status">{status}</p>
      <section className="arcade-output" aria-labelledby="arcade-output-title">
        <h2 id="arcade-output-title">{arcade.output}</h2>
        <pre tabIndex={0} aria-live="polite">{output || copy.text.outputPlaceholder}</pre>
        <div className="arcade-output-actions">
          <button type="button" className="arcade-copy" onClick={copyOutput} disabled={!output}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? copy.common.copied : copy.common.copy}</button>
          <button type="button" onClick={() => { clearAll(); setTab("input") }}><Trash2 aria-hidden="true" />{copy.common.clear}</button>
        </div>
        <button type="button" className="arcade-reuse" onClick={() => { reuseOutput(); setTab("input") }} disabled={!output}><ArrowRightLeft aria-hidden="true" />{copy.common.useAsInput}</button>
      </section>
    </main>
  </div>
}
