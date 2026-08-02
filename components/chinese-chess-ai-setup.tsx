"use client"

import { Bot, CircleDot, Gauge, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLocale } from "@/lib/locale-context"
import { cn } from "@/lib/utils"

export type ChineseChessMode = "local" | "ai"
export type AiDifficulty = "easy" | "medium" | "hard"

type PlayerColor = "red" | "black"

interface ChineseChessAiSetupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  playerColor: PlayerColor
  difficulty: AiDifficulty
  onPlayerColorChange: (color: PlayerColor) => void
  onDifficultyChange: (difficulty: AiDifficulty) => void
  onStart: () => void
  hasMoves: boolean
}

const sideOptions: Array<{ value: PlayerColor; labelKey: "chineseChessRedSide" | "chineseChessBlackSide" }> = [
  { value: "red", labelKey: "chineseChessRedSide" },
  { value: "black", labelKey: "chineseChessBlackSide" },
]

const difficultyOptions: Array<{
  value: AiDifficulty
  labelKey:
    | "chineseChessDifficultyEasy"
    | "chineseChessDifficultyMedium"
    | "chineseChessDifficultyHard"
}> = [
  { value: "easy", labelKey: "chineseChessDifficultyEasy" },
  { value: "medium", labelKey: "chineseChessDifficultyMedium" },
  { value: "hard", labelKey: "chineseChessDifficultyHard" },
]

export function ChineseChessAiSetup({
  open,
  onOpenChange,
  playerColor,
  difficulty,
  onPlayerColorChange,
  onDifficultyChange,
  onStart,
  hasMoves,
}: ChineseChessAiSetupProps) {
  const { t } = useLocale()

  const handleStart = () => {
    onStart()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t("close")}
        className="chinese-chess-ai-setup sm:max-w-md"
      >
        <DialogHeader className="pr-8 text-left">
          <div className="chinese-chess-ai-setup__icon" aria-hidden="true">
            <Bot />
          </div>
          <DialogTitle>{t("chineseChessAiSetupTitle")}</DialogTitle>
          <DialogDescription>
            {t("chineseChessAiSetupDescription")}
          </DialogDescription>
        </DialogHeader>

        {hasMoves && (
          <p className="chinese-chess-ai-setup__warning" role="note">
            <RefreshCcw aria-hidden="true" />
            {t("chineseChessChangeSettingsWarning")}
          </p>
        )}

        <fieldset className="chinese-chess-ai-setup__group">
          <legend>
            <CircleDot aria-hidden="true" />
            {t("chineseChessMySide")}
          </legend>
          <div
            className="chinese-chess-ai-setup__choices"
            role="group"
            aria-label={t("chineseChessMySide")}
          >
            {sideOptions.map((option) => {
              const selected = playerColor === option.value

              return (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  aria-pressed={selected}
                  data-selected={selected ? "true" : "false"}
                  className={cn(
                    "chinese-chess-ai-choice",
                    `chinese-chess-ai-choice--${option.value}`,
                  )}
                  onClick={() => onPlayerColorChange(option.value)}
                >
                  <span className="chinese-chess-ai-choice__piece" aria-hidden="true">
                    {option.value === "red" ? "帅" : "将"}
                  </span>
                  {t(option.labelKey)}
                </Button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="chinese-chess-ai-setup__group">
          <legend>
            <Gauge aria-hidden="true" />
            {t("chineseChessDifficulty")}
          </legend>
          <div
            className="chinese-chess-ai-setup__choices chinese-chess-ai-setup__choices--difficulty"
            role="group"
            aria-label={t("chineseChessDifficulty")}
          >
            {difficultyOptions.map((option) => {
              const selected = difficulty === option.value

              return (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  aria-pressed={selected}
                  data-selected={selected ? "true" : "false"}
                  className="chinese-chess-ai-choice"
                  onClick={() => onDifficultyChange(option.value)}
                >
                  {t(option.labelKey)}
                </Button>
              )
            })}
          </div>
        </fieldset>

        <DialogFooter className="chinese-chess-ai-setup__footer">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="button" size="lg" onClick={handleStart}>
            <Bot aria-hidden="true" />
            {hasMoves ? t("chineseChessApplyAndRestart") : t("chineseChessStartAiGame")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
