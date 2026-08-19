import { Game2048 } from "@/components/game-2048"
import { getPageMetadata } from "@/lib/page-metadata"
import "../classic-games.css"
import "../theme-one-classic-games.css"
import "../theme-two-classic-games.css"
import "../theme-three-classic-games.css"
import "../theme-four-classic-games.css"

export default function Game2048Page() {
  return <Game2048 />
}

export const metadata = getPageMetadata("/2048", "zh")
