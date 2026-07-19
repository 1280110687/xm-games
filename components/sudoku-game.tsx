"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale-context"
import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import {
  generateSudoku,
  type Difficulty,
  type SudokuBoard,
} from "@/features/sudoku/engine"
import { RotateCcw, Eraser, Lightbulb } from "lucide-react"

export function SudokuGame() {
  const { t, locale } = useLocale()
  const cellText = locale === "zh"
    ? { row: "行", column: "列", empty: "空白", given: "题目数字", entered: "填写数字", error: "错误" }
    : locale === "th"
      ? { row: "แถว", column: "คอลัมน์", empty: "ว่าง", given: "ตัวเลขโจทย์", entered: "ตัวเลขที่กรอก", error: "ผิด" }
      : { row: "row", column: "column", empty: "empty", given: "given", entered: "entered", error: "error" }
  const [difficulty, setDifficulty] = useState<Difficulty>("easy")
  const [solution, setSolution] = useState<SudokuBoard>([])
  const [board, setBoard] = useState<SudokuBoard>([])
  const [initialCells, setInitialCells] = useState<boolean[][]>([])
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null)
  const [errors, setErrors] = useState<boolean[][]>(Array(9).fill(null).map(() => Array(9).fill(false)))
  const [completed, setCompleted] = useState(false)
  const [hints, setHints] = useState(3)
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([])

  const initGame = useCallback(() => {
    const { puzzle: newPuzzle, solution: newSolution } = generateSudoku(difficulty)
    setSolution(newSolution)
    setBoard(newPuzzle.map(row => [...row]))
    setInitialCells(newPuzzle.map(row => row.map(cell => cell !== null)))
    const firstEditable = newPuzzle
      .flatMap((row, rowIndex) =>
        row.map((cell, colIndex) => cell === null ? [rowIndex, colIndex] as [number, number] : null),
      )
      .find((position): position is [number, number] => position !== null)
    setSelectedCell(firstEditable ?? null)
    setErrors(Array(9).fill(null).map(() => Array(9).fill(false)))
    setCompleted(false)
    setHints(3)
  }, [difficulty])

  useEffect(() => {
    initGame()
  }, [initGame])

  const handleCellClick = (row: number, col: number) => {
    if (completed) return
    setSelectedCell([row, col])
  }

  const handleNumberInput = useCallback((
    num: number | null,
    targetCell?: [number, number],
  ) => {
    const activeCell = targetCell ?? selectedCell
    if (!activeCell || completed) return
    const [row, col] = activeCell
    if (initialCells[row][col]) return

    const newBoard = board.map(r => [...r])
    newBoard[row][col] = num
    setBoard(newBoard)

    // Check for errors
    const newErrors = Array(9).fill(null).map(() => Array(9).fill(false))
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = newBoard[r][c]
        if (val !== null && val !== solution[r][c]) {
          newErrors[r][c] = true
        }
      }
    }
    setErrors(newErrors)

    // Check completion
    const isComplete = newBoard.every((row, r) => 
      row.every((cell, c) => cell === solution[r][c])
    )
    if (isComplete) {
      setCompleted(true)
    }
  }, [selectedCell, board, solution, initialCells, completed])

  const focusCell = useCallback((row: number, col: number) => {
    setSelectedCell([row, col])
    cellRefs.current[row * 9 + col]?.focus()
  }, [])

  const handleCellKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLButtonElement>,
    row: number,
    col: number,
  ) => {
    if (event.key >= "1" && event.key <= "9") {
      event.preventDefault()
      handleNumberInput(Number.parseInt(event.key, 10), [row, col])
      return
    }
    if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
      event.preventDefault()
      handleNumberInput(null, [row, col])
      return
    }

    const nextCells: Partial<Record<string, [number, number]>> = {
      ArrowUp: [Math.max(0, row - 1), col],
      ArrowDown: [Math.min(8, row + 1), col],
      ArrowLeft: [row, Math.max(0, col - 1)],
      ArrowRight: [row, Math.min(8, col + 1)],
    }
    const nextCell = nextCells[event.key]

    if (nextCell) {
      event.preventDefault()
      focusCell(nextCell[0], nextCell[1])
    }
  }, [focusCell, handleNumberInput])

  const useHint = () => {
    if (hints <= 0 || !selectedCell || completed) return
    const [row, col] = selectedCell
    if (initialCells[row][col]) return
    
    const newBoard = board.map(r => [...r])
    newBoard[row][col] = solution[row][col]
    setBoard(newBoard)
    setHints(h => h - 1)
    
    // Clear error for this cell
    const newErrors = errors.map(r => [...r])
    newErrors[row][col] = false
    setErrors(newErrors)

    // Check completion
    const isComplete = newBoard.every((row, r) => 
      row.every((cell, c) => cell === solution[r][c])
    )
    if (isComplete) setCompleted(true)
  }

  const getCellStyle = (row: number, col: number) => {
    const isSelected = selectedCell?.[0] === row && selectedCell?.[1] === col
    const isInitial = initialCells[row]?.[col]
    const hasError = errors[row]?.[col]
    const isSameRow = selectedCell?.[0] === row
    const isSameCol = selectedCell?.[1] === col
    const isSameBox = selectedCell && 
      Math.floor(selectedCell[0] / 3) === Math.floor(row / 3) &&
      Math.floor(selectedCell[1] / 3) === Math.floor(col / 3)
    
    let bg = "bg-white"
    if (isSelected) bg = "bg-blue-200"
    else if (isSameRow || isSameCol || isSameBox) bg = "bg-blue-50"
    if (hasError) bg = "bg-red-100"
    
    let text = "text-blue-600"
    if (isInitial) text = "text-slate-900"
    if (hasError) text = "text-red-600"
    
    return `${bg} ${text}`
  }

  const canEditSelected = Boolean(
    selectedCell
    && !completed
    && !initialCells[selectedCell[0]]?.[selectedCell[1]],
  )

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-4">
      <GameHeader
        homeLabel={t("appName")}
        homeButtonClassName="text-blue-200 hover:text-white"
      />

      <main className="flex flex-1 flex-col items-center gap-4 py-4">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{t("sudoku")}</h1>

        {/* Difficulty selector */}
        <div className="flex gap-2">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <Button
              key={d}
              variant={difficulty === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDifficulty(d)}
              aria-pressed={difficulty === d}
              className={difficulty === d 
                ? "bg-blue-600" 
                : "border-blue-600 bg-transparent text-blue-200 hover:bg-blue-700"
              }
            >
              {t(d === "easy" ? "easy" : d === "medium" ? "medium" : "hard")}
            </Button>
          ))}
        </div>

        {/* Game status */}
        {completed && (
          <div className="rounded-lg bg-green-500/20 px-4 py-2 text-lg font-bold text-green-300" role="status" aria-live="assertive">
            {t("youWin")}
          </div>
        )}

        {/* Game board */}
        <div className="rounded-lg border-2 border-blue-300 bg-white p-1">
          <div className="grid grid-cols-9" role="group" aria-label={t("sudoku")}>
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  ref={(element) => {
                    cellRefs.current[rowIndex * 9 + colIndex] = element
                  }}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  onFocus={() => setSelectedCell([rowIndex, colIndex])}
                  onKeyDown={(event) => handleCellKeyDown(event, rowIndex, colIndex)}
                  tabIndex={selectedCell?.[0] === rowIndex && selectedCell?.[1] === colIndex ? 0 : -1}
                  aria-pressed={selectedCell?.[0] === rowIndex && selectedCell?.[1] === colIndex}
                  aria-disabled={completed}
                  aria-label={`${cellText.row} ${rowIndex + 1}, ${cellText.column} ${colIndex + 1}, ${cell ?? cellText.empty}${cell !== null ? `, ${initialCells[rowIndex]?.[colIndex] ? cellText.given : cellText.entered}` : ""}${errors[rowIndex]?.[colIndex] ? `, ${cellText.error}` : ""}`}
                  className={`
                    flex h-9 w-9 items-center justify-center text-lg font-semibold transition-colors
                    sm:h-10 sm:w-10 sm:text-xl
                    ${getCellStyle(rowIndex, colIndex)}
                    ${colIndex % 3 === 2 && colIndex !== 8 ? "border-r-2 border-blue-400" : "border-r border-blue-200"}
                    ${rowIndex % 3 === 2 && rowIndex !== 8 ? "border-b-2 border-blue-400" : "border-b border-blue-200"}
                    ${initialCells[rowIndex]?.[colIndex] ? "cursor-default" : "cursor-pointer hover:bg-blue-100"}
                  `}
                >
                  {cell}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Number input buttons */}
        <div className="flex flex-wrap justify-center gap-2" role="toolbar" aria-label={t("sudoku")}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              onClick={() => handleNumberInput(num)}
              disabled={!canEditSelected}
              variant="outline"
              className="h-10 w-10 border-blue-500 bg-blue-700/50 text-lg font-bold text-white hover:bg-blue-600"
            >
              {num}
            </Button>
          ))}
          <Button
            onClick={() => handleNumberInput(null)}
            disabled={!canEditSelected}
            aria-label={cellText.empty}
            variant="outline"
            className="h-10 w-10 border-blue-500 bg-blue-700/50 text-white hover:bg-blue-600"
          >
            <Eraser className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            onClick={initGame}
            variant="outline"
            className="border-blue-500 bg-blue-700/50 text-blue-100 hover:bg-blue-600"
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("restart")}
          </Button>
          <Button
            onClick={useHint}
            variant="outline"
            disabled={hints <= 0 || !canEditSelected}
            className="border-blue-500 bg-blue-700/50 text-blue-100 hover:bg-blue-600 disabled:opacity-50"
          >
            <Lightbulb className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("hint")} ({hints})
          </Button>
          <GameRulesDialog
            triggerLabel={t("howToPlay")}
            closeLabel={t("close")}
            triggerClassName="border-blue-500 bg-blue-700/50 text-blue-100 hover:bg-blue-600"
            contentClassName="border-blue-500 bg-blue-800 p-4 text-white sm:p-6"
            titleClassName="text-lg font-bold text-white"
            closeButtonClassName="text-blue-200 hover:text-white"
          >
            <ul className="space-y-2 text-sm text-blue-100">
              <li>{t("sudokuRule1")}</li>
              <li>{t("sudokuRule2")}</li>
              <li>{t("sudokuRule3")}</li>
            </ul>
          </GameRulesDialog>
        </div>

        <p className="max-w-md text-center text-xs text-blue-200/70">
          {t("sudokuInstructions")}
        </p>

      </main>
    </div>
  )
}
