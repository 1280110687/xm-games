import { TetrisGame } from "@/components/tetris-game"
import { getPageMetadata } from "@/lib/page-metadata"

export const metadata = getPageMetadata("/tetris", "zh")

export default function TetrisPage() {
  return <TetrisGame />
}
