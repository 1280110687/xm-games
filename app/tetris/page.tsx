import { TetrisGame } from "@/features/tetris/components/tetris-game"
import { getPageMetadata } from "@/lib/page-metadata"
import "../classic-games.css"
import "@/styles/themes/theme-one/classic-games.css"
import "@/styles/themes/theme-two/classic-games.css"
import "@/styles/themes/theme-three/classic-games.css"
import "@/styles/themes/theme-four/classic-games.css"

export const metadata = getPageMetadata("/tetris", "zh")

export default function TetrisPage() {
  return <TetrisGame />
}
