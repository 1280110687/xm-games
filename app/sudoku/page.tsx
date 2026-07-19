import { SudokuGame } from "@/components/sudoku-game"
import { getPageMetadata } from "@/lib/page-metadata"

export default function SudokuPage() {
  return <SudokuGame />
}

export const metadata = getPageMetadata("/sudoku", "zh")
