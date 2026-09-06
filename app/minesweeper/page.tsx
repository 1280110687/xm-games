import { MinesweeperGame } from "@/features/minesweeper/components/minesweeper-game"
import { getPageMetadata } from "@/lib/page-metadata"

export default function MinesweeperPage() {
  return <MinesweeperGame />
}

export const metadata = getPageMetadata("/minesweeper", "zh")
