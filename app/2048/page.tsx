import { Game2048 } from "@/features/game-2048/components/game-2048"
import { getPageMetadata } from "@/lib/page-metadata"
import "../classic-games.css"
import "@/styles/themes/theme-one/classic-games.css"
import "@/styles/themes/theme-two/classic-games.css"
import "@/styles/themes/theme-three/classic-games.css"
import "@/styles/themes/theme-four/classic-games.css"

export default function Game2048Page() {
  return <Game2048 />
}

export const metadata = getPageMetadata("/2048", "zh")
