"use client"

import { useMemo, useState } from "react"
import { copyTextToClipboard } from "@/lib/client-clipboard"
import { useLocale } from "@/lib/locale-context"
import { OFFLINE_TOOL_COPY } from "@/lib/offline-tool-copy"
import { cleanText, collapseBlankLines, deduplicateLines, getTextStats, trimLineWhitespace } from "@/lib/offline-tools"

export type TextAction = "trim" | "collapse" | "deduplicate" | "clean"

export function useTextTool() {
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

  return { locale, copy, input, setInput, output, outputStats, error, status, copied, stats, invalidateResult, processText, copyOutput, useOutputAsInput, clearAll }
}

export type TextToolController = ReturnType<typeof useTextTool>
