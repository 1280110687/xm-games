import { TetrisGame } from "@/components/tetris-game"
import { getPageMetadata } from "@/lib/page-metadata"
import "../classic-games.css"
import "../theme-one-classic-games.css"
import "../theme-two-classic-games.css"
import "../theme-three-classic-games.css"
import "../theme-four-classic-games.css"

export const metadata = getPageMetadata("/tetris", "zh")

export default function TetrisPage() {
  return <TetrisGame />
}
